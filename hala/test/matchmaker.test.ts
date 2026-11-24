import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Matchmaker, type Seeker } from '../server/matchmaker.ts';
import { commonInterests, interestKey, isPlace, normalizeInterest, normalizeInterests } from '../shared/interests.ts';

function setup(opts: { widenAfterMs?: number; canPair?: (a: Seeker, b: Seeker) => boolean } = {}) {
  let now = 1_000_000;
  const mm = new Matchmaker({
    widenAfterMs: opts.widenAfterMs ?? 8000,
    canPair: opts.canPair ?? (() => true),
    now: () => now,
  });
  const seeker = (id: string, interests: string[] = [], extra: Partial<Seeker> = {}): Seeker => ({
    id,
    mode: 'text',
    interests,
    keys: interests.map(interestKey),
    fallback: true,
    since: now,
    ...extra,
  });
  return { mm, seeker, advance: (ms: number) => (now += ms) };
}

test('interests normalise to one canonical tag', () => {
  assert.equal(normalizeInterest('  #Music  '), 'music');
  assert.equal(normalizeInterest('Rock   & Roll!!'), 'rock & roll');
  assert.equal(normalizeInterest('Ｍｕｓｉｃ'), 'music'); // full-width
  assert.equal(normalizeInterest('café'), 'café');
  assert.equal(normalizeInterest('🎸'), '');
  assert.deepEqual(normalizeInterests(['Chess', 'chess', '', '#CHESS', 'go', 7]), ['chess', 'go']);
  assert.equal(normalizeInterests(Array.from({ length: 30 }, (_, i) => `t${i}`)).length, 10);
  assert.deepEqual(commonInterests(['a', 'b', 'c'], ['c', 'a']), ['a', 'c']);
});

test('Arabic spelling variants, slang and English all share one key', () => {
  const same = (...tags: string[]) => {
    const keys = new Set(tags.map(interestKey));
    assert.equal(keys.size, 1, `${tags.join(' / ')} → ${[...keys].join(', ')}`);
  };
  same('كرة القدم', 'كره قدم', 'طوبة', 'Football', '#soccer');
  same('البصرة', 'بصره', 'Basra', 'basrah');
  same('أربيل', 'اربيل', 'هولير', 'Erbil');
  same('الشِعر', 'شعر', 'poetry'); // harakat and the article fall away
  same('ببجي', 'پبجي', 'PUBG');
  same('کتب', 'كتب', 'books'); // Persian-keyboard kaf
  same('٢٠٢٦', '2026');
  assert.notEqual(interestKey('شعر'), interestKey('شعر شعبي'));
  assert.equal(isPlace('الموصل'), true);
  assert.equal(isPlace('music'), false);
  assert.equal(normalizeInterest('  كرة   القدم '), 'كرة القدم', 'display keeps the original spelling');
  assert.deepEqual(normalizeInterests(['football', 'كرة القدم', 'chess']), ['football', 'chess'], 'deduped by meaning');
});

test('two people with no interests match immediately', () => {
  const { mm, seeker } = setup();
  assert.equal(mm.add(seeker('a')), null);
  const match = mm.add(seeker('b'));
  assert.ok(match);
  assert.equal(match.a.id, 'b');
  assert.equal(match.b.id, 'a');
  assert.deepEqual(match.common, []);
  assert.equal(mm.size, 0);
});

test('text and video are separate pools', () => {
  const { mm, seeker } = setup();
  mm.add(seeker('a', [], { mode: 'video' }));
  assert.equal(mm.add(seeker('b', [], { mode: 'text' })), null);
  assert.equal(mm.size, 2);
});

test('shared interests beat waiting longest', () => {
  const { mm, seeker, advance } = setup();
  mm.add(seeker('random-early'));
  advance(100);
  mm.add(seeker('chess-fan', ['chess'], { fallback: false }));
  advance(100);
  const match = mm.add(seeker('me', ['music', 'chess']));
  assert.equal(match?.b.id, 'chess-fan');
  assert.deepEqual(match?.common, ['chess']);
});

test('more shared interests win, then longest wait', () => {
  const { mm, seeker, advance } = setup();
  mm.add(seeker('one', ['x'], { fallback: false }));
  advance(10);
  mm.add(seeker('two', ['a', 'b'], { fallback: false }));
  advance(10);
  mm.add(seeker('two-later', ['c', 'd'], { fallback: false }));
  assert.equal(mm.size, 3);
  const match = mm.add(seeker('me', ['x', 'a', 'b', 'c', 'd']));
  assert.equal(match?.b.id, 'two');
  assert.deepEqual(match?.common, ['a', 'b']);
});

test('people with interests wait for overlap, then widen if they opted in', () => {
  const { mm, seeker, advance } = setup({ widenAfterMs: 8000 });
  mm.add(seeker('me', ['knitting']));
  assert.equal(mm.add(seeker('other')), null, 'not open yet');
  advance(7999);
  assert.deepEqual(mm.tick(), []);
  advance(1);
  const [match] = mm.tick();
  assert.ok(match);
  assert.deepEqual(new Set([match.a.id, match.b.id]), new Set(['me', 'other']));
});

test('without fallback, interest searchers never get a random match', () => {
  const { mm, seeker, advance } = setup();
  mm.add(seeker('strict', ['knitting'], { fallback: false }));
  mm.add(seeker('other'));
  advance(60_000);
  assert.deepEqual(mm.tick(), []);
  const match = mm.add(seeker('knitter', ['Knitting'.toLowerCase()]));
  assert.equal(match?.b.id, 'strict');
});

test('two widened searchers with different interests match each other', () => {
  const { mm, seeker, advance } = setup({ widenAfterMs: 1000 });
  mm.add(seeker('a', ['x']));
  mm.add(seeker('b', ['y']));
  advance(1000);
  assert.equal(mm.tick().length, 1);
  assert.equal(mm.size, 0);
});

test('canPair vetoes are respected and re-checked on tick', () => {
  let allowed = false;
  const { mm, seeker } = setup({ canPair: () => allowed });
  mm.add(seeker('a'));
  assert.equal(mm.add(seeker('b')), null);
  assert.deepEqual(mm.tick(), []);
  allowed = true;
  assert.equal(mm.tick().length, 1);
});

test('tick keeps arrival order, so the longest-waiting match first', () => {
  let allowed = false;
  const { mm, seeker, advance } = setup({ canPair: () => allowed });
  mm.add(seeker('first'));
  advance(10);
  mm.add(seeker('second'));
  advance(10);
  mm.add(seeker('third'));
  mm.tick();
  allowed = true;
  const [match] = mm.tick();
  assert.equal(match.a.id, 'first');
  assert.equal(match.b.id, 'second');
  assert.equal(mm.has('third'), true);
});

test('re-adding someone replaces their old entry', () => {
  const { mm, seeker } = setup();
  mm.add(seeker('a', ['x'], { fallback: false }));
  mm.add(seeker('a', ['y'], { fallback: false }));
  assert.equal(mm.size, 1);
  assert.equal(mm.add(seeker('b', ['x'], { fallback: false })), null);
  assert.equal(mm.add(seeker('c', ['y']))?.b.id, 'a');
});
