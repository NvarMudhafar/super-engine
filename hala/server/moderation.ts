/**
 * Safety primitives. All in-memory and clock-injectable so they can be tested
 * without waiting; the hub wires them together.
 */

/** Classic token bucket: `capacity` burst, refilled at `perSecond`. */
export class TokenBucket {
  private tokens: number;
  private last: number;
  private readonly capacity: number;
  private readonly perSecond: number;

  constructor(capacity: number, perSecond: number, now: number) {
    this.capacity = capacity;
    this.perSecond = perSecond;
    this.tokens = capacity;
    this.last = now;
  }

  take(now: number, cost = 1): boolean {
    this.refill(now);
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  /** Milliseconds until `cost` tokens are available. */
  waitMs(now: number, cost = 1): number {
    this.refill(now);
    return this.tokens >= cost ? 0 : Math.ceil(((cost - this.tokens) / this.perSecond) * 1000);
  }

  private refill(now: number) {
    const elapsed = Math.max(0, now - this.last) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.perSecond);
    this.last = now;
  }
}

/** Keys that expire. Used for bans, blocks and rematch cooldowns. */
export class ExpiringSet {
  private readonly items = new Map<string, number>();

  add(key: string, until: number) {
    this.items.set(key, Math.max(until, this.items.get(key) ?? 0));
  }

  has(key: string, now: number): boolean {
    return this.until(key, now) !== null;
  }

  until(key: string, now: number): number | null {
    const until = this.items.get(key);
    if (until === undefined) return null;
    if (until <= now) {
      this.items.delete(key);
      return null;
    }
    return until;
  }

  sweep(now: number) {
    for (const [key, until] of this.items) if (until <= now) this.items.delete(key);
  }

  get size() {
    return this.items.size;
  }
}

/** Order-independent key for a pair of identities. */
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Counts reports per reported identity. Only *distinct* reporters inside the
 * window count, so one person hammering the report button can't get someone
 * banned on their own.
 */
export class ReportBook {
  private readonly byReported = new Map<string, Map<string, number>>();
  private readonly windowMs: number;
  readonly threshold: number;

  constructor(threshold: number, windowMs: number) {
    this.threshold = threshold;
    this.windowMs = windowMs;
  }

  /** Record a report; returns how many distinct people have reported `reported` recently. */
  add(reporter: string, reported: string, now: number): number {
    let reporters = this.byReported.get(reported);
    if (!reporters) this.byReported.set(reported, (reporters = new Map()));
    reporters.set(reporter, now);
    for (const [who, at] of reporters) if (now - at > this.windowMs) reporters.delete(who);
    return reporters.size;
  }

  sweep(now: number) {
    for (const [reported, reporters] of this.byReported) {
      for (const [who, at] of reporters) if (now - at > this.windowMs) reporters.delete(who);
      if (reporters.size === 0) this.byReported.delete(reported);
    }
  }
}

const LINK =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9][a-z0-9-]*\.(?:com|net|org|io|me|ly|gg|co|xyz|app|link|site|club|live|tv|to|ru|cc|biz|info|online|store|shop)\b(?:\/\S*)?/i;

export const containsLink = (text: string) => LINK.test(text);

const canon = (text: string) => text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

export type OpenerVerdict = 'ok' | 'repeat' | 'spam';

/**
 * Spots copy-paste openers — the signature of bots and advertisers. Each
 * identity's first message in each chat is remembered for `windowMs`:
 *  - the same link-bearing opener `spamAfter` times in a row is spam (ban);
 *  - the same plain opener `repeatAfter` times is merely rejected with a
 *    nudge, since people do sometimes reuse an intro.
 */
export class OpenerGuard {
  private readonly history = new Map<string, Array<{ text: string; at: number }>>();
  private readonly windowMs: number;
  private readonly spamAfter: number;
  private readonly repeatAfter: number;

  constructor(opts: { windowMs: number; spamAfter: number; repeatAfter: number }) {
    this.windowMs = opts.windowMs;
    this.spamAfter = opts.spamAfter;
    this.repeatAfter = opts.repeatAfter;
  }

  check(identity: string, opener: string, now: number): OpenerVerdict {
    const text = canon(opener);
    const recent = (this.history.get(identity) ?? []).filter((h) => now - h.at <= this.windowMs);
    recent.push({ text, at: now });
    this.history.set(identity, recent.slice(-Math.max(this.spamAfter, this.repeatAfter)));

    let streak = 0;
    for (let i = recent.length - 1; i >= 0 && recent[i].text === text; i--) streak++;

    if (containsLink(text) && streak >= this.spamAfter) return 'spam';
    if (text.length >= 2 && streak >= this.repeatAfter) return 'repeat';
    return 'ok';
  }

  sweep(now: number) {
    for (const [identity, list] of this.history) {
      const recent = list.filter((h) => now - h.at <= this.windowMs);
      if (recent.length) this.history.set(identity, recent);
      else this.history.delete(identity);
    }
  }
}

/** Strip control characters (keeping newlines and tabs) and trim. */
export function cleanText(text: string, max: number): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}
