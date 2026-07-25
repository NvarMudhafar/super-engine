import { useMemo, useState } from 'react';
import { navigate } from '../App';
import {
  Area,
  DeleteButton,
  Empty,
  Field,
  LinkOut,
  Modal,
  Money,
  PriceTier,
  SegmentedControl,
  Select,
  Text,
  Toggle,
  accentVar,
  dotStyle,
} from '../components/ui';
import { cityCost, useStore } from '../lib/store';
import {
  clsx,
  dateOf,
  dateRange,
  daysBetween,
  fmtDate,
  fmtRange,
  money,
  pluralize,
  timeOf,
  uid,
} from '../lib/util';
import type {
  BookingStatus,
  City,
  Place,
  PlaceCategory,
  Priority,
  ReservationStatus,
  Restaurant,
  Stay,
} from '../types';

type Tab = 'stays' | 'eat' | 'see';

const STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'idea', label: 'Idea / shortlisted' },
  { value: 'booked', label: 'Booked' },
  { value: 'paid', label: 'Booked & paid' },
];

const RESERVATION_OPTIONS: Array<{ value: ReservationStatus; label: string }> = [
  { value: 'not-needed', label: 'Walk in — no booking' },
  { value: 'todo', label: 'Need to reserve' },
  { value: 'requested', label: 'Requested, waiting' },
  { value: 'confirmed', label: 'Confirmed' },
];

const CATEGORY_OPTIONS: Array<{ value: PlaceCategory; label: string }> = [
  { value: 'landmark', label: 'Landmark' },
  { value: 'museum', label: 'Museum / gallery' },
  { value: 'neighbourhood', label: 'Neighbourhood' },
  { value: 'viewpoint', label: 'Viewpoint' },
  { value: 'park', label: 'Park / garden' },
  { value: 'market', label: 'Market' },
  { value: 'beach', label: 'Beach' },
  { value: 'nightlife', label: 'Nightlife / show' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'daytrip', label: 'Day trip' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: 'must', label: 'Must do' },
  { value: 'want', label: 'Would like' },
  { value: 'maybe', label: 'If there is time' },
];

const CATEGORY_ICON: Record<PlaceCategory, string> = {
  landmark: '🏛',
  museum: '🖼',
  neighbourhood: '🧭',
  viewpoint: '🌄',
  park: '🌳',
  market: '🧺',
  beach: '🏖',
  nightlife: '💃',
  shopping: '🛍',
  daytrip: '🚏',
  other: '📍',
};

export default function CityDetail({ cityId }: { cityId: string }) {
  const { data, add, update, remove } = useStore();
  const city = data.cities.find((c) => c.id === cityId);
  const [tab, setTab] = useState<Tab>('stays');
  const [editStay, setEditStay] = useState<Stay | null>(null);
  const [editEat, setEditEat] = useState<Restaurant | null>(null);
  const [editSee, setEditSee] = useState<Place | null>(null);
  const [scheduling, setScheduling] = useState<
    { refType: 'place' | 'restaurant'; refId: string; label: string } | null
  >(null);

  if (!city) {
    return (
      <div className="page">
        <Empty
          icon="🧭"
          title="That city is gone"
          action={
            <button className="btn btn-primary" onClick={() => navigate('#/cities')}>
              Back to cities
            </button>
          }
        >
          It may have been deleted.
        </Empty>
      </div>
    );
  }

  const currency = data.trip.currency;
  const stays = data.stays.filter((s) => s.cityId === city.id);
  const eats = data.restaurants
    .filter((r) => r.cityId === city.id)
    .sort((a, b) => Number(b.mustGo) - Number(a.mustGo) || a.name.localeCompare(b.name));
  const sees = data.places
    .filter((p) => p.cityId === city.id)
    .sort(
      (a, b) =>
        ['must', 'want', 'maybe'].indexOf(a.priority) - ['must', 'want', 'maybe'].indexOf(b.priority) ||
        a.name.localeCompare(b.name),
    );
  const cost = cityCost(city, data);
  const nights = Math.max(0, daysBetween(city.arrive, city.depart));

  const newStay = (): Stay => ({
    id: uid(),
    cityId: city.id,
    name: '',
    address: '',
    checkIn: city.arrive,
    checkOut: city.depart,
    cost: 0,
    confirmation: '',
    link: '',
    status: 'idea',
    notes: '',
  });

  const newEat = (): Restaurant => ({
    id: uid(),
    cityId: city.id,
    name: '',
    cuisine: '',
    area: '',
    priceTier: 2,
    mustGo: false,
    reservation: 'not-needed',
    reservedAt: '',
    estCostPerPerson: 0,
    link: '',
    notes: '',
    visited: false,
  });

  const newSee = (): Place => ({
    id: uid(),
    cityId: city.id,
    name: '',
    category: 'landmark',
    priority: 'want',
    ticketNeeded: false,
    ticketBooked: false,
    cost: 0,
    hours: '',
    address: '',
    link: '',
    notes: '',
    done: false,
  });

  return (
    <div className="page stack" style={dotStyle(city.accent)}>
      <div className="page-head">
        <div className="page-head-text">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('#/cities')}>
            ← All cities
          </button>
          <h1 style={{ marginTop: 8 }}>
            <span className="city-dot" style={{ marginRight: 10, width: 12, height: 12 }} />
            {city.name}
          </h1>
          <div className="page-sub">
            {city.region ? `${city.region} · ` : ''}
            {city.arrive ? fmtRange(city.arrive, city.depart) : 'dates not set'} ·{' '}
            {pluralize(nights, 'night')} · {money(cost.total, currency, { round: true })} planned
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => navigate('#/library')}>
            ★ Spain picks
          </button>
        </div>
      </div>

      {city.notes ? <div className="callout">{city.notes}</div> : null}

      <div className="row">
        <SegmentedControl
          ariaLabel="City section"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'stays', label: `Hotels (${stays.length})` },
            { value: 'eat', label: `Eat & drink (${eats.length})` },
            { value: 'see', label: `See & do (${sees.length})` },
          ]}
        />
        <span className="spacer" />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (tab === 'stays') setEditStay(newStay());
            if (tab === 'eat') setEditEat(newEat());
            if (tab === 'see') setEditSee(newSee());
          }}
        >
          + Add {tab === 'stays' ? 'hotel' : tab === 'eat' ? 'restaurant' : 'sight'}
        </button>
      </div>

      {/* -------------------------------------------------------- hotels */}
      {tab === 'stays' ? (
        stays.length === 0 ? (
          <Empty
            icon="🛏"
            title={`No stay booked in ${city.name}`}
            action={
              <button className="btn btn-primary" onClick={() => setEditStay(newStay())}>
                + Add a hotel
              </button>
            }
          >
            Record the hotel, the confirmation number and what it costs. The total rolls into your
            budget as Lodging.
          </Empty>
        ) : (
          <div className="item-list">
            {stays.map((s) => {
              const n = Math.max(0, daysBetween(s.checkIn, s.checkOut));
              return (
                <div className="item" key={s.id}>
                  <div className="item-main">
                    <div className="item-title">
                      {s.name || 'Unnamed stay'}
                      {s.status === 'paid' ? (
                        <span className="badge badge-good">paid</span>
                      ) : s.status === 'booked' ? (
                        <span className="badge badge-good">booked</span>
                      ) : (
                        <span className="badge badge-warn">not booked</span>
                      )}
                      <LinkOut href={s.link} label="Booking" />
                    </div>
                    <div className="item-meta">
                      {fmtRange(s.checkIn, s.checkOut)} · {pluralize(n, 'night')}
                      {n > 0 && s.cost > 0
                        ? ` · ${money(s.cost / n, currency, { round: true })}/night`
                        : ''}
                      {s.address ? ` · ${s.address}` : ''}
                    </div>
                    {s.confirmation ? (
                      <div className="item-meta mono">Confirmation {s.confirmation}</div>
                    ) : null}
                    {s.notes ? <div className="item-notes">{s.notes}</div> : null}
                  </div>
                  <div className="item-cost">{money(s.cost, currency, { round: true })}</div>
                  <div className="item-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditStay(s)}>
                      Edit
                    </button>
                    <DeleteButton onDelete={() => remove('stays', s.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {/* --------------------------------------------------- restaurants */}
      {tab === 'eat' ? (
        eats.length === 0 ? (
          <Empty
            icon="🍤"
            title={`Nowhere to eat in ${city.name} yet`}
            action={
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => navigate('#/library')}>
                  ★ Add curated picks
                </button>
                <button className="btn" onClick={() => setEditEat(newEat())}>
                  Add your own
                </button>
              </div>
            }
          >
            Mark the ones you refuse to miss as “must go” and they surface on the overview.
          </Empty>
        ) : (
          <div className="item-list">
            {eats.map((r) => (
              <div className="item" key={r.id}>
                <label className="check" style={{ alignSelf: 'center' }} title="Been there">
                  <input
                    type="checkbox"
                    checked={r.visited}
                    onChange={(e) => update('restaurants', r.id, { visited: e.target.checked })}
                  />
                </label>
                <div className="item-main">
                  <div className={clsx('item-title', r.visited && 'done')}>
                    {r.name || 'Unnamed'}
                    {r.mustGo ? <span className="badge badge-gold">★ must go</span> : null}
                    {r.reservation === 'confirmed' ? (
                      <span className="badge badge-good">
                        booked{r.reservedAt ? ` ${fmtDate(dateOf(r.reservedAt))} ${timeOf(r.reservedAt)}` : ''}
                      </span>
                    ) : r.reservation === 'todo' ? (
                      <span className="badge badge-bad">reserve!</span>
                    ) : r.reservation === 'requested' ? (
                      <span className="badge badge-warn">requested</span>
                    ) : null}
                    <LinkOut href={r.link} />
                  </div>
                  <div className="item-meta row row-wrap" style={{ gap: 8 }}>
                    <PriceTier tier={r.priceTier} />
                    {r.cuisine ? <span>{r.cuisine}</span> : null}
                    {r.area ? <span className="dim">· {r.area}</span> : null}
                    {r.estCostPerPerson > 0 ? (
                      <span className="dim">
                        · ~{money(r.estCostPerPerson, currency, { round: true })} pp
                      </span>
                    ) : null}
                  </div>
                  {r.notes ? <div className="item-notes">{r.notes}</div> : null}
                </div>
                <div className="item-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Put on a day in the itinerary"
                    onClick={() =>
                      setScheduling({ refType: 'restaurant', refId: r.id, label: r.name })
                    }
                  >
                    ▤
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditEat(r)}>
                    Edit
                  </button>
                  <DeleteButton onDelete={() => remove('restaurants', r.id)} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* -------------------------------------------------------- sights */}
      {tab === 'see' ? (
        sees.length === 0 ? (
          <Empty
            icon="🏛"
            title={`Nothing to see in ${city.name} yet`}
            action={
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => navigate('#/library')}>
                  ★ Add curated picks
                </button>
                <button className="btn" onClick={() => setEditSee(newSee())}>
                  Add your own
                </button>
              </div>
            }
          >
            Anything that needs a timed ticket gets flagged on the overview until you have booked
            it.
          </Empty>
        ) : (
          <div className="item-list">
            {sees.map((p) => (
              <div className="item" key={p.id}>
                <label className="check" style={{ alignSelf: 'center' }} title="Done">
                  <input
                    type="checkbox"
                    checked={p.done}
                    onChange={(e) => update('places', p.id, { done: e.target.checked })}
                  />
                </label>
                <div className="item-main">
                  <div className={clsx('item-title', p.done && 'done')}>
                    <span aria-hidden="true">{CATEGORY_ICON[p.category]}</span>
                    {p.name || 'Unnamed'}
                    {p.priority === 'must' ? (
                      <span className="badge badge-accent">must</span>
                    ) : p.priority === 'maybe' ? (
                      <span className="badge">maybe</span>
                    ) : null}
                    {p.ticketNeeded ? (
                      p.ticketBooked ? (
                        <span className="badge badge-good">tickets in hand</span>
                      ) : (
                        <span className="badge badge-bad">needs tickets</span>
                      )
                    ) : null}
                    <LinkOut href={p.link} />
                  </div>
                  <div className="item-meta">
                    {CATEGORY_OPTIONS.find((c) => c.value === p.category)?.label}
                    {p.hours ? ` · ${p.hours}` : ''}
                    {p.address ? ` · ${p.address}` : ''}
                  </div>
                  {p.notes ? <div className="item-notes">{p.notes}</div> : null}
                </div>
                <div className="item-cost">
                  {p.cost > 0 ? money(p.cost, currency, { round: true }) : <span className="dim">free</span>}
                </div>
                <div className="item-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    title="Put on a day in the itinerary"
                    onClick={() => setScheduling({ refType: 'place', refId: p.id, label: p.name })}
                  >
                    ▤
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditSee(p)}>
                    Edit
                  </button>
                  <DeleteButton onDelete={() => remove('places', p.id)} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {editStay ? (
        <StayForm
          stay={editStay}
          currency={currency}
          isNew={!data.stays.some((s) => s.id === editStay.id)}
          onClose={() => setEditStay(null)}
          onSave={(next) => {
            if (data.stays.some((s) => s.id === next.id)) update('stays', next.id, next);
            else add('stays', next);
            setEditStay(null);
          }}
        />
      ) : null}

      {editEat ? (
        <RestaurantForm
          rec={editEat}
          currency={currency}
          city={city}
          isNew={!data.restaurants.some((r) => r.id === editEat.id)}
          onClose={() => setEditEat(null)}
          onSave={(next) => {
            if (data.restaurants.some((r) => r.id === next.id)) update('restaurants', next.id, next);
            else add('restaurants', next);
            setEditEat(null);
          }}
        />
      ) : null}

      {editSee ? (
        <PlaceForm
          place={editSee}
          currency={currency}
          isNew={!data.places.some((p) => p.id === editSee.id)}
          onClose={() => setEditSee(null)}
          onSave={(next) => {
            if (data.places.some((p) => p.id === next.id)) update('places', next.id, next);
            else add('places', next);
            setEditSee(null);
          }}
        />
      ) : null}

      {scheduling ? (
        <ScheduleModal
          city={city}
          label={scheduling.label}
          onClose={() => setScheduling(null)}
          onSave={(date, time, note) => {
            add('blocks', {
              id: uid(),
              date,
              time,
              label: scheduling.label,
              refType: scheduling.refType,
              refId: scheduling.refId,
              note,
            });
            setScheduling(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- forms */

function StayForm({
  stay,
  currency,
  isNew,
  onClose,
  onSave,
}: {
  stay: Stay;
  currency: string;
  isNew: boolean;
  onClose: () => void;
  onSave: (s: Stay) => void;
}) {
  const [d, setD] = useState<Stay>(stay);
  const set = <K extends keyof Stay>(k: K, v: Stay[K]) => setD((x) => ({ ...x, [k]: v }));
  const nights = Math.max(0, daysBetween(d.checkIn, d.checkOut));

  return (
    <Modal
      title={isNew ? 'Add a hotel' : d.name || 'Edit stay'}
      onClose={onClose}
      footer={
        <>
          <span className="small dim">
            {pluralize(nights, 'night')}
            {nights > 0 && d.cost > 0 ? ` · ${money(d.cost / nights, currency, { round: true })}/night` : ''}
          </span>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!d.name.trim()} onClick={() => onSave(d)}>
            {isNew ? 'Add' : 'Save'}
          </button>
        </>
      }
    >
      <Text
        label="Hotel / apartment"
        value={d.name}
        onChange={(v) => set('name', v)}
        placeholder="Hotel Casa 1800"
        autoFocus
      />
      <Text
        label="Address or neighbourhood"
        value={d.address}
        onChange={(v) => set('address', v)}
        placeholder="Calle Rodrigo Caro 6, Santa Cruz"
      />
      <div className="field-row">
        <Text label="Check in" type="date" value={d.checkIn} onChange={(v) => set('checkIn', v)} />
        <Text
          label="Check out"
          type="date"
          value={d.checkOut}
          onChange={(v) => set('checkOut', v)}
          hint={d.checkOut && d.checkIn && d.checkOut < d.checkIn ? '⚠ before check-in' : undefined}
        />
      </div>
      <div className="field-row">
        <Money
          label="Total cost"
          value={d.cost}
          onChange={(v) => set('cost', v)}
          currency={currency}
          hint="Whole stay, whole party"
        />
        <Select
          label="Status"
          value={d.status}
          onChange={(v) => set('status', v)}
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="field-row">
        <Text
          label="Confirmation number"
          value={d.confirmation}
          onChange={(v) => set('confirmation', v)}
          placeholder="ABC-123456"
        />
        <Text
          label="Booking link"
          type="url"
          value={d.link}
          onChange={(v) => set('link', v)}
          placeholder="booking.com/…"
        />
      </div>
      <Area
        label="Notes"
        value={d.notes}
        onChange={(v) => set('notes', v)}
        placeholder="Breakfast included, luggage storage after checkout, 3rd floor no lift…"
      />
    </Modal>
  );
}

function RestaurantForm({
  rec,
  currency,
  city,
  isNew,
  onClose,
  onSave,
}: {
  rec: Restaurant;
  currency: string;
  city: City;
  isNew: boolean;
  onClose: () => void;
  onSave: (r: Restaurant) => void;
}) {
  const [d, setD] = useState<Restaurant>(rec);
  const set = <K extends keyof Restaurant>(k: K, v: Restaurant[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  return (
    <Modal
      title={isNew ? `Add a restaurant in ${city.name}` : d.name || 'Edit restaurant'}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!d.name.trim()} onClick={() => onSave(d)}>
            {isNew ? 'Add' : 'Save'}
          </button>
        </>
      }
    >
      <Text label="Name" value={d.name} onChange={(v) => set('name', v)} placeholder="Bar Eslava" autoFocus />
      <div className="field-row">
        <Text
          label="Cuisine / speciality"
          value={d.cuisine}
          onChange={(v) => set('cuisine', v)}
          placeholder="Modern tapas"
        />
        <Text
          label="Area"
          value={d.area}
          onChange={(v) => set('area', v)}
          placeholder="San Lorenzo"
        />
      </div>
      <div className="field-row">
        <Select
          label="Price"
          value={String(d.priceTier)}
          onChange={(v) => set('priceTier', Number(v))}
          options={[
            { value: '1', label: '€ — cheap eats' },
            { value: '2', label: '€€ — mid' },
            { value: '3', label: '€€€ — a treat' },
            { value: '4', label: '€€€€ — blowout' },
          ]}
        />
        <Money
          label="Estimate per person"
          value={d.estCostPerPerson}
          onChange={(v) => set('estCostPerPerson', v)}
          currency={currency}
          hint="Feeds the Food budget × party size"
        />
      </div>
      <div className="field-row">
        <Select
          label="Reservation"
          value={d.reservation}
          onChange={(v) => set('reservation', v)}
          options={RESERVATION_OPTIONS}
        />
        <Text
          label="Table booked for"
          type="datetime-local"
          value={d.reservedAt}
          onChange={(v) => set('reservedAt', v)}
          hint="Shows up on that day of the itinerary"
        />
      </div>
      <Text
        label="Website or booking link"
        type="url"
        value={d.link}
        onChange={(v) => set('link', v)}
      />
      <div className="row row-wrap" style={{ gap: 18 }}>
        <Toggle label="★ Must go" checked={d.mustGo} onChange={(v) => set('mustGo', v)} />
        <Toggle label="Already been" checked={d.visited} onChange={(v) => set('visited', v)} />
      </div>
      <Area
        label="Notes"
        value={d.notes}
        onChange={(v) => set('notes', v)}
        placeholder="What to order, whether they take cards, how early to turn up…"
      />
    </Modal>
  );
}

function PlaceForm({
  place,
  currency,
  isNew,
  onClose,
  onSave,
}: {
  place: Place;
  currency: string;
  isNew: boolean;
  onClose: () => void;
  onSave: (p: Place) => void;
}) {
  const [d, setD] = useState<Place>(place);
  const set = <K extends keyof Place>(k: K, v: Place[K]) => setD((x) => ({ ...x, [k]: v }));

  return (
    <Modal
      title={isNew ? 'Add something to see or do' : d.name || 'Edit'}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!d.name.trim()} onClick={() => onSave(d)}>
            {isNew ? 'Add' : 'Save'}
          </button>
        </>
      }
    >
      <Text
        label="Name"
        value={d.name}
        onChange={(v) => set('name', v)}
        placeholder="Real Alcázar"
        autoFocus
      />
      <div className="field-row">
        <Select
          label="Type"
          value={d.category}
          onChange={(v) => set('category', v)}
          options={CATEGORY_OPTIONS}
        />
        <Select
          label="Priority"
          value={d.priority}
          onChange={(v) => set('priority', v)}
          options={PRIORITY_OPTIONS}
        />
      </div>
      <div className="field-row">
        <Money
          label="Cost"
          value={d.cost}
          onChange={(v) => set('cost', v)}
          currency={currency}
          hint="Total for your party — 0 if free"
        />
        <Text
          label="Opening hours"
          value={d.hours}
          onChange={(v) => set('hours', v)}
          placeholder="Tue–Sun 09:30–18:00"
        />
      </div>
      <Text
        label="Address / how to get there"
        value={d.address}
        onChange={(v) => set('address', v)}
      />
      <Text label="Link" type="url" value={d.link} onChange={(v) => set('link', v)} />
      <div className="row row-wrap" style={{ gap: 18 }}>
        <Toggle
          label="Needs a timed ticket"
          checked={d.ticketNeeded}
          onChange={(v) => set('ticketNeeded', v)}
        />
        {d.ticketNeeded ? (
          <Toggle
            label="Tickets bought"
            checked={d.ticketBooked}
            onChange={(v) => set('ticketBooked', v)}
          />
        ) : null}
        <Toggle label="Already done" checked={d.done} onChange={(v) => set('done', v)} />
      </div>
      <Area
        label="Notes"
        value={d.notes}
        onChange={(v) => set('notes', v)}
        placeholder="Best time of day, which entrance, how long it takes…"
      />
    </Modal>
  );
}

/** Puts a saved restaurant or sight on a specific day of the trip. */
function ScheduleModal({
  city,
  label,
  onClose,
  onSave,
}: {
  city: City;
  label: string;
  onClose: () => void;
  onSave: (date: string, time: string, note: string) => void;
}) {
  const { data } = useStore();
  // Offer the city's own days first — that is where this almost always goes.
  const cityDays = useMemo(() => dateRange(city.arrive, city.depart), [city.arrive, city.depart]);
  const tripDays = useMemo(
    () => dateRange(data.trip.startDate, data.trip.endDate),
    [data.trip.startDate, data.trip.endDate],
  );
  const days = cityDays.length ? cityDays : tripDays;
  const [date, setDate] = useState(days[0] ?? data.trip.startDate);
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');

  return (
    <Modal
      title={`Schedule ${label}`}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!date} onClick={() => onSave(date, time, note)}>
            Add to itinerary
          </button>
        </>
      }
    >
      <Field label="Day">
        <select value={date} onChange={(e) => setDate(e.target.value)}>
          {days.map((d, i) => (
            <option key={d} value={d}>
              Day {i + 1} — {fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}
            </option>
          ))}
        </select>
      </Field>
      <div className="field-row">
        <Text label="Time (optional)" type="time" value={time} onChange={setTime} />
        <Text
          label="Note (optional)"
          value={note}
          onChange={setNote}
          placeholder="Book the 09:00 slot"
        />
      </div>
      <p className="small dim">
        This adds an entry on that day in{' '}
        <a href="#/itinerary" style={{ color: accentVar(city.accent) }}>
          Itinerary
        </a>
        . Times sort the day automatically.
      </p>
    </Modal>
  );
}
