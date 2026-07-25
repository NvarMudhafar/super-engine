import { useMemo, useState } from 'react';
import { navigate } from '../App';
import { Area, DeleteButton, Empty, Field, Modal, Text, dotStyle } from '../components/ui';
import { cityOnDate, legEndpointName, useStore } from '../lib/store';
import {
  clsx,
  dateOf,
  dateRange,
  fmtDate,
  fmtDayName,
  pluralize,
  timeOf,
  todayISO,
  uid,
} from '../lib/util';
import type { Block, DateStr } from '../types';

const MODE_ICON: Record<string, string> = {
  train: '🚆',
  flight: '✈',
  bus: '🚌',
  car: '🚗',
  ferry: '⛴',
  other: '➜',
};

interface Entry {
  key: string;
  time: string;
  label: string;
  note: string;
  fixed: boolean;
  block?: Block;
}

export default function Itinerary() {
  const { data, add, update, remove } = useStore();
  const [editing, setEditing] = useState<Block | null>(null);
  const days = useMemo(
    () => dateRange(data.trip.startDate, data.trip.endDate),
    [data.trip.startDate, data.trip.endDate],
  );
  const today = todayISO();

  /** Everything that lands on a given day: derived facts first, then plans. */
  const entriesFor = (date: DateStr): Entry[] => {
    const out: Entry[] = [];

    for (const leg of data.legs.filter((l) => l.date === date)) {
      out.push({
        key: `leg-${leg.id}`,
        time: leg.depTime,
        label: `${MODE_ICON[leg.mode] ?? '➜'} ${legEndpointName(data, leg.from)} → ${legEndpointName(
          data,
          leg.to,
        )}`,
        note: [
          leg.provider,
          leg.arrTime ? `arrives ${leg.arrTime}` : '',
          leg.confirmation ? `#${leg.confirmation}` : '',
          leg.status === 'idea' ? 'NOT BOOKED' : '',
        ]
          .filter(Boolean)
          .join(' · '),
        fixed: true,
      });
    }

    for (const stay of data.stays) {
      if (stay.checkIn === date) {
        out.push({
          key: `in-${stay.id}`,
          time: '15:00',
          label: `🔑 Check in — ${stay.name}`,
          note: stay.address,
          fixed: true,
        });
      }
      if (stay.checkOut === date) {
        out.push({
          key: `out-${stay.id}`,
          time: '11:00',
          label: `🧳 Check out — ${stay.name}`,
          note: '',
          fixed: true,
        });
      }
    }

    for (const r of data.restaurants) {
      if (r.reservedAt && dateOf(r.reservedAt) === date) {
        out.push({
          key: `res-${r.id}`,
          time: timeOf(r.reservedAt),
          label: `🍽 ${r.name}`,
          note: r.reservation === 'confirmed' ? 'table confirmed' : 'reservation not confirmed',
          fixed: true,
        });
      }
    }

    for (const b of data.blocks.filter((b) => b.date === date)) {
      out.push({
        key: `block-${b.id}`,
        time: b.time,
        label: b.label,
        note: b.note,
        fixed: false,
        block: b,
      });
    }

    // Timed entries in clock order; untimed ones fall to the bottom of the day.
    return out.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  };

  if (days.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <div className="page-head-text">
            <h1>Itinerary</h1>
          </div>
        </div>
        <Empty
          icon="▤"
          title="Set your trip dates first"
          action={
            <button className="btn btn-primary" onClick={() => navigate('#/settings')}>
              Open settings
            </button>
          }
        >
          The itinerary is built from the start and end dates of your trip.
        </Empty>
      </div>
    );
  }

  const totalPlanned = data.blocks.length;

  return (
    <div className="page stack">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Itinerary</h1>
          <div className="page-sub">
            {pluralize(days.length, 'day')} · {pluralize(totalPlanned, 'planned entry', 'planned entries')}.
            Hotels, trains and booked tables appear on their own — add anything else by hand.
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => window.print()}>
            ⎙ Print
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '4px 16px' }}>
        {days.map((date, i) => {
          const city = cityOnDate(data, date);
          const entries = entriesFor(date);
          return (
            <div
              key={date}
              className={clsx('day', date === today && 'today')}
              style={dotStyle(city?.accent ?? -1)}
            >
              <div className="day-date">
                <div className="day-num">Day {i + 1}</div>
                <div className="day-dow">{fmtDayName(date)}</div>
                <div className="day-md">{fmtDate(date)}</div>
                {city ? (
                  <div className="row small" style={{ marginTop: 6 }}>
                    <span className="city-dot" />
                    <a href={`#/cities/${city.id}`} style={{ color: 'var(--text-2)' }}>
                      {city.name}
                    </a>
                  </div>
                ) : (
                  <div className="small dim" style={{ marginTop: 6 }}>
                    no city set
                  </div>
                )}
              </div>

              <div className="day-body">
                {entries.map((e) => (
                  <div key={e.key} className={clsx('block', e.fixed && 'auto-block')}>
                    <span className="block-time">{e.time || '—'}</span>
                    <div className="block-main">
                      <div style={{ fontWeight: 500 }}>{e.label}</div>
                      {e.note ? <div className="block-note">{e.note}</div> : null}
                    </div>
                    {e.block ? (
                      <div className="item-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditing(e.block!)}
                        >
                          Edit
                        </button>
                        <DeleteButton onDelete={() => remove('blocks', e.block!.id)} />
                      </div>
                    ) : (
                      <span className="badge" title="Comes from your hotels, transport or bookings">
                        auto
                      </span>
                    )}
                  </div>
                ))}

                <button
                  className="day-add"
                  onClick={() =>
                    setEditing({ id: uid(), date, time: '', label: '', note: '' })
                  }
                >
                  + Add to {fmtDate(date)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing ? (
        <BlockForm
          block={editing}
          isNew={!data.blocks.some((b) => b.id === editing.id)}
          days={days}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            if (data.blocks.some((b) => b.id === next.id)) update('blocks', next.id, next);
            else add('blocks', next);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function BlockForm({
  block,
  isNew,
  days,
  onClose,
  onSave,
}: {
  block: Block;
  isNew: boolean;
  days: DateStr[];
  onClose: () => void;
  onSave: (b: Block) => void;
}) {
  const { data } = useStore();
  const [d, setD] = useState<Block>(block);
  const set = <K extends keyof Block>(k: K, v: Block[K]) => setD((x) => ({ ...x, [k]: v }));

  // Offer everything already saved for the city you are in on that day, so a
  // plan entry can be a real place rather than retyped free text.
  const city = cityOnDate(data, d.date);
  const suggestions = city
    ? [
        ...data.places.filter((p) => p.cityId === city.id).map((p) => ({ id: p.id, name: p.name, kind: 'place' as const })),
        ...data.restaurants
          .filter((r) => r.cityId === city.id)
          .map((r) => ({ id: r.id, name: r.name, kind: 'restaurant' as const })),
      ]
    : [];

  return (
    <Modal
      title={isNew ? `Add to ${fmtDate(d.date)}` : 'Edit entry'}
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
      <div className="field-row">
        <Field label="Day">
          <select value={d.date} onChange={(e) => set('date', e.target.value)}>
            {days.map((day, i) => (
              <option key={day} value={day}>
                Day {i + 1} — {fmtDate(day, { weekday: 'short', month: 'short', day: 'numeric' })}
              </option>
            ))}
          </select>
        </Field>
        <Text label="Time (optional)" type="time" value={d.time} onChange={(v) => set('time', v)} />
      </div>

      <Text
        label="What"
        value={d.label}
        onChange={(v) => set('label', v)}
        placeholder="Walk the Albaicín, then dinner"
        autoFocus
      />

      {suggestions.length > 0 && isNew ? (
        <Field label={`Or pick from ${city?.name ?? 'this city'}`}>
          <div className="row row-wrap" style={{ gap: 6 }}>
            {suggestions.slice(0, 12).map((s) => (
              <button
                key={`${s.kind}-${s.id}`}
                className="btn btn-sm"
                onClick={() =>
                  setD((x) => ({
                    ...x,
                    label: s.name,
                    refType: s.kind,
                    refId: s.id,
                  }))
                }
              >
                {s.kind === 'restaurant' ? '🍽' : '📍'} {s.name}
              </button>
            ))}
          </div>
        </Field>
      ) : null}

      <Area
        label="Note"
        value={d.note}
        onChange={(v) => set('note', v)}
        rows={2}
        placeholder="Anything you want to remember on the day"
      />
    </Modal>
  );
}
