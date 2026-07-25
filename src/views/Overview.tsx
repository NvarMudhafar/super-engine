import { navigate } from '../App';
import { Card, Empty, Stat, dotStyle } from '../components/ui';
import { budgetSummary } from '../lib/budget';
import { cityCost, openTodos, sortedCities, useStore } from '../lib/store';
import {
  clsx,
  daysBetween,
  fmtDate,
  fmtRange,
  money,
  pluralize,
  todayISO,
} from '../lib/util';
import type { City } from '../types';

export default function Overview() {
  const { data } = useStore();
  const { trip } = data;
  const cities = sortedCities(data);
  const budget = budgetSummary(data);
  const todos = openTodos(data);
  const today = todayISO();
  const countdown = daysBetween(today, trip.startDate);
  const nights = Math.max(0, daysBetween(trip.startDate, trip.endDate));

  const mustGoFood = data.restaurants.filter((r) => r.mustGo);
  const mustSee = data.places.filter((p) => p.priority === 'must');
  const pct = budget.budget > 0 ? Math.min(100, (budget.planned / budget.budget) * 100) : 0;
  const isEmpty = cities.length === 0;

  return (
    <div className="page stack">
      <div className="page-head">
        <div className="page-head-text">
          <h1>{trip.name || 'Your trip'}</h1>
          <div className="page-sub">
            {fmtRange(trip.startDate, trip.endDate)} · {pluralize(nights, 'night')} ·{' '}
            {pluralize(trip.travelers, 'traveller')}
            {cities.length ? ` · ${pluralize(cities.length, 'city', 'cities')}` : ''}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => navigate('#/settings')}>
            Trip settings
          </button>
          <button className="btn btn-primary" onClick={() => navigate('#/library')}>
            ★ Browse Spain picks
          </button>
        </div>
      </div>

      {isEmpty ? (
        <Card title="Start here">
          <div className="stack">
            <p className="muted">
              Three steps and the rest of the app fills itself in.
            </p>
            <ol className="stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                Set your dates, party size and budget in{' '}
                <a href="#/settings">Settings &amp; data</a>.
              </li>
              <li>
                Add the cities you are visiting — <a href="#/library">Spain picks</a> has ten of
                them ready with curated restaurants and sights, or add your own from{' '}
                <a href="#/cities">Cities</a>.
              </li>
              <li>
                Enter your hotels and trains as you book them; the budget and itinerary update
                themselves.
              </li>
            </ol>
            <div className="callout">
              <span aria-hidden="true">⌘</span>
              <span>
                Everything is stored in this browser only. Use{' '}
                <a href="#/settings">Settings &amp; data → Export</a> to keep a backup file, and
                press <span className="kbd">Ctrl</span>+<span className="kbd">Z</span> to undo.
              </span>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-4">
        <Stat
          label="Countdown"
          value={
            countdown > 0
              ? countdown
              : daysBetween(today, trip.endDate) >= 0
                ? 'Now'
                : 'Done'
          }
          note={countdown > 0 ? `days until ${fmtDate(trip.startDate)}` : fmtRange(trip.startDate, trip.endDate)}
        />
        <Stat
          label="Planned spend"
          value={money(budget.planned, trip.currency, { round: true })}
          note={
            budget.budget > 0
              ? budget.remaining >= 0
                ? `${money(budget.remaining, trip.currency, { round: true })} under budget`
                : `${money(-budget.remaining, trip.currency, { round: true })} over budget`
              : 'no budget set'
          }
          small
        />
        <Stat
          label="Per person / day"
          value={money(budget.perDay / Math.max(1, trip.travelers), trip.currency, { round: true })}
          note={`over ${pluralize(budget.days, 'day')}`}
          small
        />
        <Stat
          label="Still to book"
          value={todos.length}
          note={todos.length ? 'see the list below' : 'nothing outstanding'}
          small
        />
      </div>

      {budget.budget > 0 ? (
        <Card
          title="Budget"
          note={`${money(budget.planned, trip.currency, { round: true })} of ${money(
            budget.budget,
            trip.currency,
            { round: true },
          )}`}
          actions={
            <button className="btn btn-sm" onClick={() => navigate('#/budget')}>
              Breakdown
            </button>
          }
        >
          <div className="meter">
            <div
              className={clsx('meter-fill', budget.remaining < 0 && 'over', pct < 80 && 'good')}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="row small muted" style={{ marginTop: 8 }}>
            <span>
              {money(budget.committed, trip.currency, { round: true })} already booked or paid
            </span>
            <span className="spacer" />
            <span>{Math.round(pct)}% of budget allocated</span>
          </div>
        </Card>
      ) : null}

      {cities.length ? <RouteStrip cities={cities} /> : null}

      <div className="grid grid-2 grid-top">
        <Card
          title="Next up"
          note={todos.length ? pluralize(todos.length, 'open item') : undefined}
        >
          {todos.length === 0 ? (
            <p className="muted small">
              Nothing outstanding — every hotel, train, table and ticket is marked as sorted.
            </p>
          ) : (
            <div className="stack-sm">
              {todos.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  className="item"
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'none',
                    font: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(t.view)}
                >
                  <div className="item-main">
                    <div className="item-title" style={{ fontWeight: 500 }}>
                      {t.label}
                    </div>
                    <div className="item-meta">{t.detail}</div>
                  </div>
                  <span className="dim" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
              {todos.length > 8 ? (
                <p className="dim small">and {todos.length - 8} more across the trip.</p>
              ) : null}
            </div>
          )}
        </Card>

        <Card title="The shortlist" note="flagged as must-do">
          {mustGoFood.length + mustSee.length === 0 ? (
            <p className="muted small">
              Star a restaurant as “must go” or set a sight to “must” and it shows up here.
            </p>
          ) : (
            <div className="stack-sm">
              {mustGoFood.slice(0, 5).map((r) => {
                const city = data.cities.find((c) => c.id === r.cityId);
                return (
                  <div className="row small" key={r.id}>
                    <span className="city-dot" style={dotStyle(city?.accent ?? 0)} />
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    <span className="dim">{city?.name}</span>
                    <span className="spacer" />
                    <span className="badge badge-gold">eat</span>
                  </div>
                );
              })}
              {mustSee.slice(0, 5).map((p) => {
                const city = data.cities.find((c) => c.id === p.cityId);
                return (
                  <div className="row small" key={p.id}>
                    <span className="city-dot" style={dotStyle(city?.accent ?? 0)} />
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span className="dim">{city?.name}</span>
                    <span className="spacer" />
                    <span className="badge badge-info">see</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {cities.length ? (
        <Card
          title="Cities"
          actions={
            <button className="btn btn-sm" onClick={() => navigate('#/cities')}>
              Manage
            </button>
          }
        >
          <div className="grid grid-3">
            {cities.map((c) => {
              const cost = cityCost(c, data);
              const n = Math.max(0, daysBetween(c.arrive, c.depart));
              const stays = data.stays.filter((s) => s.cityId === c.id);
              const booked = stays.some((s) => s.status !== 'idea');
              return (
                <button
                  key={c.id}
                  className="stat"
                  style={{ ...dotStyle(c.accent), textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => navigate(`#/cities/${c.id}`)}
                >
                  <div className="row">
                    <span className="city-dot" />
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span className="spacer" />
                    {stays.length === 0 ? (
                      <span className="badge badge-bad">no hotel</span>
                    ) : booked ? (
                      <span className="badge badge-good">booked</span>
                    ) : (
                      <span className="badge badge-warn">not booked</span>
                    )}
                  </div>
                  <div className="stat-note" style={{ marginTop: 6 }}>
                    {c.arrive ? fmtRange(c.arrive, c.depart) : 'dates not set'} ·{' '}
                    {pluralize(n, 'night')}
                  </div>
                  <div className="stat-note">
                    {money(cost.total, trip.currency, { round: true })} ·{' '}
                    {pluralize(
                      data.restaurants.filter((r) => r.cityId === c.id).length,
                      'place to eat',
                      'places to eat',
                    )}{' '}
                    · {data.places.filter((p) => p.cityId === c.id).length} to see
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Empty icon="⌂" title="No cities yet">
          Add the cities you are visiting and the itinerary, budget and packing list all follow
          from there.
        </Empty>
      )}
    </div>
  );
}

/** Proportional bar of the trip, one segment per city, gaps included. */
function RouteStrip({ cities }: { cities: City[] }) {
  const { data } = useStore();
  const total = Math.max(1, daysBetween(data.trip.startDate, data.trip.endDate));

  const segments: Array<{ key: string; label: string; nights: number; accent: number }> = [];
  let cursor = data.trip.startDate;

  for (const c of cities) {
    if (!c.arrive || !c.depart) continue;
    const gap = daysBetween(cursor, c.arrive);
    if (gap > 0) {
      segments.push({ key: `gap-${c.id}`, label: 'unplanned', nights: gap, accent: -1 });
    }
    const nights = Math.max(0, daysBetween(c.arrive, c.depart));
    segments.push({ key: c.id, label: c.name, nights: Math.max(nights, 0.4), accent: c.accent });
    if (c.depart > cursor) cursor = c.depart;
  }
  const tail = daysBetween(cursor, data.trip.endDate);
  if (tail > 0) segments.push({ key: 'tail', label: 'unplanned', nights: tail, accent: -1 });

  if (segments.length === 0) return null;

  return (
    <Card title="The route" note={`${pluralize(total, 'night')} total`}>
      <div className="timeline">
        {segments.map((s) => (
          <div
            key={s.key}
            className={clsx('timeline-seg', s.accent < 0 && 'gap')}
            style={{ ...dotStyle(s.accent), flexGrow: s.nights, flexBasis: 0 }}
            title={`${s.label} — ${pluralize(Math.round(s.nights), 'night')}`}
          >
            {s.label}
          </div>
        ))}
      </div>
      <div className="row small dim" style={{ marginTop: 8 }}>
        <span>{fmtDate(data.trip.startDate)}</span>
        <span className="spacer" />
        <span>{fmtDate(data.trip.endDate)}</span>
      </div>
    </Card>
  );
}
