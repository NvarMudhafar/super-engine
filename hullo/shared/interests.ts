import { LIMITS } from './protocol.ts';

/**
 * Canonical form of one interest tag, so "#Music ", "music" and "MUSIC" all
 * match. Letters and digits in any script survive; most punctuation does not.
 * Returns '' for anything that normalises away to nothing.
 */
export function normalizeInterest(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}\s+\-&'.]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITS.interest)
    .trim();
}

/** Normalise, drop blanks, de-duplicate and cap a list of interests. */
export function normalizeInterests(list: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const tag = normalizeInterest(item);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= LIMITS.interests) break;
  }
  return out;
}

/** Interests two people share, in the first person's order. */
export function commonInterests(a: readonly string[], b: readonly string[]): string[] {
  if (a.length === 0 || b.length === 0) return [];
  const other = new Set(b);
  return a.filter((tag) => other.has(tag));
}
