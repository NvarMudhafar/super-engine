import type { ReactNode } from 'react';
import type { Prefs } from '../lib/prefs.ts';
import type { Snapshot } from '../lib/session.ts';
import { Logo, MoonIcon, SunIcon } from './Icons.tsx';

export function OnlinePill({ snap }: { snap: Snapshot }) {
  if (snap.conn !== 'open') {
    return (
      <span className="online-pill offline" role="status">
        <span className="dot" /> {snap.conn === 'connecting' ? 'Connecting…' : 'Offline — retrying'}
      </span>
    );
  }
  return (
    <span className="online-pill" role="status" title="People connected right now">
      <span className="dot" /> {snap.online === null ? '—' : snap.online.toLocaleString()} online
    </span>
  );
}

export function ThemeToggle({ prefs, setPrefs }: { prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void }) {
  const systemDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = prefs.theme ? prefs.theme === 'dark' : systemDark;
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
      onClick={() => setPrefs({ theme: dark ? 'light' : 'dark' })}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export function TopBar({
  snap,
  prefs,
  setPrefs,
  onHome,
  children,
}: {
  snap: Snapshot;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  onHome?: () => void;
  children?: ReactNode;
}) {
  const brand = (
    <>
      <Logo /> <span className="wordmark">hullo</span>
    </>
  );
  return (
    <header className="topbar">
      {onHome ? (
        <button type="button" className="brand brand-btn" onClick={onHome} aria-label="Leave and go home">
          {brand}
        </button>
      ) : (
        <span className="brand">{brand}</span>
      )}
      <div className="topbar-middle">{children}</div>
      <div className="topbar-end">
        <OnlinePill snap={snap} />
        <ThemeToggle prefs={prefs} setPrefs={setPrefs} />
      </div>
    </header>
  );
}
