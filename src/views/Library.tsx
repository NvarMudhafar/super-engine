import { useMemo, useState } from 'react';
import { navigate } from '../App';
import { PriceTier, accentVar, dotStyle } from '../components/ui';
import { SPAIN_LIBRARY, type LibPlace, type LibraryCity, type LibRestaurant } from '../lib/seed';
import { sortedCities, useStore } from '../lib/store';
import { addDays, clsx, money, pluralize, uid } from '../lib/util';
import type { City } from '../types';

export default function Library() {
  const { data, add } = useStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(SPAIN_LIBRARY[0]?.name ?? null);
  const [toast, setToast] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return SPAIN_LIBRARY;
    return SPAIN_LIBRARY.map((city) => {
      const cityHit = `${city.name} ${city.region} ${city.blurb}`.toLowerCase().includes(q);
      if (cityHit) return city;
      const restaurants = city.restaurants.filter((r) =>
        `${r.name} ${r.cuisine} ${r.area} ${r.notes}`.toLowerCase().includes(q),
      );
      const places = city.places.filter((p) =>
        `${p.name} ${p.category} ${p.notes}`.toLowerCase().includes(q),
      );
      if (restaurants.length || places.length) return { ...city, restaurants, places };
      return null;
    }).filter((c): c is LibraryCity => c !== null);
  }, [q]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  };

  /** The trip city matching a library entry, if it has already been added. */
  const tripCityFor = (lib: LibraryCity): City | undefined =>
    data.cities.find((c) => c.name.toLowerCase() === lib.name.toLowerCase());

  const addCity = (lib: LibraryCity): City => {
    const existing = tripCityFor(lib);
    if (existing) return existing;
    const cities = sortedCities(data);
    const last = cities[cities.length - 1];
    const arrive = last?.depart || data.trip.startDate;
    const city: City = {
      id: uid(),
      name: lib.name,
      region: lib.region,
      arrive,
      depart: addDays(arrive, lib.nights),
      notes: lib.blurb,
      accent: data.cities.length % 8,
    };
    add('cities', city);
    return city;
  };

  const addRestaurant = (cityId: string, lr: LibRestaurant) => {
    add('restaurants', {
      id: uid(),
      cityId,
      name: lr.name,
      cuisine: lr.cuisine,
      area: lr.area,
      priceTier: lr.priceTier,
      mustGo: lr.mustGo,
      reservation: lr.bookAhead ? 'todo' : 'not-needed',
      reservedAt: '',
      estCostPerPerson: lr.estCostPerPerson,
      link: '',
      notes: lr.notes,
      visited: false,
    });
  };

  const addPlace = (cityId: string, lp: LibPlace) => {
    add('places', {
      id: uid(),
      cityId,
      name: lp.name,
      category: lp.category,
      priority: lp.priority,
      ticketNeeded: lp.ticketNeeded,
      ticketBooked: false,
      cost: lp.cost,
      hours: lp.hours,
      address: '',
      link: '',
      notes: lp.notes,
      done: false,
    });
  };

  return (
    <div className="page stack">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Spain picks</h1>
          <div className="page-sub">
            Ten cities, hand-picked places to eat and things to see. Add a whole city with its
            highlights, or cherry-pick. Everything lands in your own lists, where you can edit it.
          </div>
        </div>
        <div className="page-actions" style={{ minWidth: 220 }}>
          <div className="search" style={{ flex: 1 }}>
            <input
              value={query}
              placeholder="Search cities, food, sights…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="muted">
          Nothing matches “{query}”. Try “tapas”, “viewpoint”, “Gaudí” or a city name.
        </p>
      ) : null}

      <div className="stack">
        {matches.map((lib) => {
          const tripCity = tripCityFor(lib);
          const isOpen = open === lib.name || Boolean(q);
          const haveEat = new Set(
            data.restaurants
              .filter((r) => r.cityId === tripCity?.id)
              .map((r) => r.name.toLowerCase()),
          );
          const haveSee = new Set(
            data.places.filter((p) => p.cityId === tripCity?.id).map((p) => p.name.toLowerCase()),
          );
          const accent = accentVar(tripCity?.accent ?? 0);

          return (
            <div
              className="lib-city"
              key={lib.name}
              style={{ ...dotStyle(tripCity?.accent ?? 0), borderTop: `3px solid ${accent}` }}
            >
              <button
                className="lib-head"
                onClick={() => setOpen(isOpen && !q ? null : lib.name)}
                aria-expanded={isOpen}
              >
                <span className={clsx('chev', isOpen && 'open')} aria-hidden="true">
                  ▸
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <h2>{lib.name}</h2>
                    {tripCity ? <span className="badge badge-good">in your trip</span> : null}
                  </div>
                  <div className="small muted">
                    {lib.region} · suggested {pluralize(lib.nights, 'night')} ·{' '}
                    {lib.restaurants.length} places to eat · {lib.places.length} to see
                  </div>
                </div>
              </button>

              {isOpen ? (
                <div className="lib-body">
                  <p className="item-notes" style={{ padding: '12px 0' }}>
                    {lib.blurb}
                  </p>

                  <div className="row row-wrap" style={{ marginBottom: 14 }}>
                    {tripCity ? (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            let n = 0;
                            for (const lr of lib.restaurants) {
                              if (!haveEat.has(lr.name.toLowerCase())) {
                                addRestaurant(tripCity.id, lr);
                                n++;
                              }
                            }
                            for (const lp of lib.places) {
                              if (!haveSee.has(lp.name.toLowerCase())) {
                                addPlace(tripCity.id, lp);
                                n++;
                              }
                            }
                            flash(
                              n
                                ? `Added ${pluralize(n, 'pick')} to ${lib.name}`
                                : `${lib.name} already has all of these`,
                            );
                          }}
                        >
                          + Add everything not already there
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => navigate(`#/cities/${tripCity.id}`)}
                        >
                          Open {lib.name} →
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            const city = addCity(lib);
                            for (const lr of lib.restaurants.filter((x) => x.mustGo)) {
                              addRestaurant(city.id, lr);
                            }
                            for (const lp of lib.places.filter((x) => x.priority === 'must')) {
                              addPlace(city.id, lp);
                            }
                            flash(`${lib.name} added with its highlights`);
                          }}
                        >
                          + Add {lib.name} with highlights
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            const city = addCity(lib);
                            for (const lr of lib.restaurants) addRestaurant(city.id, lr);
                            for (const lp of lib.places) addPlace(city.id, lp);
                            flash(`${lib.name} added with everything`);
                          }}
                        >
                          + Add with everything
                        </button>
                        <button className="btn btn-sm" onClick={() => { addCity(lib); flash(`${lib.name} added`); }}>
                          + City only
                        </button>
                      </>
                    )}
                  </div>

                  <div className="grid grid-2">
                    <div>
                      <div className="section-head">
                        <h2>Eat &amp; drink</h2>
                      </div>
                      {lib.restaurants.map((lr) => {
                        const added = haveEat.has(lr.name.toLowerCase());
                        return (
                          <div className="pick" key={lr.name}>
                            <div className="pick-main">
                              <div className="item-title">
                                {lr.name}
                                {lr.mustGo ? <span className="badge badge-gold">★</span> : null}
                                {lr.bookAhead ? (
                                  <span className="badge badge-warn">book ahead</span>
                                ) : null}
                              </div>
                              <div className="item-meta row row-wrap" style={{ gap: 7 }}>
                                <PriceTier tier={lr.priceTier} />
                                <span>{lr.cuisine}</span>
                                <span className="dim">· {lr.area}</span>
                                <span className="dim">
                                  · ~{money(lr.estCostPerPerson, 'EUR', { round: true })} pp
                                </span>
                              </div>
                              <div className="item-notes">{lr.notes}</div>
                            </div>
                            <button
                              className={clsx('btn btn-sm', !added && 'btn-primary')}
                              disabled={added}
                              onClick={() => {
                                const city = tripCity ?? addCity(lib);
                                addRestaurant(city.id, lr);
                                flash(`${lr.name} added to ${city.name}`);
                              }}
                            >
                              {added ? '✓ added' : '+ Add'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <div className="section-head">
                        <h2>See &amp; do</h2>
                      </div>
                      {lib.places.map((lp) => {
                        const added = haveSee.has(lp.name.toLowerCase());
                        return (
                          <div className="pick" key={lp.name}>
                            <div className="pick-main">
                              <div className="item-title">
                                {lp.name}
                                {lp.priority === 'must' ? (
                                  <span className="badge badge-accent">must</span>
                                ) : null}
                                {lp.ticketNeeded ? (
                                  <span className="badge badge-warn">timed ticket</span>
                                ) : null}
                              </div>
                              <div className="item-meta">
                                {lp.category}
                                {lp.cost > 0
                                  ? ` · ${money(lp.cost, 'EUR', { round: true })}`
                                  : ' · free'}
                                {lp.hours ? ` · ${lp.hours}` : ''}
                              </div>
                              <div className="item-notes">{lp.notes}</div>
                            </div>
                            <button
                              className={clsx('btn btn-sm', !added && 'btn-primary')}
                              disabled={added}
                              onClick={() => {
                                const city = tripCity ?? addCity(lib);
                                addPlace(city.id, lp);
                                flash(`${lp.name} added to ${city.name}`);
                              }}
                            >
                              {added ? '✓ added' : '+ Add'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="small dim">
        Prices are rough per-person guides in euros and drift over time — treat them as ballpark,
        and check opening hours before you build a day around one. Anything marked “book ahead” or
        “timed ticket” really does need doing before you fly.
      </p>

      {toast ? (
        <div className="toast" role="status">
          {toast}
          <button onClick={() => navigate('#/cities')}>View cities</button>
        </div>
      ) : null}
    </div>
  );
}
