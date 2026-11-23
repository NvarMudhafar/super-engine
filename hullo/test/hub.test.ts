import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ClientMsg, ServerMsg } from '../shared/protocol.ts';
import { CLOSE, Hub, type ReportEntry } from '../server/hub.ts';
import { OpenerGuard, TokenBucket, cleanText, containsLink } from '../server/moderation.ts';
import { parseClientMsg } from '../server/validate.ts';
import { identityFor } from '../server/config.ts';

function setup(opts: { banThreshold?: number; widenAfterMs?: number } = {}) {
  let now = 1_000_000;
  const reports: ReportEntry[] = [];
  const hub = new Hub({
    widenAfterMs: opts.widenAfterMs ?? 8000,
    banThreshold: opts.banThreshold ?? 3,
    banMs: 3600_000,
    maxConnectionsPerKey: 3,
    relayAvailable: false,
    iceServers: () => [{ urls: 'stun:example.test' }],
    onReport: (r) => reports.push(r),
    now: () => now,
  });

  let n = 0;
  function join(key = `ip-${++n}`) {
    const inbox: ServerMsg[] = [];
    const closed: Array<{ code: number; reason: string }> = [];
    const client = hub.connect(
      {
        send: (data) => inbox.push(JSON.parse(data)),
        close: (code, reason) => closed.push({ code, reason }),
      },
      key,
    );
    const send = (msg: ClientMsg | Record<string, unknown>) => client && hub.receive(client, JSON.stringify(msg));
    const last = <T extends ServerMsg['t']>(t: T) =>
      [...inbox].reverse().find((m): m is Extract<ServerMsg, { t: T }> => m.t === t);
    const clear = () => inbox.splice(0);
    return { client, inbox, closed, send, last, clear };
  }

  return { hub, join, reports, advance: (ms: number) => (now += ms) };
}

const find = (interests: string[] = [], mode: 'text' | 'video' = 'text') =>
  ({ t: 'find', mode, interests, fallback: true }) as const;

test('welcome carries ICE servers and the online count', () => {
  const { join } = setup();
  join();
  const b = join();
  const welcome = b.last('welcome');
  assert.equal(welcome?.online, 2);
  assert.deepEqual(welcome?.iceServers, [{ urls: 'stun:example.test' }]);
});

test('two people match, chat, and see each other type', () => {
  const { join } = setup();
  const a = join();
  const b = join();
  a.send(find(['Music']));
  assert.equal(a.last('queued')?.widened, false);
  b.send(find(['music', 'film']));

  assert.deepEqual(a.last('matched'), { t: 'matched', mode: 'text', common: ['music'], initiator: false });
  assert.deepEqual(b.last('matched'), { t: 'matched', mode: 'text', common: ['music'], initiator: true });

  b.send({ t: 'typing', on: true });
  assert.equal(a.last('typing')?.on, true);

  b.send({ t: 'chat', id: 'm1', text: '  hey there  ' });
  assert.equal(a.last('chat')?.text, 'hey there');
  assert.deepEqual(b.last('ack'), { t: 'ack', id: 'm1', ok: true });
});

test('skipping ends the chat for both and requeues the skipper', () => {
  const { join } = setup();
  const a = join();
  const b = join();
  a.send(find());
  b.send(find());
  b.send(find()); // "next"
  assert.equal(b.last('ended')?.reason, 'you-left');
  assert.equal(a.last('ended')?.reason, 'partner-left');
  assert.equal(b.last('queued')?.mode, 'text');
});

test('people who just parted are not rematched straight away', () => {
  const { hub, join, advance } = setup();
  const a = join();
  const b = join();
  a.send(find());
  b.send(find());
  a.clear();
  b.clear();
  b.send(find());
  a.send(find());
  assert.equal(a.last('matched'), undefined);
  advance(15_000);
  hub.tick();
  assert.ok(a.last('matched'));
});

test('a disconnect tells the partner', () => {
  const { hub, join } = setup();
  const a = join();
  const b = join();
  a.send(find());
  b.send(find());
  hub.disconnect(b.client!);
  assert.equal(a.last('ended')?.reason, 'partner-left');
  assert.equal(hub.stats().online, 1);
  assert.equal(hub.stats().chats, 0);
});

test('chat outside a room is refused; video signalling only flows in video rooms', () => {
  const { join } = setup();
  const a = join();
  const b = join();
  a.send({ t: 'chat', id: 'x', text: 'hello?' });
  assert.deepEqual(a.last('ack'), { t: 'ack', id: 'x', ok: false, reason: 'not-in-chat' });

  a.send(find());
  b.send(find());
  b.send({ t: 'signal', data: { kind: 'offer', sdp: 'v=0' } });
  assert.equal(a.last('signal'), undefined, 'text room: no signalling');
});

test('video signalling is relayed between partners', () => {
  const { join } = setup();
  const a = join();
  const b = join();
  a.send(find([], 'video'));
  b.send(find([], 'video'));
  b.send({ t: 'signal', data: { kind: 'offer', sdp: 'v=0' } });
  assert.deepEqual(a.last('signal')?.data, { kind: 'offer', sdp: 'v=0' });
  a.send({ t: 'signal', data: { kind: 'ice', candidate: { candidate: 'candidate:1', sdpMid: '0', sdpMLineIndex: 0 } } });
  assert.equal(b.last('signal')?.data.kind, 'ice');
  a.send({ t: 'media', state: { cam: false, mic: true } });
  assert.deepEqual(b.last('media')?.state, { cam: false, mic: true });
});

test('the widen notice arrives once the interest search gives up', () => {
  const { hub, join, advance } = setup({ widenAfterMs: 5000 });
  const a = join();
  a.send(find(['obscure']));
  advance(5000);
  hub.tick();
  assert.equal(a.last('queued')?.widened, true);
});

test('chat is rate limited', () => {
  const { join } = setup();
  const a = join();
  const b = join();
  a.send(find());
  b.send(find());
  for (let i = 0; i < 12; i++) a.send({ t: 'chat', id: `m${i}`, text: `message number ${i}` });
  const acks = a.inbox.filter((m) => m.t === 'ack');
  assert.ok(acks.some((m) => m.t === 'ack' && !m.ok && m.reason === 'slow-down'));
  assert.ok(b.inbox.filter((m) => m.t === 'chat').length <= 8);
});

test('reporting ends the chat, logs the transcript and blocks the pair', () => {
  const { hub, join, reports, advance } = setup();
  const a = join();
  const b = join();
  a.send(find());
  b.send(find());
  b.send({ t: 'chat', id: '1', text: 'something awful' });
  a.send({ t: 'report', reason: 'harassment', note: 'rude' });

  assert.equal(a.last('ended')?.reason, 'you-reported');
  assert.equal(b.last('ended')?.reason, 'partner-left', 'the reported person is not told');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].reason, 'harassment');
  assert.deepEqual(
    reports[0].lines.map((l) => [l.who, l.text]),
    [['reported', 'something awful']],
  );

  // Even after the cooldown, they are never paired again.
  advance(60_000);
  a.send(find());
  b.send(find());
  hub.tick();
  assert.equal(hub.stats().chats, 0);
});

test('a chat can be reported shortly after it ends, but only once', () => {
  const { join, reports, advance } = setup();
  const a = join();
  const b = join();
  a.send(find());
  b.send(find());
  b.send({ t: 'leave' });
  advance(30_000);
  a.send({ t: 'report', reason: 'nudity' });
  assert.equal(reports.length, 1);
  assert.match(a.last('notice')?.text ?? '', /report sent/);
  a.send({ t: 'report', reason: 'nudity' });
  assert.equal(reports.length, 1);
  assert.equal(a.last('error')?.code, 'nothing-to-report');
});

test('three distinct reporters ban someone; one angry person cannot', () => {
  const { hub, join, advance } = setup({ banThreshold: 3 });
  const villain = join('villain');

  const reportOnce = (reporterKey: string) => {
    const r = join(reporterKey);
    r.send(find());
    villain.send(find());
    r.send({ t: 'report', reason: 'harassment' });
    hub.disconnect(r.client!);
    advance(20_000);
  };

  reportOnce('alice');
  // Alice again from a new connection — same identity, still one reporter.
  reportOnce('alice');
  assert.equal(villain.closed.length, 0);
  reportOnce('bob');
  assert.equal(villain.closed.length, 0);
  reportOnce('carol');
  assert.deepEqual(villain.closed[0], { code: CLOSE.banned, reason: 'banned' });
  assert.ok(villain.last('banned'));

  // Reconnecting while banned is refused.
  const again = join('villain');
  assert.equal(again.client, null);
  assert.equal(again.last('banned')?.reason, 'Reported by several people');
});

test('reports from a shared IP never count towards a ban', () => {
  const { hub, join, reports } = setup({ banThreshold: 1 });
  const a = join('same');
  const b = join('same');
  a.send(find());
  b.send(find());
  a.send({ t: 'report', reason: 'spam' });
  assert.equal(reports[0].distinctReporters, 0);
  assert.equal(b.closed.length, 0);
  assert.equal(hub.stats().bans, 0);
});

test('blocking keeps two people apart', () => {
  const { hub, join, advance } = setup();
  const a = join();
  const b = join();
  a.send(find());
  b.send(find());
  a.send({ t: 'block' });
  assert.equal(a.last('ended')?.reason, 'you-blocked');
  advance(60_000);
  a.send(find());
  b.send(find());
  hub.tick();
  assert.equal(hub.stats().chats, 0);
});

test('copy-pasted link openers get the sender banned', () => {
  const { hub, join, advance } = setup();
  const bot = join('bot');
  for (let i = 0; i < 3; i++) {
    const victim = join();
    victim.send(find());
    bot.send(find());
    bot.send({ t: 'chat', id: `s${i}`, text: 'hot singles at spam-site.com' });
    hub.disconnect(victim.client!);
    advance(16_000);
  }
  assert.equal(bot.last('banned')?.reason, 'Sending the same link to lots of people');
});

test('connection limit per identity', () => {
  const { join } = setup();
  join('home');
  join('home');
  join('home');
  const fourth = join('home');
  assert.equal(fourth.client, null);
  assert.equal(fourth.closed[0].code, CLOSE.tooMany);
});

test('malformed frames are rejected and repeat offenders dropped', () => {
  const { hub, join } = setup();
  const a = join();
  hub.receive(a.client!, 'not json');
  assert.equal(a.last('error')?.code, 'bad-request');
  for (let i = 0; i < 40; i++) a.send({ t: 'nope' });
  assert.equal(a.closed[0]?.code, CLOSE.abuse);
});

test('validation drops unknown fields and bad shapes', () => {
  assert.equal(parseClientMsg('{"t":"find","mode":"audio","interests":[]}'), null);
  assert.equal(parseClientMsg('{"t":"report","reason":"because"}'), null);
  assert.equal(parseClientMsg('{"t":"signal","data":{"kind":"offer"}}'), null);
  assert.deepEqual(parseClientMsg('{"t":"leave","extra":1}'), { t: 'leave' });
  assert.deepEqual(parseClientMsg('{"t":"find","mode":"video","interests":["a",5]}'), {
    t: 'find',
    mode: 'video',
    interests: ['a'],
    fallback: true,
  });
});

test('moderation helpers', () => {
  const bucket = new TokenBucket(2, 1, 0);
  assert.equal(bucket.take(0), true);
  assert.equal(bucket.take(0), true);
  assert.equal(bucket.take(0), false);
  assert.equal(bucket.waitMs(0), 1000);
  assert.equal(bucket.take(1000), true);

  assert.equal(containsLink('see example.com/x'), true);
  assert.equal(containsLink('https://x.test'), true);
  assert.equal(containsLink('I like dot.com era history'), true);
  assert.equal(containsLink('no links here. honest'), false);

  assert.equal(cleanText('  hi\u0007 there‮  ', 100), 'hi there');
  assert.equal(cleanText('a\n\n\n\n\n\nb', 100), 'a\n\n\nb');

  const guard = new OpenerGuard({ windowMs: 60_000, spamAfter: 3, repeatAfter: 5 });
  for (let i = 0; i < 4; i++) assert.equal(guard.check('me', 'hey!', i), 'ok');
  assert.equal(guard.check('me', 'Hey! ', 5), 'repeat');
  assert.equal(guard.check('me', 'something else', 6), 'ok');
});

test('identities hash IPs and group IPv6 by /64', () => {
  const salt = 'salt';
  assert.equal(identityFor('::ffff:1.2.3.4', salt), identityFor('1.2.3.4', salt));
  assert.notEqual(identityFor('1.2.3.4', salt), identityFor('1.2.3.5', salt));
  assert.equal(identityFor('2001:db8:1:2::1', salt), identityFor('2001:db8:1:2:ffff::9', salt));
  assert.notEqual(identityFor('2001:db8:1:2::1', salt), identityFor('2001:db8:1:3::1', salt));
  assert.notEqual(identityFor('1.2.3.4', 'a'), identityFor('1.2.3.4', 'b'));
  assert.doesNotMatch(identityFor('1.2.3.4', salt), /1\.2\.3\.4/);
});
