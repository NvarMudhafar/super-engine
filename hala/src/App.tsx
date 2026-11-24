import { useCallback, useEffect, useMemo, useState } from 'react';
import { PLACES } from '../shared/interests.ts';
import { ChatScreen } from './components/ChatScreen.tsx';
import { Home } from './components/Home.tsx';
import { Logo } from './components/Icons.tsx';
import { attention } from './lib/attention.ts';
import { DICTS, fmtNum, I18nContext, useI18n } from './lib/i18n.ts';
import { applyLang, applyTheme, loadPrefs, savePrefs, type Prefs } from './lib/prefs.ts';
import { session, useSession, type Snapshot } from './lib/session.ts';

function Toast({ toast }: { toast: Snapshot['toast'] }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => session.dismissToast(), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id} onClick={() => session.dismissToast()}>
      {t.toasts[toast.code]}
    </div>
  );
}

function Banned({ ban }: { ban: NonNullable<Snapshot['ban']> }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, ban.until - now);
  const hours = Math.floor(left / 3600_000);
  const minutes = Math.ceil((left % 3600_000) / 60_000);
  const when =
    left <= 0
      ? t.whenNow
      : hours > 0
        ? t.whenHours(fmtNum(hours, t), fmtNum(minutes, t))
        : t.whenMinutes(fmtNum(minutes, t));

  return (
    <div className="banned-page">
      <div className="card banned-card">
        <Logo size={44} />
        <h1>{t.bannedTitle}</h1>
        <p>{t.banReason[ban.reason]}</p>
        <p>{t.canChatAgain(when)}</p>
        <p className="muted">{t.bannedExplain}</p>
        {left <= 0 && (
          <button type="button" className="btn primary" onClick={() => location.reload()}>
            {t.tryAgain}
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

  const i18n = useMemo(() => ({ t: DICTS[prefs.lang], lang: prefs.lang }), [prefs.lang]);

  useEffect(() => applyTheme(prefs.theme), [prefs.theme]);
  useEffect(() => {
    const t = i18n.t;
    applyLang(i18n.lang, t.dir);
    attention.setWords({ base: t.docTitle, stranger: t.newStranger, message: t.newMessage });
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.lede);
  }, [i18n]);
  useEffect(() => {
    session.relayOnly = prefs.relayOnly;
  }, [prefs.relayOnly]);
  useEffect(() => session.connect(), []);

  const start = (mode: Parameters<typeof session.start>[0]) => {
    // Your city is matched like any other interest, and goes first so it is never cut off.
    const place = PLACES.find((p) => p.key === prefs.city);
    const interests = place ? [place[prefs.lang], ...prefs.interests] : prefs.interests;
    void session.start(mode, interests, prefs.fallback);
  };

  let screen;
  if (snap.phase === 'banned' && snap.ban) screen = <Banned ban={snap.ban} />;
  else if (snap.phase === 'idle' || (snap.phase === 'camera' && snap.mode === 'video' && !snap.localStream)) {
    screen = <Home snap={snap} prefs={prefs} setPrefs={setPrefs} onStart={start} />;
  } else screen = <ChatScreen snap={snap} prefs={prefs} setPrefs={setPrefs} />;

  return (
    <I18nContext.Provider value={i18n}>
      {screen}
      <Toast toast={snap.toast} />
    </I18nContext.Provider>
  );
}
