import { randomBytes } from 'node:crypto';
import { LIMITS, type BanReason, type IceServer, type Mode, type ReportReason, type ServerMsg } from '../shared/protocol.ts';
import { interestKey, normalizeInterests } from '../shared/interests.ts';
import { Matchmaker, type Match, type Seeker } from './matchmaker.ts';
import { ExpiringSet, OpenerGuard, ReportBook, TokenBucket, cleanText, pairKey } from './moderation.ts';
import { parseClientMsg } from './validate.ts';

/** Anything that can carry frames to one browser — a WebSocket, or a fake in tests. */
export interface Transport {
  send(data: string): void;
  close(code: number, reason: string): void;
}

/** WebSocket close codes the client understands. */
export const CLOSE = { banned: 4003, tooMany: 4029, abuse: 1008, shutdown: 1001 } as const;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** Don't rematch two people who just parted, for this long. */
const REMATCH_COOLDOWN_MS = 15_000;
/** Blocks and reports keep a pair apart for this long. */
const BLOCK_MS = 24 * HOUR;
/** A chat can still be reported this long after it ends. */
const REPORT_GRACE_MS = 3 * MINUTE;
/** Lines of each chat kept in memory, attached to a report if one is filed. */
const TRANSCRIPT_LINES = 50;
const MAX_STRIKES = 30;

interface Line {
  from: string;
  text: string;
  at: number;
}

interface Room {
  id: string;
  mode: Mode;
  a: Client;
  b: Client;
  common: string[];
  startedAt: number;
  lines: Line[];
  /** Clients who have sent their first message (their "opener"). */
  opened: Set<string>;
}

/** What a client remembers about the chat that just ended, so it can still be reported. */
interface Past {
  roomId: string;
  mode: Mode;
  partnerId: string;
  partnerKey: string;
  startedAt: number;
  endedAt: number;
  lines: Line[];
  reported: boolean;
}

export class Client {
  readonly id: string;
  /** Salted hash of the IP — the unit of bans, blocks and connection limits. */
  readonly key: string;
  readonly transport: Transport;
  room: Room | null = null;
  past: Past | null = null;
  seeker: Seeker | null = null;
  widenNotified = false;
  closed = false;
  strikes = 0;
  readonly buckets;

  constructor(id: string, key: string, transport: Transport, now: number) {
    this.id = id;
    this.key = key;
    this.transport = transport;
    this.buckets = {
      chat: new TokenBucket(8, 2, now),
      find: new TokenBucket(10, 0.5, now),
      typing: new TokenBucket(20, 4, now),
      signal: new TokenBucket(300, 30, now),
      report: new TokenBucket(5, 1 / 60, now),
    };
  }
}

export interface ReportEntry {
  at: string;
  reason: ReportReason;
  note?: string;
  mode: Mode;
  roomId: string;
  reporter: string;
  reported: string;
  chatSeconds: number;
  /** Distinct people who have reported this identity inside the window. */
  distinctReporters: number;
  autoBanned: boolean;
  lines: Array<{ who: 'reporter' | 'reported'; text: string; at: string }>;
}

export interface HubOptions {
  widenAfterMs: number;
  banThreshold: number;
  banMs: number;
  maxConnectionsPerKey: number;
  relayAvailable: boolean;
  iceServers: (clientId: string) => IceServer[];
  onReport?: (entry: ReportEntry) => void;
  now?: () => number;
}

const newId = () => randomBytes(9).toString('base64url');

/**
 * Owns every connection: the queue, the rooms, message relay and the safety
 * rules. It never touches a socket directly — only `Transport`s — which keeps
 * it fully testable.
 */
export class Hub {
  readonly clients = new Map<string, Client>();
  private readonly byKey = new Map<string, Set<Client>>();
  private readonly rooms = new Map<string, Room>();
  private readonly matchmaker: Matchmaker;
  private readonly bans = new ExpiringSet();
  private readonly banReasons = new Map<string, BanReason>();
  private readonly blocks = new ExpiringSet();
  private readonly cooldowns = new ExpiringSet();
  private readonly reports: ReportBook;
  private readonly openers = new OpenerGuard({ windowMs: 10 * MINUTE, spamAfter: 3, repeatAfter: 5 });
  private readonly opts: HubOptions;
  private readonly now: () => number;
  private ticks = 0;
  private lastOnline = -1;

  constructor(opts: HubOptions) {
    this.opts = opts;
    this.now = opts.now ?? Date.now;
    this.reports = new ReportBook(opts.banThreshold, HOUR);
    this.matchmaker = new Matchmaker({
      widenAfterMs: opts.widenAfterMs,
      now: this.now,
      canPair: (a, b, now) => {
        const ca = this.clients.get(a.id);
        const cb = this.clients.get(b.id);
        if (!ca || !cb) return false;
        return !this.cooldowns.has(pairKey(a.id, b.id), now) && !this.isBlocked(ca, cb, now);
      },
    });
  }

  // ─── lifecycle ─────────────────────────────────────────────────────────────

  /** Register a new connection. Returns null (and closes it) if refused. */
  connect(transport: Transport, key: string): Client | null {
    const now = this.now();
    const bannedUntil = this.bans.until(key, now);
    if (bannedUntil !== null) {
      transport.send(
        JSON.stringify({ t: 'banned', until: bannedUntil, reason: this.banReasons.get(key) ?? 'reports' } satisfies ServerMsg),
      );
      transport.close(CLOSE.banned, 'banned');
      return null;
    }
    const siblings = this.byKey.get(key);
    if (siblings && siblings.size >= this.opts.maxConnectionsPerKey) {
      transport.close(CLOSE.tooMany, 'too many connections');
      return null;
    }

    const client = new Client(newId(), key, transport, now);
    this.clients.set(client.id, client);
    if (siblings) siblings.add(client);
    else this.byKey.set(key, new Set([client]));

    this.send(client, {
      t: 'welcome',
      online: this.clients.size,
      iceServers: this.opts.iceServers(client.id),
      relayAvailable: this.opts.relayAvailable,
      widenAfterMs: this.opts.widenAfterMs,
    });
    return client;
  }

  disconnect(client: Client) {
    if (client.closed) return;
    client.closed = true;
    this.matchmaker.remove(client.id);
    if (client.room) this.endRoom(client.room, client, 'gone');
    this.clients.delete(client.id);
    const siblings = this.byKey.get(client.key);
    siblings?.delete(client);
    if (siblings?.size === 0) this.byKey.delete(client.key);
  }

  /** Call once a second: runs time-based matching and housekeeping. */
  tick() {
    const now = this.now();
    for (const match of this.matchmaker.tick()) this.startRoom(match);

    for (const client of this.clients.values()) {
      const s = client.seeker;
      if (!s || client.widenNotified || s.interests.length === 0 || !s.fallback) continue;
      if (this.matchmaker.has(s.id) && this.matchmaker.isOpen(s, now)) {
        client.widenNotified = true;
        this.send(client, { t: 'queued', mode: s.mode, widened: true });
      }
    }

    this.ticks++;
    if (this.ticks % 5 === 0 && this.clients.size !== this.lastOnline) {
      this.lastOnline = this.clients.size;
      const frame = JSON.stringify({ t: 'online', count: this.clients.size } satisfies ServerMsg);
      for (const c of this.clients.values()) c.transport.send(frame);
    }
    if (this.ticks % 60 === 0) this.sweep(now);
  }

  stats() {
    let video = 0;
    for (const room of this.rooms.values()) if (room.mode === 'video') video++;
    return {
      online: this.clients.size,
      waiting: this.matchmaker.size,
      chats: this.rooms.size,
      videoChats: video,
      bans: this.bans.size,
    };
  }

  /** Tell everyone we're going away, then close them. */
  shutdown() {
    for (const client of [...this.clients.values()]) {
      this.send(client, { t: 'notice', code: 'restarting' });
      client.transport.close(CLOSE.shutdown, 'server restarting');
      this.disconnect(client);
    }
  }

  // ─── inbound ───────────────────────────────────────────────────────────────

  receive(client: Client, raw: string) {
    if (client.closed) return;
    const msg = parseClientMsg(raw);
    if (!msg) return this.strike(client);
    const now = this.now();

    switch (msg.t) {
      case 'find': {
        const bucket = client.buckets.find;
        if (!bucket.take(now)) {
          return this.send(client, { t: 'error', code: 'skipping-fast', retryInMs: bucket.waitMs(now) });
        }
        if (client.room) this.endRoom(client.room, client, 'left');
        this.matchmaker.remove(client.id);
        const interests = normalizeInterests(msg.interests);
        const seeker: Seeker = {
          id: client.id,
          mode: msg.mode,
          interests,
          keys: interests.map(interestKey),
          fallback: msg.fallback,
          since: now,
        };
        client.seeker = seeker;
        client.widenNotified = false;
        const match = this.matchmaker.add(seeker);
        if (match) this.startRoom(match);
        else this.send(client, { t: 'queued', mode: seeker.mode, widened: false });
        return;
      }

      case 'cancel':
        this.matchmaker.remove(client.id);
        client.seeker = null;
        return;

      case 'leave':
        this.matchmaker.remove(client.id);
        client.seeker = null;
        if (client.room) this.endRoom(client.room, client, 'left');
        return;

      case 'chat': {
        const room = client.room;
        if (!room) return this.send(client, { t: 'ack', id: msg.id, ok: false, reason: 'not-in-chat' });
        const text = cleanText(msg.text, LIMITS.message);
        if (!text) return this.send(client, { t: 'ack', id: msg.id, ok: false, reason: 'empty' });
        if (!client.buckets.chat.take(now)) {
          client.strikes++;
          return this.send(client, { t: 'ack', id: msg.id, ok: false, reason: 'slow-down' });
        }
        if (!room.opened.has(client.id)) {
          room.opened.add(client.id);
          const verdict = this.openers.check(client.key, text, now);
          if (verdict === 'spam') return this.ban(client.key, 'spam', HOUR);
          if (verdict === 'repeat') {
            room.opened.delete(client.id);
            return this.send(client, { t: 'ack', id: msg.id, ok: false, reason: 'repeat-opener' });
          }
        }
        room.lines.push({ from: client.id, text, at: now });
        if (room.lines.length > TRANSCRIPT_LINES) room.lines.shift();
        this.send(this.partnerOf(room, client), { t: 'chat', text, ts: now });
        return this.send(client, { t: 'ack', id: msg.id, ok: true });
      }

      case 'typing':
        if (client.room && client.buckets.typing.take(now)) {
          this.send(this.partnerOf(client.room, client), { t: 'typing', on: msg.on });
        }
        return;

      case 'media':
        if (client.room && client.buckets.typing.take(now)) {
          this.send(this.partnerOf(client.room, client), { t: 'media', state: msg.state });
        }
        return;

      case 'signal':
        if (client.room?.mode === 'video' && client.buckets.signal.take(now)) {
          this.send(this.partnerOf(client.room, client), { t: 'signal', data: msg.data });
        }
        return;

      case 'report':
        return this.report(client, msg.reason, msg.note, now);

      case 'block':
        return this.block(client, now);
    }
  }

  // ─── rooms ─────────────────────────────────────────────────────────────────

  private startRoom(match: Match) {
    const a = this.clients.get(match.a.id);
    const b = this.clients.get(match.b.id);
    if (!a || !b) return; // can't happen: disconnect removes people from the queue
    const room: Room = {
      id: newId(),
      mode: match.a.mode,
      a,
      b,
      common: match.common,
      startedAt: this.now(),
      lines: [],
      opened: new Set(),
    };
    this.rooms.set(room.id, room);
    for (const c of [a, b]) {
      c.room = room;
      c.past = null;
      c.seeker = null;
    }
    // `a` is whoever was searching when the match happened; they make the WebRTC offer.
    this.send(a, { t: 'matched', mode: room.mode, common: room.common, initiator: true });
    this.send(b, { t: 'matched', mode: room.mode, common: room.common, initiator: false });
  }

  /**
   * Close a room. `by` is the person who caused it; `how` decides what each
   * side is told. The other side always just hears that the stranger left.
   */
  private endRoom(room: Room, by: Client, how: 'left' | 'reported' | 'blocked' | 'gone') {
    if (!this.rooms.delete(room.id)) return;
    const now = this.now();
    const other = this.partnerOf(room, by);
    for (const [me, them] of [
      [room.a, room.b],
      [room.b, room.a],
    ] as const) {
      me.room = null;
      me.past = {
        roomId: room.id,
        mode: room.mode,
        partnerId: them.id,
        partnerKey: them.key,
        startedAt: room.startedAt,
        endedAt: now,
        lines: room.lines,
        reported: false,
      };
    }
    this.cooldowns.add(pairKey(room.a.id, room.b.id), now + REMATCH_COOLDOWN_MS);

    if (how === 'left') this.send(by, { t: 'ended', reason: 'you-left' });
    if (how === 'reported') this.send(by, { t: 'ended', reason: 'you-reported' });
    if (how === 'blocked') this.send(by, { t: 'ended', reason: 'you-blocked' });
    this.send(other, { t: 'ended', reason: 'partner-left' });
  }

  private partnerOf(room: Room, client: Client): Client {
    return room.a === client ? room.b : room.a;
  }

  // ─── safety ────────────────────────────────────────────────────────────────

  /**
   * Blocks are by identity, so they survive the other person reconnecting.
   * People sharing one IP (two tabs, one household) are blocked by
   * connection instead, so they can't lock themselves out of each other.
   */
  private blockPair(me: { id: string; key: string }, them: { id: string; key: string }, now: number) {
    const key = me.key === them.key ? pairKey(`id:${me.id}`, `id:${them.id}`) : pairKey(me.key, them.key);
    this.blocks.add(key, now + BLOCK_MS);
  }

  private isBlocked(a: Client, b: Client, now: number) {
    return this.blocks.has(pairKey(a.key, b.key), now) || this.blocks.has(pairKey(`id:${a.id}`, `id:${b.id}`), now);
  }

  /** The chat a report or block applies to: the live one, else the one that just ended. */
  private target(client: Client, now: number): Past | null {
    if (client.room) {
      const room = client.room;
      const them = this.partnerOf(room, client);
      return {
        roomId: room.id,
        mode: room.mode,
        partnerId: them.id,
        partnerKey: them.key,
        startedAt: room.startedAt,
        endedAt: now,
        lines: room.lines,
        reported: false,
      };
    }
    const past = client.past;
    return past && now - past.endedAt <= REPORT_GRACE_MS ? past : null;
  }

  private report(client: Client, reason: ReportReason, note: string | undefined, now: number) {
    if (!client.buckets.report.take(now)) {
      return this.send(client, { t: 'error', code: 'reporting-fast' });
    }
    const target = this.target(client, now);
    if (!target || target.reported) {
      return this.send(client, { t: 'error', code: 'nothing-to-report' });
    }

    const partner = { id: target.partnerId, key: target.partnerKey };
    this.blockPair(client, partner, now);
    // Someone sharing your IP can't count towards banning it.
    const distinct = client.key === partner.key ? 0 : this.reports.add(client.key, partner.key, now);
    const autoBanned = distinct >= this.reports.threshold;

    this.opts.onReport?.({
      at: new Date(now).toISOString(),
      reason,
      note: note ? cleanText(note, LIMITS.reportNote) : undefined,
      mode: target.mode,
      roomId: target.roomId,
      reporter: client.key,
      reported: partner.key,
      chatSeconds: Math.round((target.endedAt - target.startedAt) / 1000),
      distinctReporters: distinct,
      autoBanned,
      lines: target.lines.map((l) => ({
        who: l.from === client.id ? 'reporter' : 'reported',
        text: l.text,
        at: new Date(l.at).toISOString(),
      })),
    });

    if (client.room) {
      this.endRoom(client.room, client, 'reported');
    } else {
      this.send(client, { t: 'notice', code: 'report-sent' });
    }
    if (client.past) client.past.reported = true;
    if (autoBanned) this.ban(partner.key, 'reports', this.opts.banMs);
  }

  private block(client: Client, now: number) {
    const target = this.target(client, now);
    if (!target) return this.send(client, { t: 'error', code: 'not-in-chat' });
    this.blockPair(client, { id: target.partnerId, key: target.partnerKey }, now);
    if (client.room) this.endRoom(client.room, client, 'blocked');
    else this.send(client, { t: 'notice', code: 'blocked' });
  }

  private ban(key: string, reason: BanReason, ms: number) {
    const until = this.now() + ms;
    this.bans.add(key, until);
    this.banReasons.set(key, reason);
    for (const client of [...(this.byKey.get(key) ?? [])]) {
      this.send(client, { t: 'banned', until, reason });
      client.transport.close(CLOSE.banned, 'banned');
      this.disconnect(client);
    }
  }

  private strike(client: Client) {
    client.strikes++;
    if (client.strikes > MAX_STRIKES) {
      client.transport.close(CLOSE.abuse, 'too many bad messages');
      this.disconnect(client);
      return;
    }
    this.send(client, { t: 'error', code: 'bad-request' });
  }

  private sweep(now: number) {
    this.bans.sweep(now);
    for (const key of this.banReasons.keys()) if (!this.bans.has(key, now)) this.banReasons.delete(key);
    this.blocks.sweep(now);
    this.cooldowns.sweep(now);
    this.reports.sweep(now);
    this.openers.sweep(now);
    for (const c of this.clients.values()) {
      if (c.past && now - c.past.endedAt > REPORT_GRACE_MS) c.past = null;
      // Forgive old strikes slowly, so a long session isn't one strike from a kick.
      c.strikes = Math.max(0, c.strikes - 5);
    }
  }

  private send(client: Client, msg: ServerMsg) {
    if (!client.closed) client.transport.send(JSON.stringify(msg));
  }
}
