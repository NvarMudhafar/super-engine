import { useState } from 'react';
import { navigate } from '../App';
import {
  Area,
  DeleteButton,
  Empty,
  Modal,
  Text,
  accentVar,
  dotStyle,
} from '../components/ui';
import { cityCost, sortedCities, useStore } from '../lib/store';
import { SPAIN_LIBRARY } from '../lib/seed';
import { addDays, daysBetween, fmtRange, money, pluralize, uid } from '../lib/util';
import type { City } from '../types';

export default function Cities() {
  const { data, add, update, remove } = useStore();
  const [editing, setEditing] = useState<City | null>(null);
  const cities = sortedCities(data);

  const blank = (): City => {
    // Chain onto the last city so a linear route needs no date typing.
    const last = cities[cities.length - 1];
    const arrive = last?.depart || data.trip.startDate;
    return {
      id: uid(),
      name: '',
      region: '',
      arrive,
      depart: addDays(arrive, 2),
      notes: '',
      accent: cities.length % 8,
    };
  };

  return (
    <div className="page stack">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Cities</h1>
          <div className="page-sub">
            Each city holds its own hotels, restaurants and sights. Dates here drive the itinerary.
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => navigate('#/library')}>
            ★ Add from Spain picks
          </button>
          <button className="btn btn-primary" onClick={() => setEditing(blank())}>
            + Add city
          </button>
        </div>
      </div>

      {cities.length === 0 ? (
        <Empty
          icon="⌂"
          title="No cities yet"
          action={
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('#/library')}>
                Browse Spain picks
              </button>
              <button className="btn" onClick={() => setEditing(blank())}>
                Add one manually
              </button>
            </div>
          }
        >
          Spain picks has Madrid, Barcelona, Seville, Granada, San Sebastián, Valencia, Córdoba,
          Bilbao, Málaga and Toledo pre-loaded with restaurants and sights worth your time.
        </Empty>
      ) : (
        <div className="grid grid-2">
          {cities.map((city) => {
            const cost = cityCost(city, data);
            const nights = Math.max(0, daysBetween(city.arrive, city.depart));
            const stays = data.stays.filter((s) => s.cityId === city.id);
            const eats = data.restaurants.filter((r) => r.cityId === city.id);
            const sees = data.places.filter((p) => p.cityId === city.id);
            return (
              <section
                key={city.id}
                className="card"
                style={{ ...dotStyle(city.accent), borderTop: `3px solid ${accentVar(city.accent)}` }}
              >
                <div className="card-head">
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>{city.name}</h2>
                  <span className="spacer" />
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(city)}>
                    Edit
                  </button>
                  <DeleteButton
                    label={`Delete ${city.name}`}
                    onDelete={() => {
                      // Cascade, or the child records become invisible orphans.
                      for (const s of stays) remove('stays', s.id);
                      for (const r of eats) remove('restaurants', r.id);
                      for (const p of sees) remove('places', p.id);
                      remove('cities', city.id);
                    }}
                  />
                </div>

                <div className="small muted">
                  {city.region ? `${city.region} · ` : ''}
                  {city.arrive ? fmtRange(city.arrive, city.depart) : 'dates not set'} ·{' '}
                  {pluralize(nights, 'night')}
                </div>

                {city.notes ? (
                  <p className="item-notes" style={{ marginTop: 8 }}>
                    {city.notes}
                  </p>
                ) : null}

                <div className="row row-wrap" style={{ marginTop: 12, gap: 6 }}>
                  <span className={stays.length ? 'badge badge-good' : 'badge badge-bad'}>
                    {stays.length ? pluralize(stays.length, 'stay') : 'no hotel'}
                  </span>
                  <span className="badge">{pluralize(eats.length, 'restaurant')}</span>
                  <span className="badge">{pluralize(sees.length, 'sight')}</span>
                  <span className="badge badge-accent">
                    {money(cost.total, data.trip.currency, { round: true })}
                  </span>
                </div>

                <div className="row" style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`#/cities/${city.id}`)}
                  >
                    Open {city.name} →
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {editing ? (
        <CityForm
          city={editing}
          isNew={!data.cities.some((c) => c.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            if (data.cities.some((c) => c.id === next.id)) update('cities', next.id, next);
            else add('cities', next);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CityForm({
  city,
  isNew,
  onClose,
  onSave,
}: {
  city: City;
  isNew: boolean;
  onClose: () => void;
  onSave: (c: City) => void;
}) {
  const [draft, setDraft] = useState<City>(city);
  const set = <K extends keyof City>(key: K, value: City[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const nights = Math.max(0, daysBetween(draft.arrive, draft.depart));
  const known = SPAIN_LIBRARY.find(
    (l) => l.name.toLowerCase() === draft.name.trim().toLowerCase(),
  );

  return (
    <Modal
      title={isNew ? 'Add a city' : `Edit ${city.name}`}
      onClose={onClose}
      footer={
        <>
          <span className="small dim">{pluralize(nights, 'night')}</span>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!draft.name.trim()}
            onClick={() =>
              onSave({
                ...draft,
                name: draft.name.trim(),
                region: draft.region || known?.region || '',
              })
            }
          >
            {isNew ? 'Add city' : 'Save'}
          </button>
        </>
      }
    >
      <Text
        label="City"
        value={draft.name}
        onChange={(v) => set('name', v)}
        placeholder="Seville"
        autoFocus
      />
      {known && isNew ? (
        <div className="callout">
          <span aria-hidden="true">★</span>
          <span>
            Spain picks has curated restaurants and sights for {known.name}. Add the city, then use{' '}
            <a href="#/library">Spain picks</a> to pull them in.
          </span>
        </div>
      ) : null}
      <div className="field-row">
        <Text
          label="Region"
          value={draft.region}
          onChange={(v) => set('region', v)}
          placeholder="Andalusia"
        />
        <Text
          label="Colour"
          type="number"
          min={1}
          value={String(draft.accent + 1)}
          onChange={(v) => set('accent', Math.max(0, Number(v) - 1))}
          hint="1–8, used for the city's chip colour"
        />
      </div>
      <div className="field-row">
        <Text label="Arrive" type="date" value={draft.arrive} onChange={(v) => set('arrive', v)} />
        <Text
          label="Depart"
          type="date"
          value={draft.depart}
          onChange={(v) => set('depart', v)}
          hint={
            draft.arrive && draft.depart && draft.depart < draft.arrive
              ? '⚠ departure is before arrival'
              : undefined
          }
        />
      </div>
      <Area
        label="Notes"
        value={draft.notes}
        onChange={(v) => set('notes', v)}
        placeholder="Neighbourhood to stay in, what this stop is for, anything to remember…"
      />
    </Modal>
  );
}
