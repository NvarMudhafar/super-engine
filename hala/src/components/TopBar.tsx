import type { ReactNode } from 'react';
import { fmtNum, useI18n } from '../lib/i18n.ts';
import type { Prefs } from '../lib/prefs.ts';
import type { Snapshot } from '../lib/session.ts';
import { Logo, MoonIcon, SunIcon } from './Icons.tsx';

export function OnlinePill({ snap }: { snap: Snapshot }) {
  const { t } = useI18n();
  if (snap.conn !== 'open') {
    return (
      <span className="online-pill offline" role="status">
        <span className="dot" /> {snap.conn === 'connecting' ? t.connecting : t.offline}
      </span>
    );
  }
  return (
    <span className="online-pill" role="status" title={t.onlineTitle}>
      <span className="dot" /> {t.online(snap.online === null ? '—' : fmtNum(snap.online, t))}
    </span>
  );
}

function ThemeToggle({ prefs, setPrefs }: { prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void }) {
  const { t } = useI18n();
  const systemDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = prefs.theme ? prefs.theme === 'dark' : systemDark;
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={dark ? t.toLight : t.toDark}
      title={dark ? t.toLight : t.toDark}
      onClick={() => setPrefs({ theme: dark ? 'light' : 'dark' })}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function LangToggle({ prefs, setPrefs }: { prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="lang-btn"
      lang={prefs.lang === 'ar' ? 'en' : 'ar'}
      aria-label={t.otherLangLabel}
      title={t.otherLangLabel}
      onClick={() => setPrefs({ lang: prefs.lang === 'ar' ? 'en' : 'ar' })}
    >
      {t.otherLang}
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
  const { t } = useI18n();
  const brand = (
    <>
      <Logo /> <span className="wordmark">{t.appName}</span>
    </>
  );
  return (
    <header className="topbar">
      {onHome ? (
        <button type="button" className="brand brand-btn" onClick={onHome} aria-label={t.goHome}>
          {brand}
        </button>
      ) : (
        <span className="brand">{brand}</span>
      )}
      <div className="topbar-middle">{children}</div>
      <div className="topbar-end">
        <OnlinePill snap={snap} />
        <LangToggle prefs={prefs} setPrefs={setPrefs} />
        <ThemeToggle prefs={prefs} setPrefs={setPrefs} />
      </div>
    </header>
  );
}
