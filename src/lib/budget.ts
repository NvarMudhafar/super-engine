import type { BudgetCategory, TripData } from '../types';
import { daysBetween } from './util';

export const CATEGORIES: BudgetCategory[] = [
  'Lodging',
  'Transport',
  'Food',
  'Activities',
  'Shopping',
  'Other',
];

/**
 * Series slot per category, fixed for the life of the app. Colour follows the
 * category, never its rank in a sorted chart — so a filter that reorders the
 * bars never repaints them.
 */
export const CATEGORY_SERIES: Record<BudgetCategory, string> = {
  Lodging: 'var(--series-1)',
  Transport: 'var(--series-2)',
  Food: 'var(--series-3)',
  Activities: 'var(--series-4)',
  Shopping: 'var(--series-5)',
  Other: 'var(--series-6)',
};

export interface BudgetLine {
  category: BudgetCategory;
  /** Everything you intend to spend. */
  planned: number;
  /** The slice already booked or paid for. */
  committed: number;
  /** Where the number comes from, for the "how is this calculated" note. */
  sources: string[];
}

export interface BudgetSummary {
  lines: BudgetLine[];
  planned: number;
  committed: number;
  budget: number;
  remaining: number;
  perPerson: number;
  perDay: number;
  days: number;
  overBy: number;
}

export function budgetSummary(d: TripData): BudgetSummary {
  const travelers = Math.max(1, d.trip.travelers);
  const blank = (category: BudgetCategory): BudgetLine => ({
    category,
    planned: 0,
    committed: 0,
    sources: [],
  });
  const map = new Map<BudgetCategory, BudgetLine>(CATEGORIES.map((c) => [c, blank(c)]));
  const push = (category: BudgetCategory, amount: number, committed: boolean, source: string) => {
    const line = map.get(category) ?? blank(category);
    line.planned += amount;
    if (committed) line.committed += amount;
    if (amount > 0 && !line.sources.includes(source)) line.sources.push(source);
    map.set(category, line);
  };

  for (const s of d.stays) {
    push('Lodging', s.cost, s.status !== 'idea', 'hotels');
  }
  for (const l of d.legs) {
    push('Transport', l.cost, l.status !== 'idea', 'transport legs');
  }
  for (const r of d.restaurants) {
    push('Food', r.estCostPerPerson * travelers, false, 'restaurant estimates');
  }
  for (const p of d.places) {
    push('Activities', p.cost, p.ticketBooked, 'sights & activities');
  }
  for (const e of d.expenses) {
    push(e.category, e.amount, e.paid, 'logged expenses');
  }

  const lines = CATEGORIES.map((c) => map.get(c)!);
  const planned = lines.reduce((a, l) => a + l.planned, 0);
  const committed = lines.reduce((a, l) => a + l.committed, 0);
  const budget = d.trip.budgetTotal;
  const days = Math.max(1, daysBetween(d.trip.startDate, d.trip.endDate) + 1);

  return {
    lines,
    planned,
    committed,
    budget,
    remaining: budget - planned,
    perPerson: planned / travelers,
    perDay: planned / days,
    days,
    overBy: Math.max(0, planned - budget),
  };
}

export interface CityBudget {
  cityId: string;
  name: string;
  accent: number;
  total: number;
}

/** Spend attributable to each city, plus an "unassigned" bucket. */
export function budgetByCity(d: TripData): CityBudget[] {
  const travelers = Math.max(1, d.trip.travelers);
  const totals = new Map<string, number>();
  const bump = (id: string, n: number) => totals.set(id, (totals.get(id) ?? 0) + n);

  for (const s of d.stays) bump(s.cityId, s.cost);
  for (const r of d.restaurants) bump(r.cityId, r.estCostPerPerson * travelers);
  for (const p of d.places) bump(p.cityId, p.cost);
  for (const e of d.expenses) bump(e.cityId, e.amount);

  const rows: CityBudget[] = d.cities.map((c) => ({
    cityId: c.id,
    name: c.name,
    accent: c.accent,
    total: totals.get(c.id) ?? 0,
  }));

  // Transport legs and anything without a city land here.
  const unassigned =
    (totals.get('') ?? 0) + d.legs.reduce((a, l) => a + l.cost, 0);
  if (unassigned > 0) {
    rows.push({ cityId: '', name: 'Transport & other', accent: -1, total: unassigned });
  }

  return rows.sort((a, b) => b.total - a.total);
}
