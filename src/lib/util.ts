import type { DateStr } from '../types';

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ------------------------------------------------------------------ dates */

/**
 * Parses `YYYY-MM-DD` into a Date at local noon. Noon keeps day arithmetic
 * from slipping across a DST boundary, and avoids the UTC-midnight-parses-as
 * -previous-day trap that `new Date('2026-09-01')` walks into west of GMT.
 */
export function parseDate(d: DateStr): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? '');
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toISO(d: Date): DateStr {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayISO(): DateStr {
  return toISO(new Date());
}

export function addDays(d: DateStr, n: number): DateStr {
  const date = parseDate(d);
  if (!date) return d;
  date.setDate(date.getDate() + n);
  return toISO(date);
}

/** Whole days from `a` to `b`. Negative when `b` is earlier. */
export function daysBetween(a: DateStr, b: DateStr): number {
  const from = parseDate(a);
  const to = parseDate(b);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** Every date from `start` to `end`, inclusive. Capped to stay sane. */
export function dateRange(start: DateStr, end: DateStr): DateStr[] {
  if (!parseDate(start) || !parseDate(end)) return [];
  const span = daysBetween(start, end);
  if (span < 0) return [];
  const out: DateStr[] = [];
  for (let i = 0; i <= Math.min(span, 400); i++) out.push(addDays(start, i));
  return out;
}

/** True when `d` falls in [start, end], inclusive, ignoring blank bounds. */
export function withinRange(d: DateStr, start: DateStr, end: DateStr): boolean {
  if (!parseDate(d)) return false;
  if (parseDate(start) && d < start) return false;
  if (parseDate(end) && d > end) return false;
  return true;
}

export function fmtDate(d: DateStr, opts?: Intl.DateTimeFormatOptions): string {
  const date = parseDate(d);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, opts ?? { month: 'short', day: 'numeric' });
}

export function fmtDateLong(d: DateStr): string {
  return fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDayName(d: DateStr): string {
  return fmtDate(d, { weekday: 'long' });
}

/** `Sep 3 – Sep 8` (or `Sep 3 – 8` when the month is shared). */
export function fmtRange(a: DateStr, b: DateStr): string {
  const from = parseDate(a);
  const to = parseDate(b);
  if (!from || !to) return from ? fmtDate(a) : to ? fmtDate(b) : '—';
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${fmtDate(a)} – ${to.getDate()}`;
  }
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}

/** `19:30` from `2026-09-04T19:30`. */
export function timeOf(datetime: string): string {
  const t = datetime.split('T')[1];
  return t ? t.slice(0, 5) : '';
}

export function dateOf(datetime: string): DateStr {
  return datetime.split('T')[0] ?? '';
}

/* ------------------------------------------------------------------ money */

export function money(n: number, currency: string, opts?: { round?: boolean }): string {
  const value = Number.isFinite(n) ? n : 0;
  const fractionDigits = opts?.round || Number.isInteger(value) ? 0 : 2;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    // Non-ISO currency string — fall back to a plain number with the code.
    return `${currency} ${value.toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;
  }
}

export function num(v: string): number {
  const n = Number.parseFloat(v.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + (b || 0), 0);

/* ------------------------------------------------------------------- misc */

export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
