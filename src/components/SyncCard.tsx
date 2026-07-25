import { useEffect, useState } from 'react';
import { Card, Field, SegmentedControl, Toggle } from './ui';
import { useStore } from '../lib/store';
import {
  COLLECTION_LABEL,
  decodeTrip,
  encodeTrip,
  mergeTrips,
  summarize,
  tripSettingsWouldTransfer,
  type MergeReport,
} from '../lib/transfer';
import type { TripData } from '../types';

/** Links much beyond this get mangled by chat apps and mail clients. */
const LINK_SAFE_LIMIT = 8000;

type Mode = 'send' | 'receive';

export default function SyncCard({ incomingCode }: { incomingCode?: string }) {
  const { data, load } = useStore();
  const [mode, setMode] = useState<Mode>(incomingCode ? 'receive' : 'send');

  return (
    <Card
      title="Move this plan to another device"
      note="phone ↔ computer"
      actions={
        <SegmentedControl
          ariaLabel="Send or receive"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'send', label: 'Send' },
            { value: 'receive', label: 'Receive' },
          ]}
        />
      }
    >
      <div className="stack">
        <p className="small muted">
          There is no server behind this planner, so devices do not sync on their own. Instead you
          carry the plan across as a code, then merge it in. Merging is safe both ways: for every
          hotel, restaurant, sight and note, the version you edited most recently wins, and anything
          you deleted stays deleted.
        </p>
        {mode === 'send' ? (
          <SendPanel data={data} />
        ) : (
          <ReceivePanel onLoad={load} mine={data} incomingCode={incomingCode} />
        )}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------------- send */

function SendPanel({ data }: { data: TripData }) {
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const token = await encodeTrip(data);
      setCode(token);
      const base = window.location.href.split('#')[0];
      setLink(`${base}#/receive/${token}`);
    } catch {
      setError('Could not pack this trip. Use Export backup below instead.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? '' : c)), 2200);
    } catch {
      setError('This browser blocked the clipboard — select the text and copy it by hand.');
    }
  };

  if (!code) {
    return (
      <div className="row row-wrap">
        <button className="btn btn-primary" onClick={generate} disabled={busy}>
          {busy ? 'Packing…' : 'Create a transfer code'}
        </button>
        <span className="small dim">Holds {summarize(data)}.</span>
        {error ? <span className="small" style={{ color: 'var(--bad)' }}>{error}</span> : null}
      </div>
    );
  }

  const linkTooLong = link.length > LINK_SAFE_LIMIT;

  return (
    <div className="stack">
      {!linkTooLong ? (
        <Field label="1 · Send yourself this link">
          <textarea readOnly value={link} rows={3} className="mono" onFocus={(e) => e.target.select()} />
          <span className="field-hint">
            Message or email it to yourself, open it on the other device, and the planner offers to
            merge. {(link.length / 1024).toFixed(1)} kB.
          </span>
        </Field>
      ) : (
        <div className="callout">
          <span aria-hidden="true">⚠</span>
          <span>
            This plan is {(code.length / 1024).toFixed(0)} kB — too big to survive as a link in most
            messaging apps. Use the code below, or Export a backup file.
          </span>
        </div>
      )}

      <Field label={linkTooLong ? 'Copy this code' : '2 · Or copy the code on its own'}>
        <textarea readOnly value={code} rows={4} className="mono" onFocus={(e) => e.target.select()} />
        <span className="field-hint">
          Paste it into the Receive tab on the other device. Works over AirDrop, Notes, anything that
          carries text.
        </span>
      </Field>

      <div className="row row-wrap">
        {!linkTooLong ? (
          <button className="btn btn-primary" onClick={() => copy(link, 'link')}>
            {copied === 'link' ? '✓ Link copied' : 'Copy link'}
          </button>
        ) : null}
        <button
          className={linkTooLong ? 'btn btn-primary' : 'btn'}
          onClick={() => copy(code, 'code')}
        >
          {copied === 'code' ? '✓ Code copied' : 'Copy code'}
        </button>
        <button className="btn btn-ghost" onClick={() => { setCode(''); setLink(''); }}>
          Start again
        </button>
      </div>
      {error ? <p className="small" style={{ color: 'var(--bad)' }}>{error}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ receive */

function ReceivePanel({
  mine,
  onLoad,
  incomingCode,
}: {
  mine: TripData;
  onLoad: (d: TripData) => void;
  incomingCode?: string;
}) {
  const [input, setInput] = useState(incomingCode ?? '');
  const [incoming, setIncoming] = useState<TripData | null>(null);
  const [report, setReport] = useState<MergeReport | null>(null);
  const [error, setError] = useState('');
  const [takeTripSettings, setTakeTripSettings] = useState(false);

  const read = async (token: string) => {
    setError('');
    setReport(null);
    try {
      const parsed = await decodeTrip(token);
      // Pre-tick only when the timestamps already say the other side is newer.
      setTakeTripSettings(tripSettingsWouldTransfer(mine, parsed));
      setIncoming(parsed);
    } catch (e) {
      setIncoming(null);
      setError(e instanceof Error ? e.message : 'That code could not be read.');
    }
  };

  const inspect = () => read(input);

  // Arriving from a transfer link: decode straight away so the viewer lands on
  // the merge choice rather than staring at a wall of base64.
  useEffect(() => {
    if (incomingCode) void read(incomingCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCode]);

  if (report) {
    return <MergeSummary report={report} onDone={() => { setReport(null); setIncoming(null); setInput(''); }} />;
  }

  if (incoming) {
    const preview = mergeTrips(mine, incoming, { takeTripSettings }).report;
    const settingsDiffer =
      incoming.trip.name !== mine.trip.name ||
      incoming.trip.startDate !== mine.trip.startDate ||
      incoming.trip.endDate !== mine.trip.endDate ||
      incoming.trip.budgetTotal !== mine.trip.budgetTotal ||
      incoming.trip.travelers !== mine.trip.travelers;

    return (
      <div className="stack">
        <div className="callout">
          <span aria-hidden="true">✓</span>
          <span>
            Read <strong>{incoming.trip.name || 'an untitled trip'}</strong> — holds{' '}
            {summarize(incoming)}.
          </span>
        </div>

        <div className="small">
          Merging would add <strong>{preview.added}</strong>, update{' '}
          <strong>{preview.updated}</strong> and remove <strong>{preview.removed}</strong> records
          here.
        </div>

        {settingsDiffer ? (
          <div className="stack-sm">
            <Toggle
              label="Also take the trip name, dates, party size and budget"
              checked={takeTripSettings}
              onChange={setTakeTripSettings}
            />
            <p className="small dim" style={{ margin: 0 }}>
              Incoming: {incoming.trip.name || 'untitled'}, {incoming.trip.startDate} →{' '}
              {incoming.trip.endDate}, {incoming.trip.travelers} travelling, budget{' '}
              {incoming.trip.budgetTotal || 0}. Yours: {mine.trip.name || 'untitled'},{' '}
              {mine.trip.startDate} → {mine.trip.endDate}, {mine.trip.travelers} travelling, budget{' '}
              {mine.trip.budgetTotal || 0}.
            </p>
          </div>
        ) : null}

        <div className="row row-wrap">
          <button
            className="btn btn-primary"
            onClick={() => {
              const { merged, report: r } = mergeTrips(mine, incoming, { takeTripSettings });
              onLoad(merged);
              setReport(r);
            }}
          >
            Merge into this device
          </button>
          <button
            className="btn"
            onClick={() => {
              onLoad(incoming);
              setReport({ added: 0, updated: 0, removed: 0, tripSettingsTaken: true, detail: [] });
            }}
          >
            Replace everything here
          </button>
          <button className="btn btn-ghost" onClick={() => setIncoming(null)}>
            Cancel
          </button>
        </div>
        <p className="small dim">
          Merge keeps both sides and is what you want almost always. Replace throws away this
          device's plan. Either way, Ctrl+Z undoes it.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <Field label="Paste a transfer code or link">
        <textarea
          value={input}
          rows={4}
          className="mono"
          placeholder="ESP1.z…"
          onChange={(e) => setInput(e.target.value)}
        />
      </Field>
      <div className="row row-wrap">
        <button className="btn btn-primary" disabled={!input.trim()} onClick={inspect}>
          Read code
        </button>
        {error ? <span className="small" style={{ color: 'var(--bad)' }}>{error}</span> : null}
      </div>
    </div>
  );
}

function MergeSummary({ report, onDone }: { report: MergeReport; onDone: () => void }) {
  return (
    <div className="stack">
      <div className="callout" style={{ borderLeftColor: 'var(--good)' }}>
        <span aria-hidden="true">✓</span>
        <span>
          Done — {report.added} added, {report.updated} updated, {report.removed} removed.
          {report.tripSettingsTaken ? ' Trip settings came from the other device.' : ''}
        </span>
      </div>
      {report.detail.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>What</th>
                <th className="num">Added</th>
                <th className="num">Updated</th>
                <th className="num">Removed</th>
              </tr>
            </thead>
            <tbody>
              {report.detail.map((d) => (
                <tr key={d.key}>
                  <td>{COLLECTION_LABEL[d.key]}</td>
                  <td className="num">{d.added || '—'}</td>
                  <td className="num">{d.updated || '—'}</td>
                  <td className="num">{d.removed || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="row">
        <button className="btn" onClick={onDone}>
          Done
        </button>
        <a className="btn btn-primary" href="#/overview">
          See the trip
        </a>
      </div>
    </div>
  );
}
