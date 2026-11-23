import { useCallback, useEffect, useState } from 'react';
import { ChatScreen } from './components/ChatScreen.tsx';
import { Home } from './components/Home.tsx';
import { Logo } from './components/Icons.tsx';
import { applyTheme, loadPrefs, savePrefs, type Prefs } from './lib/prefs.ts';
import { session, useSession, type Snapshot } from './lib/session.ts';

function Toast({ toast }: { toast: Snapshot['toast'] }) {
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => session.dismissToast(), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id} onClick={() => session.dismissToast()}>
      {toast.text}
    </div>
  );
}

function Banned({ ban }: { ban: NonNullable<Snapshot['ban']> }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, ban.until - now);
  const hours = Math.floor(left / 3600_000);
  const minutes = Math.ceil((left % 3600_000) / 60_000);
  const when = left <= 0 ? 'now' : hours > 0 ? `in about ${hours}h ${minutes}m` : `in about ${minutes} minutes`;

  return (
    <div className="banned-page">
      <div className="card banned-card">
        <Logo size={40} />
        <h1>You're taking a break from hullo</h1>
        <p>
          Your connection was paused{ban.reason ? <> for: <strong>{ban.reason.toLowerCase()}</strong></> : null}. You can chat
          again {when}.
        </p>
        <p className="muted">
          This happens automatically when several different people report the same person, or when something behaves like
          a spam bot.
        </p>
        {left <= 0 && (
          <button type="button" className="btn primary" onClick={() => location.reload()}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function App() {
  const snap = useSession();
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  useEffect(() => applyTheme(prefs.theme), [prefs.theme]);
  useEffect(() => {
    session.relayOnly = prefs.relayOnly;
  }, [prefs.relayOnly]);
  useEffect(() => session.connect(), []);

  let screen;
  if (snap.phase === 'banned' && snap.ban) screen = <Banned ban={snap.ban} />;
  else if (snap.phase === 'idle' || (snap.phase === 'camera' && snap.mode === 'video' && !snap.localStream)) {
    screen = (
      <Home
        snap={snap}
        prefs={prefs}
        setPrefs={setPrefs}
        onStart={(mode) => void session.start(mode, prefs.interests, prefs.fallback)}
      />
    );
  } else screen = <ChatScreen snap={snap} prefs={prefs} setPrefs={setPrefs} />;

  return (
    <>
      {screen}
      <Toast toast={snap.toast} />
    </>
  );
}
