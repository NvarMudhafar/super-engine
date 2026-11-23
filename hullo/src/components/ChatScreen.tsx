import { useCallback, useEffect, useRef, useState } from 'react';
import type { Prefs } from '../lib/prefs.ts';
import { session, type Snapshot } from '../lib/session.ts';
import { ReportDialog } from './Dialogs.tsx';
import { Composer } from './Composer.tsx';
import { FlagIcon } from './Icons.tsx';
import { MessageList } from './MessageList.tsx';
import { TopBar } from './TopBar.tsx';
import { VideoStage } from './VideoStage.tsx';

function Elapsed({ since }: { since: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((Date.now() - since) / 1000));
  return (
    <span className="elapsed">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </span>
  );
}

function Status({ snap }: { snap: Snapshot }) {
  if (snap.phase === 'chatting') {
    return (
      <span className="status live">
        <span className="dot" /> Chatting {snap.startedAt && <Elapsed since={snap.startedAt} />}
      </span>
    );
  }
  if (snap.phase === 'ended') return <span className="status">Chat ended</span>;
  return (
    <span className="status searching-status">
      <span className="spinner small" aria-hidden="true" /> Looking…
    </span>
  );
}

export function ChatScreen({ snap, prefs, setPrefs }: { snap: Snapshot; prefs: Prefs; setPrefs: (p: Partial<Prefs>) => void }) {
  const [reporting, setReporting] = useState(false);
  const [revealed, setRevealed] = useState(!prefs.blurVideo);
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<number>();

  // Every new stranger starts blurred again (if that's the setting).
  useEffect(() => {
    setRevealed(!prefs.blurVideo);
    setConfirming(false);
  }, [snap.matchId, prefs.blurVideo]);

  // A report dialog left open after the chat is no longer reportable is stale.
  useEffect(() => {
    if (!snap.reportable) setReporting(false);
  }, [snap.reportable]);

  const primary = useCallback(
    (fromKeyboard: boolean) => {
      window.clearTimeout(confirmTimer.current);
      if (snap.phase === 'searching' || snap.phase === 'camera') {
        if (!fromKeyboard) session.stop();
        return;
      }
      if (snap.phase === 'ended') {
        session.next();
        return;
      }
      // Skipping a live chat from the keyboard takes two presses, so a stray Esc doesn't cost you a conversation.
      if (fromKeyboard && !confirming) {
        setConfirming(true);
        confirmTimer.current = window.setTimeout(() => setConfirming(false), 2500);
        return;
      }
      setConfirming(false);
      session.next();
    },
    [snap.phase, confirming],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      primary(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [primary]);

  return (
    <div className={`chat-page mode-${snap.mode}`}>
      <TopBar snap={snap} prefs={prefs} setPrefs={setPrefs} onHome={() => session.stop()}>
        <Status snap={snap} />
        {snap.reportable && snap.phase === 'chatting' && (
          <button type="button" className="btn ghost small danger-text report-btn" onClick={() => setReporting(true)}>
            <FlagIcon size={16} /> <span>Report</span>
          </button>
        )}
      </TopBar>

      <div className="chat-body">
        {snap.mode === 'video' && <VideoStage snap={snap} revealed={revealed} setRevealed={setRevealed} />}
        <section className="conversation" aria-label="Conversation">
          <MessageList snap={snap} onReport={() => setReporting(true)} />
          <Composer snap={snap} confirming={confirming} onPrimary={() => primary(false)} />
        </section>
      </div>

      <ReportDialog
        open={reporting}
        onClose={() => setReporting(false)}
        onReport={(reason, note) => {
          session.report(reason, note);
          setReporting(false);
        }}
        onBlock={() => {
          session.block();
          setReporting(false);
        }}
      />
    </div>
  );
}
