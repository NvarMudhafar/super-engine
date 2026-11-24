import { splitInterests, type Dict, type Lang } from './i18n.ts';

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** A conversation starter — about your shared city or interest when there is one. */
export function icebreaker(common: string[], t: Dict, lang: Lang, avoid?: string): string {
  const { place, rest } = splitInterests(common, lang);
  for (let i = 0; i < 6; i++) {
    const roll = Math.random();
    let q: string;
    if (place && roll < 0.35) q = pick(t.aboutPlace).replace('{x}', place);
    else if (rest.length && roll < 0.7) q = pick(t.aboutInterest).replace('{x}', pick(rest));
    else q = pick(t.icebreakers);
    if (q !== avoid) return q;
  }
  return pick(t.icebreakers);
}
