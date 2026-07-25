import { useState } from 'react';
import {
  Area,
  Card,
  DeleteButton,
  Empty,
  Modal,
  Money,
  SegmentedControl,
  Select,
  Stat,
  Text,
  Toggle,
  accentVar,
} from '../components/ui';
import { CATEGORIES, CATEGORY_SERIES, budgetByCity, budgetSummary } from '../lib/budget';
import { sortedCities, useStore } from '../lib/store';
import { clsx, fmtDate, money, pluralize, todayISO, uid } from '../lib/util';
import type { BudgetCategory, Expense } from '../types';

export default function Budget() {
  const { data, add, update, remove } = useStore();
  const { trip } = data;
  const s = budgetSummary(data);
  const byCity = budgetByCity(data);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [editing, setEditing] = useState<Expense | null>(null);

  const pct = s.budget > 0 ? Math.min(100, (s.planned / s.budget) * 100) : 0;
  const maxLine = Math.max(1, ...s.lines.map((l) => l.planned));
  const maxCity = Math.max(1, ...byCity.map((c) => c.total));
  const converted = trip.fxRate > 0 ? s.planned * trip.fxRate : null;

  const blank = (): Expense => ({
    id: uid(),
    label: '',
    category: 'Other',
    cityId: '',
    amount: 0,
    date: todayISO(),
    paid: false,
    notes: '',
  });

  return (
    <div className="page stack">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Budget</h1>
          <div className="page-sub">
            Every hotel, train, ticket and restaurant estimate you have entered, added up — plus
            anything you log by hand below.
          </div>
        </div>
        <div className="page-actions">
          <SegmentedControl
            ariaLabel="Chart or table"
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: 'Chart' },
              { value: 'table', label: 'Table' },
            ]}
          />
          <button className="btn btn-primary" onClick={() => setEditing(blank())}>
            + Log an expense
          </button>
        </div>
      </div>

      <div className="grid grid-4">
        <Stat
          label="Planned"
          value={money(s.planned, trip.currency, { round: true })}
          note={converted ? `≈ ${money(converted, trip.homeCurrency, { round: true })}` : 'all entries'}
          small
        />
        <Stat
          label="Budget"
          value={money(s.budget, trip.currency, { round: true })}
          note={
            s.budget === 0
              ? 'not set — add one in settings'
              : s.remaining >= 0
                ? `${money(s.remaining, trip.currency, { round: true })} left`
                : `${money(-s.remaining, trip.currency, { round: true })} over`
          }
          small
        />
        <Stat
          label="Locked in"
          value={money(s.committed, trip.currency, { round: true })}
          note="booked or already paid"
          small
        />
        <Stat
          label="Per person"
          value={money(s.perPerson, trip.currency, { round: true })}
          note={`${money(s.perDay / Math.max(1, trip.travelers), trip.currency, { round: true })} per day`}
          small
        />
      </div>

      {s.budget > 0 ? (
        <Card
          title={
            s.remaining >= 0
              ? `${Math.round(pct)}% of budget allocated`
              : `Over budget by ${money(-s.remaining, trip.currency, { round: true })}`
          }
          note={`${money(s.planned, trip.currency, { round: true })} of ${money(s.budget, trip.currency, { round: true })}`}
        >
          <div className="meter">
            <div
              className={clsx('meter-fill', s.remaining < 0 && 'over', pct < 80 && 'good')}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="row small dim" style={{ marginTop: 8 }}>
            <span>
              {pluralize(s.days, 'day')} · {pluralize(trip.travelers, 'traveller')}
            </span>
            <span className="spacer" />
            <span>
              {money(s.budget / s.days / Math.max(1, trip.travelers), trip.currency, { round: true })}{' '}
              per person per day available
            </span>
          </div>
        </Card>
      ) : null}

      {view === 'chart' ? (
        <div className="grid grid-2">
          {/* Categorical identity: colour follows the category, never its rank. */}
          <Card title="Where the money goes" note="by category">
            {s.planned === 0 ? (
              <p className="muted small">Nothing costed yet.</p>
            ) : (
              <>
                <div className="bars">
                  {s.lines
                    .slice()
                    .sort((a, b) => b.planned - a.planned)
                    .map((l) => (
                      <div
                        className="bar-row"
                        key={l.category}
                        title={`${l.category}: ${money(l.planned, trip.currency)}${
                          l.committed > 0
                            ? ` (${money(l.committed, trip.currency)} already committed)`
                            : ''
                        }`}
                      >
                        <span className="bar-label">
                          <span className="swatch" style={{ ['--fill' as string]: CATEGORY_SERIES[l.category] }} />
                          {l.category}
                        </span>
                        <div className="bar-track">
                          {l.planned > 0 ? (
                            <div
                              className="bar-fill"
                              style={{
                                width: `${(l.planned / maxLine) * 100}%`,
                                ['--fill' as string]: CATEGORY_SERIES[l.category],
                              }}
                            />
                          ) : null}
                        </div>
                        <span className="bar-value">
                          {money(l.planned, trip.currency, { round: true })}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="legend">
                  {s.lines
                    .filter((l) => l.planned > 0)
                    .map((l) => (
                      <span className="legend-item" key={l.category}>
                        <span
                          className="swatch"
                          style={{ ['--fill' as string]: CATEGORY_SERIES[l.category] }}
                        />
                        {l.category}
                        {l.sources.length ? (
                          <span className="dim">— {l.sources.join(', ')}</span>
                        ) : null}
                      </span>
                    ))}
                </div>
              </>
            )}
          </Card>

          {/*
            Magnitude comparison, so one hue throughout — the city names carry
            identity. Painting each bar its own city colour would put arbitrary
            pairs side by side once the rows are sorted by total, which the
            categorical palette only guarantees for adjacent slots.
          */}
          <Card title="Spend by city" note="lodging, food, sights & logged costs">
            {byCity.length === 0 || byCity.every((c) => c.total === 0) ? (
              <p className="muted small">Add a hotel or a sight with a price to see this.</p>
            ) : (
              <div className="bars">
                {byCity.map((c) => (
                  <div
                    className="bar-row"
                    key={c.cityId || 'unassigned'}
                    title={`${c.name}: ${money(c.total, trip.currency)}`}
                  >
                    <span className="bar-label">
                      {c.accent >= 0 ? (
                        <span className="city-dot" style={{ ['--dot' as string]: accentVar(c.accent) }} />
                      ) : null}
                      {c.name}
                    </span>
                    <div className="bar-track">
                      {c.total > 0 ? (
                        <div
                          className="bar-fill"
                          style={{
                            width: `${(c.total / maxCity) * 100}%`,
                            ['--fill' as string]:
                              c.accent < 0 ? 'var(--line-strong)' : 'var(--series-1)',
                          }}
                        />
                      ) : null}
                    </div>
                    <span className="bar-value">
                      {money(c.total, trip.currency, { round: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Comes from</th>
                <th className="num">Committed</th>
                <th className="num">Planned</th>
                <th className="num">Share</th>
              </tr>
            </thead>
            <tbody>
              {s.lines.map((l) => (
                <tr key={l.category}>
                  <td>
                    <span className="row" style={{ gap: 7 }}>
                      <span
                        className="swatch"
                        style={{ ['--fill' as string]: CATEGORY_SERIES[l.category] }}
                      />
                      {l.category}
                    </span>
                  </td>
                  <td className="muted small">{l.sources.join(', ') || '—'}</td>
                  <td className="num">{money(l.committed, trip.currency, { round: true })}</td>
                  <td className="num">{money(l.planned, trip.currency, { round: true })}</td>
                  <td className="num">
                    {s.planned > 0 ? `${Math.round((l.planned / s.planned) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td />
                <td className="num" style={{ fontWeight: 700 }}>
                  {money(s.committed, trip.currency, { round: true })}
                </td>
                <td className="num" style={{ fontWeight: 700 }}>
                  {money(s.planned, trip.currency, { round: true })}
                </td>
                <td className="num">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Card
        title="Logged expenses"
        note={data.expenses.length ? pluralize(data.expenses.length, 'entry', 'entries') : undefined}
        actions={
          <button className="btn btn-sm" onClick={() => setEditing(blank())}>
            + Add
          </button>
        }
      >
        {data.expenses.length === 0 ? (
          <Empty icon="€" title="Nothing logged by hand">
            Hotels, transport, sights and restaurant estimates are counted automatically. Use this
            for everything else — the tapas crawl, souvenirs, the taxi from the airport.
          </Empty>
        ) : (
          <div className="item-list">
            {[...data.expenses]
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              .map((e) => {
                const city = data.cities.find((c) => c.id === e.cityId);
                return (
                  <div className="item" key={e.id}>
                    <label className="check" style={{ alignSelf: 'center' }} title="Paid">
                      <input
                        type="checkbox"
                        checked={e.paid}
                        onChange={(ev) => update('expenses', e.id, { paid: ev.target.checked })}
                      />
                    </label>
                    <div className="item-main">
                      <div className="item-title">
                        {e.label || 'Untitled'}
                        <span
                          className="badge"
                          style={{
                            background: 'transparent',
                            border: `1px solid ${CATEGORY_SERIES[e.category]}`,
                            color: CATEGORY_SERIES[e.category],
                          }}
                        >
                          {e.category}
                        </span>
                        {e.paid ? <span className="badge badge-good">paid</span> : null}
                      </div>
                      <div className="item-meta">
                        {e.date ? fmtDate(e.date) : 'no date'}
                        {city ? ` · ${city.name}` : ''}
                      </div>
                      {e.notes ? <div className="item-notes">{e.notes}</div> : null}
                    </div>
                    <div className="item-cost">{money(e.amount, trip.currency, { round: true })}</div>
                    <div className="item-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e)}>
                        Edit
                      </button>
                      <DeleteButton onDelete={() => remove('expenses', e.id)} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      <p className="small dim">
        How the numbers are built: hotel totals → Lodging, transport legs → Transport, each
        restaurant's per-person estimate × {pluralize(trip.travelers, 'traveller')} → Food, sight
        costs → Activities, and anything logged above into its own category. “Locked in” counts only
        what you have marked booked or paid.
      </p>

      {editing ? (
        <ExpenseForm
          expense={editing}
          isNew={!data.expenses.some((e) => e.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            if (data.expenses.some((e) => e.id === next.id)) update('expenses', next.id, next);
            else add('expenses', next);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ExpenseForm({
  expense,
  isNew,
  onClose,
  onSave,
}: {
  expense: Expense;
  isNew: boolean;
  onClose: () => void;
  onSave: (e: Expense) => void;
}) {
  const { data } = useStore();
  const [d, setD] = useState<Expense>(expense);
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setD((x) => ({ ...x, [k]: v }));
  const cities = sortedCities(data);

  return (
    <Modal
      title={isNew ? 'Log an expense' : 'Edit expense'}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!d.label.trim()} onClick={() => onSave(d)}>
            {isNew ? 'Add' : 'Save'}
          </button>
        </>
      }
    >
      <Text
        label="What was it"
        value={d.label}
        onChange={(v) => set('label', v)}
        placeholder="Flamenco tickets"
        autoFocus
      />
      <div className="field-row">
        <Money
          label="Amount"
          value={d.amount}
          onChange={(v) => set('amount', v)}
          currency={data.trip.currency}
        />
        <Select
          label="Category"
          value={d.category}
          onChange={(v) => set('category', v as BudgetCategory)}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
      </div>
      <div className="field-row">
        <Text label="Date" type="date" value={d.date} onChange={(v) => set('date', v)} />
        <Select
          label="City"
          value={d.cityId}
          onChange={(v) => set('cityId', v)}
          options={[
            { value: '', label: 'Not city-specific' },
            ...cities.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>
      <Toggle label="Already paid" checked={d.paid} onChange={(v) => set('paid', v)} />
      <Area label="Notes" value={d.notes} onChange={(v) => set('notes', v)} rows={2} />
    </Modal>
  );
}
