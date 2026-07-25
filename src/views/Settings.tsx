import { useRef, useState } from 'react';
import { Area, Card, Money, Select, Text, Toggle } from '../components/ui';
import { defaultChecklist, emptyTrip, sampleTrip } from '../lib/seed';
import { DATA_VERSION, useStore } from '../lib/store';
import { daysBetween, money, pluralize, slug, todayISO } from '../lib/util';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'CHF', 'SEK', 'JPY'];

export default function Settings() {
  const { data, setTrip, load } = useStore();
  const { trip } = data;
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showFx, setShowFx] = useState(trip.fxRate > 0);

  const nights = Math.max(0, daysBetween(trip.startDate, trip.endDate));
  const counts = [
    [data.cities.length, 'city', 'cities'],
    [data.stays.length, 'stay', 'stays'],
    [data.restaurants.length, 'restaurant', 'restaurants'],
    [data.places.length, 'sight', 'sights'],
    [data.legs.length, 'transport leg', 'transport legs'],
    [data.expenses.length, 'expense', 'expenses'],
    [data.blocks.length, 'itinerary entry', 'itinerary entries'],
  ] as const;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(trip.name) || 'trip'}-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Backup downloaded.');
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object' || !('trip' in parsed)) {
          throw new Error('not a planner file');
        }
        load(parsed);
        setStatus('Trip loaded from file. Ctrl+Z puts back what was here before.');
      } catch {
        setStatus('That file could not be read as a trip. Nothing was changed.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page stack">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Settings &amp; data</h1>
          <div className="page-sub">
            The trip basics everything else is calculated from, and your backups.
          </div>
        </div>
      </div>

      <Card title="The trip">
        <div className="stack">
          <Text
            label="Trip name"
            value={trip.name}
            onChange={(v) => setTrip({ name: v })}
            placeholder="Spain, September"
          />
          <div className="field-row">
            <Text
              label="Starts"
              type="date"
              value={trip.startDate}
              onChange={(v) => setTrip({ startDate: v })}
            />
            <Text
              label="Ends"
              type="date"
              value={trip.endDate}
              onChange={(v) => setTrip({ endDate: v })}
              hint={
                trip.endDate && trip.startDate && trip.endDate < trip.startDate
                  ? '⚠ end is before the start'
                  : `${pluralize(nights, 'night')} away`
              }
            />
            <Text
              label="Travellers"
              type="number"
              min={1}
              value={String(trip.travelers)}
              onChange={(v) => setTrip({ travelers: Math.max(1, Number(v) || 1) })}
              hint="Multiplies the per-person food estimates"
            />
          </div>
          <Area
            label="Trip notes"
            value={trip.notes}
            onChange={(v) => setTrip({ notes: v })}
            placeholder="Anything that applies to the whole trip — who is coming, the shape of the route, non-negotiables…"
          />
        </div>
      </Card>

      <Card title="Money">
        <div className="stack">
          <div className="field-row">
            <Select
              label="Enter amounts in"
              value={trip.currency}
              onChange={(v) => setTrip({ currency: v })}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              hint="Spain uses EUR"
            />
            <Money
              label="Total budget"
              value={trip.budgetTotal}
              onChange={(v) => setTrip({ budgetTotal: v })}
              currency={trip.currency}
              hint="0 hides the budget meter"
            />
          </div>

          <Toggle
            label="Also show a converted total in another currency"
            checked={showFx}
            onChange={(v) => {
              setShowFx(v);
              if (!v) setTrip({ fxRate: 0 });
            }}
          />

          {showFx ? (
            <div className="field-row">
              <Select
                label="Convert to"
                value={trip.homeCurrency}
                onChange={(v) => setTrip({ homeCurrency: v })}
                options={CURRENCIES.filter((c) => c !== trip.currency).map((c) => ({
                  value: c,
                  label: c,
                }))}
              />
              <Text
                label={`1 ${trip.currency} = ? ${trip.homeCurrency}`}
                value={trip.fxRate ? String(trip.fxRate) : ''}
                onChange={(v) => setTrip({ fxRate: Number(v.replace(/[^0-9.]/g, '')) || 0 })}
                placeholder="1.08"
                hint="Typed in by hand — nothing here talks to the internet"
              />
            </div>
          ) : null}

          {trip.fxRate > 0 ? (
            <p className="small muted">
              {money(100, trip.currency, { round: true })} reads as{' '}
              {money(100 * trip.fxRate, trip.homeCurrency)} on the budget page.
            </p>
          ) : null}
        </div>
      </Card>

      <Card title="Your data" note={`format v${DATA_VERSION}`}>
        <div className="stack">
          <p className="small muted">
            This planner keeps everything in this browser's local storage on this computer — no
            account, no server, nothing leaves the machine. That also means clearing site data wipes
            it, and it will not appear on your phone. Export a backup file now and then.
          </p>

          <div className="small">
            Currently holding{' '}
            {counts
              .filter(([n]) => n > 0)
              .map(([n, one, many]) => pluralize(n, one, many))
              .join(', ') || 'nothing yet'}
            .
          </div>

          <div className="row row-wrap">
            <button className="btn btn-primary" onClick={exportJson}>
              ↓ Export backup (.json)
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              ↑ Import a backup
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importJson(file);
                e.target.value = '';
              }}
            />
            <button className="btn" onClick={() => window.print()}>
              ⎙ Print / save as PDF
            </button>
          </div>

          {status ? <div className="callout">{status}</div> : null}
        </div>
      </Card>

      <Card title="Start over">
        <div className="stack">
          <p className="small muted">
            Both of these replace everything currently in the planner. Ctrl+Z undoes it if you
            change your mind, but export a backup first if the current plan matters.
          </p>
          <div className="row row-wrap">
            <button
              className="btn"
              onClick={() => {
                load(sampleTrip());
                setStatus('Loaded a worked two-week example: Madrid → Córdoba → Seville → Granada → Valencia → Barcelona.');
              }}
            >
              Load the sample trip
            </button>
            <button
              className="btn"
              onClick={() => {
                load({ ...emptyTrip(), checklist: defaultChecklist() });
                setStatus('Cleared. Fresh trip, Spain checklist restored.');
              }}
            >
              Clear everything
            </button>
          </div>
        </div>
      </Card>

      <Card title="Shortcuts">
        <table>
          <tbody>
            <tr>
              <td className="nowrap">
                <span className="kbd">Ctrl</span> / <span className="kbd">⌘</span> +{' '}
                <span className="kbd">Z</span>
              </td>
              <td className="muted">Undo the last change (up to 40 steps)</td>
            </tr>
            <tr>
              <td className="nowrap">
                <span className="kbd">Esc</span>
              </td>
              <td className="muted">Close the open dialog</td>
            </tr>
            <tr>
              <td className="nowrap">
                <span className="kbd">Enter</span>
              </td>
              <td className="muted">Add a checklist item without leaving the keyboard</td>
            </tr>
            <tr>
              <td className="nowrap">
                <span className="kbd">Ctrl</span> + <span className="kbd">P</span>
              </td>
              <td className="muted">
                Print — the itinerary is laid out for paper, one day per row
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
