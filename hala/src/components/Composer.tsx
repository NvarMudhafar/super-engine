import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { LIMITS } from '../../shared/protocol.ts';
import { icebreaker } from '../lib/icebreakers.ts';
import { fmtNum, useI18n } from '../lib/i18n.ts';
import { session, type Snapshot } from '../lib/session.ts';
import { BulbIcon, NextIcon, SendIcon } from './Icons.tsx';

const finePointer = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches;

export function Composer({
  snap,
  confirming,
  onPrimary,
}: {
  snap: Snapshot;
  confirming: boolean;
  onPrimary: () => void;
}) {
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const live = snap.phase === 'chatting';

  // Fresh stranger, fresh draft — and the cursor ready to type (where there's a keyboard).
  useEffect(() => {
    setDraft('');
    if (live && finePointer()) box.current?.focus();
  }, [snap.matchId, live]);

  const placeholder = live ? t.composerLive : snap.phase === 'ended' ? t.composerEnded : t.composerWaiting;

  // Grow with the text, up to a limit. An empty box sizes to one line, not to a wrapped placeholder.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    if (draft) el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft, placeholder]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || !live) return;
    session.say(draft);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  let label = t.next;
  let variant = 'next';
  if (snap.phase === 'searching' || snap.phase === 'camera') {
    label = t.stop;
    variant = 'stop';
  } else if (snap.phase === 'ended') {
    label = t.newShort;
    variant = 'new';
  } else if (confirming) {
    label = t.sure;
    variant = 'confirm';
  }

  return (
    <form className="composer" onSubmit={submit}>
      <button
        type="button"
        className={`btn next-btn ${variant}`}
        onClick={onPrimary}
        title={variant === 'stop' ? t.stopTitle : 'Esc'}
      >
        {variant !== 'stop' && <NextIcon size={16} className="flip-rtl" />}
        <span>{label}</span>
        {variant !== 'stop' && <kbd>Esc</kbd>}
      </button>

      <div className={`input-wrap${live ? '' : ' disabled'}`}>
        <textarea
          ref={box}
          rows={1}
          dir={draft ? 'auto' : undefined}
          value={draft}
          disabled={!live}
          maxLength={LIMITS.message}
          placeholder={placeholder}
          aria-label={t.messageLabel}
          onChange={(e) => {
            setDraft(e.target.value);
            session.setTyping(e.target.value.length > 0);
          }}
          onKeyDown={onKeyDown}
          enterKeyHint="send"
        />
        <button
          type="button"
          className="icon-btn icebreaker"
          disabled={!live}
          title={t.icebreaker}
          aria-label={t.icebreaker}
          onClick={() => {
            setDraft(icebreaker(snap.common, t, lang, draft));
            box.current?.focus();
          }}
        >
          <BulbIcon size={18} />
        </button>
        {draft.length > LIMITS.message * 0.8 && <span className="counter">{fmtNum(LIMITS.message - draft.length, t)}</span>}
      </div>

      <button type="submit" className="btn primary send-btn" disabled={!live || !draft.trim()} aria-label={t.send}>
        <SendIcon size={18} className="flip-rtl" />
      </button>
    </form>
  );
}
