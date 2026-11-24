import type { Mode } from '../shared/protocol.ts';
import { commonInterests } from '../shared/interests.ts';

export interface Seeker {
  id: string;
  mode: Mode;
  /** Normalised interests as typed; empty means "anyone". */
  interests: string[];
  /** `interestKey` of each interest — what matching compares. */
  keys: string[];
  /** Widen to anyone after `widenAfterMs` if nobody shares an interest. */
  fallback: boolean;
  since: number;
}

export interface Match {
  a: Seeker;
  b: Seeker;
  common: string[];
}

export interface MatchmakerOptions {
  widenAfterMs: number;
  /** Hard veto on a pairing — blocks, recent-partner cooldowns. */
  canPair: (a: Seeker, b: Seeker, now: number) => boolean;
  now?: () => number;
}

/**
 * The waiting room. Pure and synchronous, so it can be tested with a fake
 * clock; the hub decides what to do with the matches it hands back.
 *
 * The rules:
 *  - Text and video are separate pools.
 *  - A shared interest always beats a random match; more shared beats fewer;
 *    ties go to whoever has waited longest.
 *  - Two people with no interest in common match only if both are "open":
 *    they listed no interests, or they opted into fallback and have waited
 *    `widenAfterMs`.
 */
export class Matchmaker {
  private readonly waiting = new Map<string, Seeker>();
  private readonly opts: MatchmakerOptions;
  private readonly now: () => number;

  constructor(opts: MatchmakerOptions) {
    this.opts = opts;
    this.now = opts.now ?? Date.now;
  }

  get size(): number {
    return this.waiting.size;
  }

  has(id: string): boolean {
    return this.waiting.has(id);
  }

  /** Add someone to the queue, matching them straight away if possible. */
  add(seeker: Seeker): Match | null {
    this.waiting.delete(seeker.id);
    const match = this.findPartner(seeker, this.now());
    if (match) {
      this.waiting.delete(match.b.id);
      return match;
    }
    this.waiting.set(seeker.id, seeker);
    return null;
  }

  remove(id: string): boolean {
    return this.waiting.delete(id);
  }

  isOpen(seeker: Seeker, now = this.now()): boolean {
    return seeker.interests.length === 0 || (seeker.fallback && now - seeker.since >= this.opts.widenAfterMs);
  }

  /**
   * Re-run matching for everyone still waiting. Needed because time changes
   * the answer: people widen to random, and cooldowns expire.
   */
  tick(): Match[] {
    const now = this.now();
    const matches: Match[] = [];
    // Map iteration is insertion order, so the longest-waiting go first.
    for (const seeker of [...this.waiting.values()]) {
      if (!this.waiting.has(seeker.id)) continue; // matched earlier this tick
      this.waiting.delete(seeker.id);
      const match = this.findPartner(seeker, now);
      if (match) {
        this.waiting.delete(match.b.id);
        matches.push(match);
      } else {
        this.waiting.set(seeker.id, seeker); // re-inserting moves them to the back…
      }
    }
    // …so restore arrival order for the next tick.
    const ordered = [...this.waiting.values()].sort((x, y) => x.since - y.since);
    this.waiting.clear();
    for (const s of ordered) this.waiting.set(s.id, s);
    return matches;
  }

  private findPartner(seeker: Seeker, now: number): Match | null {
    const seekerOpen = this.isOpen(seeker, now);
    let best: Seeker | null = null;
    let bestCommon: string[] = [];

    for (const other of this.waiting.values()) {
      if (other.mode !== seeker.mode) continue;
      if (!this.opts.canPair(seeker, other, now)) continue;

      const common = commonInterests(seeker.interests, other.interests, seeker.keys, other.keys);
      if (common.length === 0 && !(seekerOpen && this.isOpen(other, now))) continue;

      const better =
        best === null ||
        common.length > bestCommon.length ||
        (common.length === bestCommon.length && other.since < best.since);
      if (better) {
        best = other;
        bestCommon = common;
      }
    }

    return best ? { a: seeker, b: best, common: bestCommon } : null;
  }
}
