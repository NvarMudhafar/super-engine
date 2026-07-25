import type { ID, Stamped, TripData } from '../types';

/**
 * Moving a plan between devices.
 *
 * There is no server here, so "sync" means: pack the whole document into a
 * string, carry it across by any means (a link, a paste, AirDrop), and merge it
 * into whatever the other device already had.
 *
 * The merge is record-granular last-write-wins:
 *   - a record present on one side only is taken, unless it is tombstoned
 *     on the other side more recently than it was edited;
 *   - a record on both sides resolves to whichever copy has the newer
 *     `updatedAt` — whole, not field-by-field, so a record never ends up in a
 *     state neither device ever had;
 *   - trip settings resolve the same way, on `trip.updatedAt`.
 *
 * Records saved before timestamps existed have no `updatedAt` and count as
 * oldest, so a stamped edit always beats them.
 */

const PREFIX = 'ESP1.'; // format tag, so a stale paste fails loudly not weirdly
const TOMBSTONE_TTL_MS = 120 * 24 * 60 * 60 * 1000; // 120 days

/** Collections merged by id. Keep in step with TripData. */
const COLLECTIONS = [
  'cities',
  'stays',
  'restaurants',
  'places',
  'legs',
  'expenses',
  'checklist',
  'blocks',
] as const;

type CollectionKey = (typeof COLLECTIONS)[number];
type Record_ = Stamped & { id: ID };

/* ----------------------------------------------------------------- encoding */

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function gzip(text: string): Promise<Uint8Array | null> {
  // CompressionStream is Safari 16.4+. Older browsers fall back to plain base64.
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(
    new DecompressionStream('gzip'),
  );
  return new Response(stream).text();
}

/** Packs a trip into a single transportable token. */
export async function encodeTrip(data: TripData): Promise<string> {
  const json = JSON.stringify(data);
  const packed = await gzip(json);
  if (packed) return `${PREFIX}z${toBase64Url(packed)}`;
  return `${PREFIX}r${toBase64Url(new TextEncoder().encode(json))}`;
}

export async function decodeTrip(token: string): Promise<TripData> {
  const trimmed = token.trim();
  // Tolerate a whole pasted link, and whitespace from a mail client.
  const afterHash = trimmed.includes('#') ? trimmed.slice(trimmed.lastIndexOf('#') + 1) : trimmed;
  const body = afterHash.replace(/^.*?(?=ESP1\.)/s, '').replace(/\s+/g, '');

  if (!body.startsWith(PREFIX)) {
    throw new Error('That does not look like a planner transfer code.');
  }
  const mode = body[PREFIX.length];
  const payload = body.slice(PREFIX.length + 1);
  const bytes = fromBase64Url(payload);
  const json = mode === 'z' ? await gunzip(bytes) : new TextDecoder().decode(bytes);
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !parsed.trip) {
    throw new Error('The transfer code decoded but held no trip.');
  }
  return parsed as TripData;
}

/* -------------------------------------------------------------------- merge */

const stamp = (r: Stamped): number => r.updatedAt ?? 0;

function mergeTombstones(
  a: Record<ID, number> = {},
  b: Record<ID, number> = {},
): Record<ID, number> {
  const out: Record<ID, number> = { ...a };
  for (const [id, when] of Object.entries(b)) {
    out[id] = Math.max(out[id] ?? 0, when);
  }
  return out;
}

/**
 * Drops tombstones old enough that every device has surely seen them, so the
 * document cannot grow without bound.
 *
 * This runs *after* the tombstones have been applied to the collections, not
 * before: pruning first would let a deletion that is just past the TTL fail to
 * take effect in the very merge carrying it, silently resurrecting the record.
 */
function pruneTombstones(tombstones: Record<ID, number>): Record<ID, number> {
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  const out: Record<ID, number> = {};
  for (const [id, when] of Object.entries(tombstones)) {
    if (when >= cutoff) out[id] = when;
  }
  return out;
}

function mergeCollection<T extends Record_>(
  mine: T[],
  theirs: T[],
  tombstones: Record<ID, number>,
): { merged: T[]; added: number; updated: number; removed: number } {
  const byId = new Map<ID, T>();
  for (const r of mine) byId.set(r.id, r);

  let added = 0;
  let updated = 0;

  for (const incoming of theirs) {
    const existing = byId.get(incoming.id);
    if (!existing) {
      byId.set(incoming.id, incoming);
      added++;
    } else if (stamp(incoming) > stamp(existing)) {
      byId.set(incoming.id, incoming);
      updated++;
    }
  }

  // A tombstone wins only over edits older than the deletion; an edit made
  // after the delete resurrects the record deliberately.
  let removed = 0;
  const merged: T[] = [];
  for (const r of byId.values()) {
    const killed = tombstones[r.id];
    if (killed !== undefined && killed >= stamp(r)) {
      removed++;
      continue;
    }
    merged.push(r);
  }

  return { merged, added, updated, removed };
}

export interface MergeReport {
  added: number;
  updated: number;
  removed: number;
  tripSettingsTaken: boolean;
  /** Per-collection counts, for the "here is what changed" summary. */
  detail: Array<{ key: CollectionKey; added: number; updated: number; removed: number }>;
}

export interface MergeOptions {
  /**
   * Whether to adopt the incoming trip name, dates, party size and budget.
   * Left undefined this follows `trip.updatedAt`, which ties in favour of the
   * local copy — so the UI offers it as an explicit checkbox instead of
   * letting a tie decide something the traveller cares about.
   */
  takeTripSettings?: boolean;
}

/** What the timestamps alone would decide about trip settings. */
export function tripSettingsWouldTransfer(mine: TripData, theirs: TripData): boolean {
  return stamp(theirs.trip) > stamp(mine.trip);
}

export function mergeTrips(
  mine: TripData,
  theirs: TripData,
  options: MergeOptions = {},
): { merged: TripData; report: MergeReport } {
  const tombstones = mergeTombstones(mine.deleted, theirs.deleted);
  const tripSettingsTaken =
    options.takeTripSettings ?? tripSettingsWouldTransfer(mine, theirs);

  const merged: TripData = {
    ...mine,
    version: mine.version,
    // Applied in full below; only what is stored afterwards gets pruned.
    deleted: pruneTombstones(tombstones),
    trip: tripSettingsTaken ? theirs.trip : mine.trip,
  };

  const report: MergeReport = {
    added: 0,
    updated: 0,
    removed: 0,
    tripSettingsTaken,
    detail: [],
  };

  for (const key of COLLECTIONS) {
    const result = mergeCollection(
      (mine[key] ?? []) as Record_[],
      (theirs[key] ?? []) as Record_[],
      tombstones,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (merged as any)[key] = result.merged;
    report.added += result.added;
    report.updated += result.updated;
    report.removed += result.removed;
    if (result.added || result.updated || result.removed) {
      report.detail.push({
        key,
        added: result.added,
        updated: result.updated,
        removed: result.removed,
      });
    }
  }

  return { merged, report };
}

/** Human label for a collection key, for the merge summary. */
export const COLLECTION_LABEL: Record<CollectionKey, string> = {
  cities: 'cities',
  stays: 'hotels',
  restaurants: 'restaurants',
  places: 'sights',
  legs: 'transport legs',
  expenses: 'expenses',
  checklist: 'checklist items',
  blocks: 'itinerary entries',
};

/** A rough count of what a document holds, for the receive preview. */
export function summarize(d: TripData): string {
  const parts: string[] = [];
  for (const key of COLLECTIONS) {
    const n = (d[key] ?? []).length;
    if (n > 0) parts.push(`${n} ${COLLECTION_LABEL[key]}`);
  }
  return parts.join(', ') || 'nothing';
}
