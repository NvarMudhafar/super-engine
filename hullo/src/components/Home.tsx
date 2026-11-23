import { useState } from 'react';
import type { Mode } from '../../shared/protocol.ts';
import type { Prefs } from '../lib/prefs.ts';
import type { Snapshot } from '../lib/session.ts';
import { RulesDialog } from './Dialogs.tsx';
import { InterestInput } from './InterestInput.tsx';
import { ChatIcon, EyeOffIcon, FlagIcon, ShieldIcon, SparkIcon, VideoIcon } from './Icons.tsx';
import { TopBar } from './TopBar.tsx';

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
  const [rules, setRules] = useState(false);
  const [nudge, setNudge] = useState(false);
  const busy = snap.phase === 'camera';
  const offline = snap.conn !== 'open';
  const seconds = Math.round(snap.widenAfterMs / 1000);

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
          <h1>
            Talk to someone <span className="accent-word">new</span>.
          </h1>
          <p className="lede">
            One-on-one chats with a random stranger, matched on what you're into. Text or video — no account, nothing to
            install.
          </p>
        </section>

        <section className="card start-card" aria-label="Start a chat">
          <label className="field-label" htmlFor="interest-input">
            What are you into? <span className="muted">Optional</span>
          </label>
          <InterestInput value={prefs.interests} onChange={(interests) => setPrefs({ interests })} />

          {prefs.interests.length > 0 && (
            <label className="check">
              <input type="checkbox" checked={prefs.fallback} onChange={(e) => setPrefs({ fallback: e.target.checked })} />
              <span>
                If nobody shares these, match me with anyone after {seconds} seconds
              </span>
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
              I'm 18 or older and I'll follow the{' '}
              <button type="button" className="link" onClick={() => setRules(true)}>
                house rules
              </button>
              .
            </span>
          </label>
          {nudge && !prefs.agreed && (
            <p className="hint warn" role="alert">
              Please confirm you're 18+ and agree to the rules first.
            </p>
          )}

          <div className="start-buttons">
            <button type="button" className="btn primary lg" onClick={() => start('text')} disabled={busy || offline}>
              <ChatIcon /> Text chat
            </button>
            <button type="button" className="btn primary lg" onClick={() => start('video')} disabled={busy || offline}>
              <VideoIcon /> {busy ? 'Starting camera…' : 'Video chat'}
            </button>
          </div>
          {offline && <p className="hint">Connecting to the server…</p>}
          {snap.cameraError && (
            <p className="hint warn" role="alert">
              {snap.cameraError}
            </p>
          )}

          <details className="video-options">
            <summary>Video options</summary>
            <label className="check">
              <input type="checkbox" checked={prefs.blurVideo} onChange={(e) => setPrefs({ blurVideo: e.target.checked })} />
              <span>Blur each new stranger's video until I choose to show it</span>
            </label>
            {snap.relayAvailable ? (
              <label className="check">
                <input type="checkbox" checked={prefs.relayOnly} onChange={(e) => setPrefs({ relayOnly: e.target.checked })} />
                <span>Hide my IP address from strangers (relays video through the server)</span>
              </label>
            ) : (
              <p className="hint">
                Video connects directly between your browsers, so the other person's browser can see your IP address. This
                server doesn't offer a relay to hide it.
              </p>
            )}
          </details>
        </section>

        <ul className="promises">
          <li>
            <SparkIcon />
            <div>
              <strong>Matched on interests</strong>
              <span>People who share a tag are paired first. Random only if you allow it.</span>
            </div>
          </li>
          <li>
            <EyeOffIcon />
            <div>
              <strong>Video starts blurred</strong>
              <span>You decide when to see a stranger's camera, every time.</span>
            </div>
          </li>
          <li>
            <FlagIcon />
            <div>
              <strong>One-tap report and block</strong>
              <span>People reported by several others are removed automatically.</span>
            </div>
          </li>
          <li>
            <ShieldIcon />
            <div>
              <strong>No accounts, no history</strong>
              <span>Chats aren't stored. Spam bots get caught and kicked.</span>
            </div>
          </li>
        </ul>
      </main>

      <footer className="home-foot">
        <button type="button" className="link" onClick={() => setRules(true)}>
          House rules & privacy
        </button>
        <span aria-hidden="true">·</span>
        <span>Be kind. Leave if it's not for you.</span>
      </footer>

      <RulesDialog open={rules} onClose={() => setRules(false)} />
    </div>
  );
}
