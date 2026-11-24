import { useState } from 'react';
import { LIMITS, type Mode } from '../../shared/protocol.ts';
import { PLACES } from '../../shared/interests.ts';
import { fmtNum, useI18n } from '../lib/i18n.ts';
import type { Prefs } from '../lib/prefs.ts';
import type { Snapshot } from '../lib/session.ts';
import { RulesDialog } from './Dialogs.tsx';
import { InterestInput } from './InterestInput.tsx';
import { ChatIcon, EyeOffIcon, FlagIcon, MatchIcon, PinIcon, ShieldIcon, TeaScene, VideoIcon } from './Icons.tsx';
import { TopBar } from './TopBar.tsx';

const PROMISE_ICONS = [MatchIcon, EyeOffIcon, FlagIcon, ShieldIcon];

export function Home({
  snap,
  prefs,
  setPrefs,
  onStart,
}: {
  snap: Snapshot;
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  onStart: (mode: Mode) => void;
}) {
  const { t, lang } = useI18n();
  const [rules, setRules] = useState(false);
  const [nudge, setNudge] = useState(false);
  const busy = snap.phase === 'camera';
  const offline = snap.conn !== 'open';
  const seconds = fmtNum(Math.round(snap.widenAfterMs / 1000), t);
  const places = [...PLACES].sort((a, b) => a[lang].localeCompare(b[lang], t.locale));

  const start = (mode: Mode) => {
    if (!prefs.agreed) {
      setNudge(true);
      document.getElementById('consent')?.focus();
      return;
    }
    onStart(mode);
  };

  return (
    <div className="home-page">
      <TopBar snap={snap} prefs={prefs} setPrefs={setPrefs} />

      <main className="home">
        <section className="hero">
          <TeaScene />
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>
            {t.heroBefore}
            <span className="accent-word">{t.heroAccent}</span>
            {t.heroAfter}
          </h1>
          <p className="lede">{t.lede}</p>
        </section>

        <section className="card start-card" aria-label={t.textChat}>
          <label className="field-label" htmlFor="interest-input">
            {t.interestsLabel} <span className="muted">{t.optional}</span>
          </label>
          <InterestInput
            value={prefs.interests}
            onChange={(interests) => setPrefs({ interests })}
            max={LIMITS.interests - 1}
          />

          <label className="field-label city-label" htmlFor="city">
            {t.cityLabel} <span className="muted">{t.optional}</span>
          </label>
          <div className="select-wrap">
            <PinIcon size={18} />
            <select id="city" value={prefs.city ?? ''} onChange={(e) => setPrefs({ city: e.target.value || null })}>
              <option value="">{t.cityAny}</option>
              {places.map((p) => (
                <option key={p.key} value={p.key}>
                  {p[lang]}
                </option>
              ))}
            </select>
          </div>
          {prefs.city && <p className="hint">{t.cityHint}</p>}

          {(prefs.interests.length > 0 || prefs.city) && (
            <label className="check">
              <input type="checkbox" checked={prefs.fallback} onChange={(e) => setPrefs({ fallback: e.target.checked })} />
              <span>{t.fallback(seconds)}</span>
            </label>
          )}

          <div className="divider" />

          <label className={`check consent${nudge && !prefs.agreed ? ' attention' : ''}`}>
            <input
              id="consent"
              type="checkbox"
              checked={prefs.agreed}
              onChange={(e) => {
                setPrefs({ agreed: e.target.checked });
                setNudge(false);
              }}
            />
            <span>
              {t.consentBefore}
              <button type="button" className="link" onClick={() => setRules(true)}>
                {t.consentLink}
              </button>
              {t.consentAfter}
            </span>
          </label>
          {nudge && !prefs.agreed && (
            <p className="hint warn" role="alert">
              {t.consentNudge}
            </p>
          )}

          <div className="start-buttons">
            <button type="button" className="btn primary lg" onClick={() => start('text')} disabled={busy || offline}>
              <ChatIcon /> {t.textChat}
            </button>
            <button type="button" className="btn primary lg" onClick={() => start('video')} disabled={busy || offline}>
              <VideoIcon /> {busy ? t.startingCamera : t.videoChat}
            </button>
          </div>
          {offline && <p className="hint">{t.connectingServer}</p>}
          {snap.cameraError && (
            <p className="hint warn" role="alert">
              {t.camera[snap.cameraError]}
            </p>
          )}

          <details className="video-options">
            <summary>{t.videoOptions}</summary>
            <label className="check">
              <input type="checkbox" checked={prefs.blurVideo} onChange={(e) => setPrefs({ blurVideo: e.target.checked })} />
              <span>{t.blurOption}</span>
            </label>
            {snap.relayAvailable ? (
              <label className="check">
                <input type="checkbox" checked={prefs.relayOnly} onChange={(e) => setPrefs({ relayOnly: e.target.checked })} />
                <span>{t.relayOption}</span>
              </label>
            ) : (
              <p className="hint">{t.noRelayHint}</p>
            )}
          </details>
        </section>

        <ul className="promises">
          {t.promises.map(([title, body], i) => {
            const Icon = PROMISE_ICONS[i];
            return (
              <li key={title}>
                <span className="promise-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="home-foot">
        <button type="button" className="link" onClick={() => setRules(true)}>
          {t.footRules}
        </button>
        <span aria-hidden="true">·</span>
        <span>{t.footKind}</span>
      </footer>

      <RulesDialog open={rules} onClose={() => setRules(false)} />
    </div>
  );
}
