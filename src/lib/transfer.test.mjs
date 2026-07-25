/**
 * Merge semantics for device-to-device transfer.
 *   node --experimental-strip-types src/lib/transfer.test.mjs
 * or via `npm test` (runs the compiled build through tsx-free node type strip).
 *
 * These are the cases that decide whether syncing loses your work, so they are
 * asserted rather than eyeballed.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// Realistic recent timestamps: tiny values land in 1970 and would be swept by
// the tombstone TTL, testing the wrong thing.
const T = Date.now();
import { mergeTrips } from '../../dist-test/lib/transfer.js';

const base = (over = {}) => ({
  version: 1,
  deleted: {},
  trip: { name: 'T', startDate: '2026-01-01', endDate: '2026-01-10', travelers: 2, currency: 'EUR', homeCurrency: 'USD', fxRate: 0, budgetTotal: 0, notes: '', updatedAt: T - 100000 },
  cities: [],
  stays: [],
  restaurants: [],
  places: [],
  legs: [],
  expenses: [],
  checklist: [],
  blocks: [],
  ...over,
});

const stay = (id, name, updatedAt) => ({
  id, cityId: 'c1', name, address: '', checkIn: '', checkOut: '',
  cost: 0, confirmation: '', link: '', status: 'idea', notes: '', updatedAt,
});

test('records only on the other device are pulled in', () => {
  const mine = base({ stays: [stay('a', 'A', T - 90000)] });
  const theirs = base({ stays: [stay('b', 'B', T - 80000)] });
  const { merged, report } = mergeTrips(mine, theirs);
  assert.deepEqual(merged.stays.map((s) => s.id).sort(), ['a', 'b']);
  assert.equal(report.added, 1);
});

test('the newer edit of the same record wins, whole', () => {
  const mine = base({ stays: [stay('a', 'old name', T - 90000)] });
  const theirs = base({ stays: [stay('a', 'new name', T - 1000)] });
  const { merged, report } = mergeTrips(mine, theirs);
  assert.equal(merged.stays.length, 1);
  assert.equal(merged.stays[0].name, 'new name');
  assert.equal(report.updated, 1);
});

test('my newer edit is not clobbered by their stale copy', () => {
  const mine = base({ stays: [stay('a', 'mine newer', T - 1000)] });
  const theirs = base({ stays: [stay('a', 'theirs older', T - 90000)] });
  const { merged, report } = mergeTrips(mine, theirs);
  assert.equal(merged.stays[0].name, 'mine newer');
  assert.equal(report.updated, 0);
});

test('a record deleted on the other device does not come back', () => {
  const mine = base({ stays: [stay('a', 'A', T - 90000)] });
  const theirs = base({ deleted: { a: T - 50000 } });
  const { merged, report } = mergeTrips(mine, theirs);
  assert.equal(merged.stays.length, 0);
  assert.equal(report.removed, 1);
  // The tombstone must persist, or a third merge resurrects it.
  assert.equal(merged.deleted.a, T - 50000);
});

test('a delete does not wipe an edit made after the delete', () => {
  const mine = base({ deleted: { a: T - 50000 } });
  const theirs = base({ stays: [stay('a', 'edited later', T - 1000)] });
  const { merged } = mergeTrips(mine, theirs);
  assert.equal(merged.stays.length, 1);
  assert.equal(merged.stays[0].name, 'edited later');
});

test('unstamped legacy records lose to any stamped edit', () => {
  const legacy = stay('a', 'legacy', undefined);
  delete legacy.updatedAt;
  const mine = base({ stays: [legacy] });
  const theirs = base({ stays: [stay('a', 'stamped', T - 1000)] });
  const { merged } = mergeTrips(mine, theirs);
  assert.equal(merged.stays[0].name, 'stamped');
});

test('trip settings follow the newer trip stamp', () => {
  const mine = base();
  const theirs = base();
  theirs.trip = { ...theirs.trip, budgetTotal: 9000, updatedAt: T - 500 };
  const { merged, report } = mergeTrips(mine, theirs);
  assert.equal(merged.trip.budgetTotal, 9000);
  assert.equal(report.tripSettingsTaken, true);
});

test('merging is idempotent — twice changes nothing more', () => {
  const mine = base({ stays: [stay('a', 'A', T - 90000)] });
  const theirs = base({ stays: [stay('b', 'B', T - 80000)], deleted: { c: T - 5000 } });
  const once = mergeTrips(mine, theirs).merged;
  const twice = mergeTrips(once, theirs);
  assert.equal(twice.report.added, 0);
  assert.equal(twice.report.updated, 0);
  assert.deepEqual(twice.merged.stays.map((s) => s.id).sort(), ['a', 'b']);
});

test('round trip both ways converges to the same document', () => {
  const a = base({ stays: [stay('a', 'A', T - 90000)], deleted: {} });
  const b = base({ stays: [stay('b', 'B', T - 80000)], deleted: {} });
  const aThenB = mergeTrips(a, b).merged;
  const bThenA = mergeTrips(b, a).merged;
  assert.deepEqual(
    aThenB.stays.map((s) => s.id).sort(),
    bThenA.stays.map((s) => s.id).sort(),
  );
});
