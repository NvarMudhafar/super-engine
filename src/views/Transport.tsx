import { useState } from 'react';
import {
  Area,
  DeleteButton,
  Empty,
  Field,
  LinkOut,
  Modal,
  Money,
  Select,
  Text,
} from '../components/ui';
import { legEndpointName, sortedCities, useStore } from '../lib/store';
import { fmtDateLong, money, sum, uid } from '../lib/util';
import type { BookingStatus, Leg, TransportMode } from '../types';

const MODES: Array<{ value: TransportMode; label: string; icon: string }> = [
  { value: 'train', label: 'Train', icon: '🚆' },
  { value: 'flight', label: 'Flight', icon: '✈' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'car', label: 'Car / drive', icon: '🚗' },
  { value: 'ferry', label: 'Ferry', icon: '⛴' },
  { value: 'other', label: 'Other', icon: '➜' },
];

const STATUS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'idea', label: 'Not booked yet' },
  { value: 'booked', label: 'Booked' },
  { value: 'paid', label: 'Booked & paid' },
];

export default function Transport() {
  const { data, add, update, remove } = useStore();
  const [editing, setEditing] = useState<Leg | null>(null);
  const cities = sortedCities(data);
  const legs = [...data.legs].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const total = sum(legs.map((l) => l.cost));
  const unbooked = legs.filter((l) => l.status === 'idea').length;

  const blank = (): Leg => {
    // Default to the next unconnected hop, if there is an obvious one.
    const covered = new Set(data.legs.map((l) => `${l.from}>${l.to}`));
    let from = cities[0]?.id ?? '';
    let to = cities[1]?.id ?? '';
    let date = cities[1]?.arrive ?? data.trip.startDate;
    for (let i = 0; i < cities.length - 1; i++) {
      if (!covered.has(`${cities[i].id}>${cities[i + 1].id}`)) {
        from = cities[i].id;
        to = cities[i + 1].id;
        date = cities[i + 1].arrive;
        break;
      }
    }
    return {
      id: uid(),
      mode: 'train',
      from,
      to,
      date,
      depTime: '',
      arrTime: '',
      provider: '',
      confirmation: '',
      cost: 0,
      link: '',
      status: 'idea',
      notes: '',
    };
  };

  return (
    <div className="page stack">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Getting around</h1>
          <div className="page-sub">
            Flights, trains, buses and drives. Each one shows up on its day in the itinerary and
            rolls into the Transport budget.
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setEditing(blank())}>
            + Add a leg
          </button>
        </div>
      </div>

      <div className="callout">
        <span aria-hidden="true">🚆</span>
        <span>
          Spain's AVE high-speed trains are the fast way between cities and are far cheaper booked
          1–3 months ahead on{' '}
          <a href="https://www.renfe.com" target="_blank" rel="noreferrer noopener">
            renfe.com
          </a>
          ; <a href="https://iryo.eu" target="_blank" rel="noreferrer noopener">iryo</a> and{' '}
          <a href="https://ouigo.com/es" target="_blank" rel="noreferrer noopener">Ouigo</a>{' '}
          compete on the main routes and often undercut it.
        </span>
      </div>

      {legs.length === 0 ? (
        <Empty
          icon="⇄"
          title="No transport yet"
          action={
            <button className="btn btn-primary" onClick={() => setEditing(blank())}>
              + Add your first leg
            </button>
          }
        >
          Add the flights in and out, then each hop between cities.
        </Empty>
      ) : (
        <>
          <div className="row small muted">
            <span>
              {legs.length} legs · {money(total, data.trip.currency, { round: true })} total
            </span>
            {unbooked > 0 ? (
              <>
                <span className="spacer" />
                <span className="badge badge-warn">{unbooked} not booked</span>
              </>
            ) : null}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Times</th>
                  <th>Operator</th>
                  <th>Status</th>
                  <th className="num">Cost</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {legs.map((l) => {
                  const mode = MODES.find((m) => m.value === l.mode);
                  return (
                    <tr key={l.id}>
                      <td className="nowrap">{l.date ? fmtDateLong(l.date) : <span className="dim">—</span>}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          <span aria-hidden="true">{mode?.icon} </span>
                          {legEndpointName(data, l.from) || '?'} → {legEndpointName(data, l.to) || '?'}
                        </div>
                        {l.notes ? <div className="small muted">{l.notes}</div> : null}
                      </td>
                      <td className="nowrap mono">
                        {l.depTime || '—'}
                        {l.arrTime ? ` → ${l.arrTime}` : ''}
                      </td>
                      <td>
                        {l.provider || <span className="dim">—</span>}
                        {l.confirmation ? (
                          <div className="small mono muted">#{l.confirmation}</div>
                        ) : null}
                        {l.link ? (
                          <div>
                            <LinkOut href={l.link} />
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {l.status === 'idea' ? (
                          <span className="badge badge-bad">to book</span>
                        ) : l.status === 'booked' ? (
                          <span className="badge badge-warn">booked</span>
                        ) : (
                          <span className="badge badge-good">paid</span>
                        )}
                      </td>
                      <td className="num">{money(l.cost, data.trip.currency, { round: true })}</td>
                      <td>
                        <div className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(l)}>
                            Edit
                          </button>
                          <DeleteButton onDelete={() => remove('legs', l.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing ? (
        <LegForm
          leg={editing}
          isNew={!data.legs.some((l) => l.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            if (data.legs.some((l) => l.id === next.id)) update('legs', next.id, next);
            else add('legs', next);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function LegForm({
  leg,
  isNew,
  onClose,
  onSave,
}: {
  leg: Leg;
  isNew: boolean;
  onClose: () => void;
  onSave: (l: Leg) => void;
}) {
  const { data } = useStore();
  const [d, setD] = useState<Leg>(leg);
  const set = <K extends keyof Leg>(k: K, v: Leg[K]) => setD((x) => ({ ...x, [k]: v }));
  const cities = sortedCities(data);

  /**
   * Endpoints are usually trip cities, but the flights in and out are not — so
   * the select carries a "somewhere else" escape that reveals a text input.
   */
  const endpoint = (which: 'from' | 'to', label: string) => {
    const value = d[which];
    const isCity = cities.some((c) => c.id === value);
    return (
      <div className="stack-sm">
        <Field label={label}>
          <select
            value={isCity ? value : '__custom'}
            onChange={(e) => {
              const v = e.target.value;
              set(which, v === '__custom' ? (isCity ? '' : value) : v);
            }}
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__custom">Somewhere else…</option>
          </select>
        </Field>
        {!isCity ? (
          <input
            value={value}
            placeholder="Home / airport / village"
            onChange={(e) => set(which, e.target.value)}
          />
        ) : null}
      </div>
    );
  };

  return (
    <Modal
      title={isNew ? 'Add a transport leg' : 'Edit leg'}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => onSave(d)}>
            {isNew ? 'Add' : 'Save'}
          </button>
        </>
      }
    >
      <div className="field-row">
        <Select
          label="Mode"
          value={d.mode}
          onChange={(v) => set('mode', v)}
          options={MODES.map((m) => ({ value: m.value, label: `${m.icon}  ${m.label}` }))}
        />
        <Text label="Date" type="date" value={d.date} onChange={(v) => set('date', v)} />
      </div>
      <div className="field-row">
        {endpoint('from', 'From')}
        {endpoint('to', 'To')}
      </div>
      <div className="field-row">
        <Text label="Departs" type="time" value={d.depTime} onChange={(v) => set('depTime', v)} />
        <Text label="Arrives" type="time" value={d.arrTime} onChange={(v) => set('arrTime', v)} />
      </div>
      <div className="field-row">
        <Text
          label="Operator"
          value={d.provider}
          onChange={(v) => set('provider', v)}
          placeholder="Renfe AVE / Iberia / Ouigo"
        />
        <Text
          label="Confirmation / locator"
          value={d.confirmation}
          onChange={(v) => set('confirmation', v)}
        />
      </div>
      <div className="field-row">
        <Money
          label="Cost"
          value={d.cost}
          onChange={(v) => set('cost', v)}
          currency={data.trip.currency}
          hint="Total for everyone travelling"
        />
        <Select label="Status" value={d.status} onChange={(v) => set('status', v)} options={STATUS} />
      </div>
      <Text label="Booking link" type="url" value={d.link} onChange={(v) => set('link', v)} />
      <Area
        label="Notes"
        value={d.notes}
        onChange={(v) => set('notes', v)}
        rows={2}
        placeholder="Seat numbers, which station, luggage rules…"
      />
    </Modal>
  );
}
