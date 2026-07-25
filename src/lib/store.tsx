import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  City,
  ID,
  Leg,
  Place,
  Restaurant,
  Stay,
  Trip,
  TripData,
} from '../types';
import { emptyTrip, starterTrip } from './seed';
import { fmtDateLong } from './util';

const STORAGE_KEY = 'spain-trip-planner/v1';
const THEME_KEY = 'spain-trip-planner/theme';

export const DATA_VERSION = 1;

/**
 * localStorage throws rather than returning null in a few real situations —
 * Safari private mode, a sandboxed iframe, a full quota, storage blocked by
 * policy. Every access goes through these so a storage failure degrades to
 * "this session isn't saved" instead of a blank page.
 */
const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};


/** Collections that hold `{ id }` records, keyed by their field name. */
type Collections = Pick<
  TripData,
  'cities' | 'stays' | 'restaurants' | 'places' | 'legs' | 'expenses' | 'checklist' | 'blocks'
>;
type CollectionKey = keyof Collections;
type ItemOf<K extends CollectionKey> = Collections[K][number];

export interface Store {
  data: TripData;
  /** Patch the trip-level settings. */
  setTrip: (patch: Partial<Trip>) => void;
  add: <K extends CollectionKey>(key: K, item: ItemOf<K>) => void;
  update: <K extends CollectionKey>(key: K, id: ID, patch: Partial<ItemOf<K>>) => void;
  remove: <K extends CollectionKey>(key: K, id: ID) => void;
  /** Replaces a whole collection — used by reordering and bulk edits. */
  replace: <K extends CollectionKey>(key: K, items: Collections[K]) => void;
  /** Swap in a whole document (import, reset, load sample). */
  load: (next: TripData) => void;
  undo: () => void;
  canUndo: boolean;
  /** True when saving to this browser has failed — changes are session-only. */
  saveFailed: boolean;
}

const StoreContext = createContext<Store | null>(null);

/** Fills in anything a stored or imported document is missing. */
function normalize(raw: unknown): TripData {
  const base = emptyTrip();
  if (!raw || typeof raw !== 'object') return base;
  const d = raw as Partial<TripData>;
  const list = <K extends CollectionKey>(key: K): Collections[K] =>
    (Array.isArray(d[key]) ? d[key] : base[key]) as Collections[K];
  return {
    version: DATA_VERSION,
    deleted: d.deleted && typeof d.deleted === 'object' ? d.deleted : {},
    trip: { ...base.trip, ...(d.trip ?? {}) },
    cities: list('cities'),
    stays: list('stays'),
    restaurants: list('restaurants'),
    places: list('places'),
    legs: list('legs'),
    expenses: list('expenses'),
    checklist: list('checklist'),
    blocks: list('blocks'),
  };
}

function read(): TripData {
  const raw = storage.get(STORAGE_KEY);
  if (!raw) return starterTrip();
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return starterTrip();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TripData>(read);
  const history = useRef<TripData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // Debounced write, so a burst of keystrokes in a form is one save.
  useEffect(() => {
    const t = setTimeout(() => {
      // On failure the app keeps working from memory for this session;
      // Settings → Export is the escape hatch, and the banner says so.
      setSaveFailed(!storage.set(STORAGE_KEY, JSON.stringify(data)));
    }, 250);
    return () => clearTimeout(t);
  }, [data]);

  /** Every mutation funnels through here so undo gets a snapshot for free. */
  const commit = useCallback((fn: (prev: TripData) => TripData) => {
    setData((prev) => {
      const next = fn(prev);
      if (next === prev) return prev;
      history.current = [...history.current, prev].slice(-40);
      setCanUndo(true);
      return next;
    });
  }, []);

  const store = useMemo<Store>(
    () => ({
      data,
      // Every mutation stamps `updatedAt` itself, so no caller has to remember
      // to — the merge in lib/transfer.ts is only correct if this is total.
      setTrip: (patch) =>
        commit((prev) => ({
          ...prev,
          trip: { ...prev.trip, ...patch, updatedAt: Date.now() },
        })),
      add: (key, item) =>
        commit(
          (prev) =>
            ({
              ...prev,
              [key]: [...(prev[key] as unknown[]), { ...item, updatedAt: Date.now() }],
            }) as TripData,
        ),
      update: (key, id, patch) =>
        commit(
          (prev) =>
            ({
              ...prev,
              [key]: (prev[key] as Array<{ id: ID }>).map((it) =>
                it.id === id ? { ...it, ...patch, updatedAt: Date.now() } : it,
              ),
            }) as TripData,
        ),
      remove: (key, id) =>
        commit(
          (prev) =>
            ({
              ...prev,
              deleted: { ...(prev.deleted ?? {}), [id]: Date.now() },
              [key]: (prev[key] as Array<{ id: ID }>).filter((it) => it.id !== id),
            }) as TripData,
        ),
      // Bulk replace is also a bulk delete (e.g. "clear done"), so anything
      // that disappeared has to be tombstoned or the next merge revives it.
      replace: (key, items) =>
        commit((prev) => {
          const kept = new Set((items as Array<{ id: ID }>).map((it) => it.id));
          const now = Date.now();
          const deleted = { ...(prev.deleted ?? {}) };
          for (const it of prev[key] as Array<{ id: ID }>) {
            if (!kept.has(it.id)) deleted[it.id] = now;
          }
          return { ...prev, deleted, [key]: items } as TripData;
        }),
      load: (next) => commit(() => normalize(next)),
      undo: () =>
        setData((prev) => {
          const prior = history.current.pop();
          if (!prior) return prev;
          setCanUndo(history.current.length > 0);
          return prior;
        }),
      canUndo,
      saveFailed,
    }),
    [data, commit, canUndo, saveFailed],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

/** Convenience: the trip document itself. */
export function useTrip() {
  return useStore().data;
}

/* ------------------------------------------------------------------ theme */

export type Theme = 'light' | 'dark';

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = storage.get(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storage.set(THEME_KEY, theme);
  }, [theme]);

  return [theme, setTheme];
}

/* ------------------------------------------------------ derived selectors */

export interface CityRollup {
  city: City;
  stays: Stay[];
  restaurants: Restaurant[];
  places: Place[];
  nights: number;
  cost: number;
}

export function cityCost(
  city: City,
  d: TripData,
): { lodging: number; food: number; activities: number; other: number; total: number } {
  const lodging = d.stays.filter((s) => s.cityId === city.id).reduce((a, s) => a + s.cost, 0);
  const food = d.restaurants
    .filter((r) => r.cityId === city.id)
    .reduce((a, r) => a + r.estCostPerPerson * Math.max(1, d.trip.travelers), 0);
  const activities = d.places.filter((p) => p.cityId === city.id).reduce((a, p) => a + p.cost, 0);
  const other = d.expenses.filter((e) => e.cityId === city.id).reduce((a, e) => a + e.amount, 0);
  return { lodging, food, activities, other, total: lodging + food + activities + other };
}

/** Cities sorted by arrival date, blanks last — the order every view shows. */
export function sortedCities(d: TripData): City[] {
  return [...d.cities].sort((a, b) => {
    if (!a.arrive) return 1;
    if (!b.arrive) return -1;
    return a.arrive.localeCompare(b.arrive);
  });
}

export function findCity(d: TripData, id: ID | ''): City | undefined {
  return d.cities.find((c) => c.id === id);
}

/**
 * The city you are *in* on `date` — meaning the one you sleep in that night.
 * On a travel day two windows overlap (you leave one and arrive in the other),
 * so the arriving city wins; the very last day falls back to where you woke up.
 */
export function cityOnDate(d: TripData, date: string): City | undefined {
  const cities = sortedCities(d).filter((c) => c.arrive && c.depart);
  return (
    cities.find((c) => date >= c.arrive && date < c.depart) ??
    cities.find((c) => date === c.depart)
  );
}

export interface Todo {
  id: string;
  label: string;
  detail: string;
  view: string;
}

/** Everything still unbooked or undecided, newest deadline first. */
export function openTodos(d: TripData): Todo[] {
  const out: Todo[] = [];
  for (const s of d.stays) {
    if (s.status === 'idea') {
      const city = findCity(d, s.cityId);
      out.push({
        id: `stay-${s.id}`,
        label: `Book ${s.name || 'a hotel'}`,
        detail: city ? city.name : 'Stay',
        view: `#/cities/${s.cityId}`,
      });
    }
  }
  for (const l of d.legs) {
    if (l.status === 'idea') {
      out.push({
        id: `leg-${l.id}`,
        label: `Book ${l.mode} ${legLabel(d, l)}`,
        detail: l.date ? fmtDateLong(l.date) : 'Transport',
        view: '#/transport',
      });
    }
  }
  for (const r of d.restaurants) {
    if (r.reservation === 'todo' || r.reservation === 'requested') {
      const city = findCity(d, r.cityId);
      out.push({
        id: `res-${r.id}`,
        label: `${r.reservation === 'todo' ? 'Reserve' : 'Chase reservation at'} ${r.name}`,
        detail: city ? city.name : 'Restaurant',
        view: `#/cities/${r.cityId}`,
      });
    }
  }
  for (const p of d.places) {
    if (p.ticketNeeded && !p.ticketBooked) {
      const city = findCity(d, p.cityId);
      out.push({
        id: `place-${p.id}`,
        label: `Buy tickets for ${p.name}`,
        detail: city ? city.name : 'Sight',
        view: `#/cities/${p.cityId}`,
      });
    }
  }
  return out;
}

export function legLabel(d: TripData, leg: Leg): string {
  const name = (ref: string) => findCity(d, ref)?.name ?? ref ?? '';
  return `${name(leg.from)} → ${name(leg.to)}`;
}

export function legEndpointName(d: TripData, ref: string): string {
  return findCity(d, ref)?.name ?? ref;
}
