import { useEffect, useLayoutEffect, useRef } from 'react';
import { placeOf } from '../../shared/interests.ts';
import { listify, localizeTag, splitInterests, systemText, useI18n } from '../lib/i18n.ts';
import { session, type ChatLine, type Snapshot } from '../lib/session.ts';
import { downloadTranscript } from '../lib/transcript.ts';
import { DownloadIcon, FlagIcon, NextIcon, PinIcon, TeaScene } from './Icons.tsx';

function Searching({ snap }: { snap: Snapshot }) {
  const { t, lang } = useI18n();
  const { place, rest } = splitInterests(snap.interests, lang);
  let detail: string;
  if (snap.conn !== 'open') detail = t.reconnecting;
  else if (!place && rest.length === 0) detail = t.searchingRandom;
  else if (snap.widened) detail = t.searchingWidened;
  else detail = t.searchingFor(place, rest.length ? listify(rest, lang) : null);

  return (
    <div className="searching" role="status" aria-live="polite">
      <TeaScene waiting className="small" />
      <h2>{t.searchingTitle}</h2>
      <p>{detail}</p>
      <p className="tip">
        {t.tipBefore} <kbd>Esc</kbd> {t.tipAfter}
      </p>
    </div>
  );
}

function Line({ line, prev }: { line: ChatLine; prev?: ChatLine }) {
  const { t, lang } = useI18n();
  if (line.sys) {
    return (
      <li className="line system">
        <span>{systemText(line.sys, t, lang)}</span>
      </li>
    );
  }
  const continued = prev?.from === line.from;
  return (
    <li className={`line ${line.from}${continued ? ' cont' : ''}${line.status ? ` ${line.status}` : ''}`}>
      <span className="sr-only">{line.from === 'me' ? t.you : t.them}:</span>
      <div className="bubble" dir="auto">
        {line.text}
      </div>
      {line.status === 'failed' && line.fail && <div className="line-note">{t.fail[line.fail]}</div>}
    </li>
  );
}

export function MessageList({ snap, onReport }: { snap: Snapshot; onReport: () => void }) {
  const { t, lang } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Stick to the bottom unless the reader has scrolled up to look back.
  const onScroll = () => {
    const el = scroller.current;
    if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [snap.lines, snap.partnerTyping, snap.phase]);
  useEffect(() => {
    pinned.current = true;
  }, [snap.matchId]);
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (pinned.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (snap.phase === 'searching' || snap.phase === 'camera') {
    return (
      <div className="messages" ref={scroller}>
        <Searching snap={snap} />
      </div>
    );
  }

  const place = snap.common.find((c) => placeOf(c));
  const shared = snap.common.filter((c) => !placeOf(c));

  return (
    <div className="messages" ref={scroller} onScroll={onScroll}>
      {(place || shared.length > 0) && (
        <div className="common">
          {place && (
            <>
              <span>{t.bothFrom}</span>
              <span className="tag tag-place">
                <PinIcon size={13} /> {localizeTag(place, lang)}
              </span>
            </>
          )}
          {shared.length > 0 && (
            <>
              <span>{t.bothLike}</span>
              {shared.map((c) => (
                <span key={c} className="tag tag-warm" dir="auto">
                  {localizeTag(c, lang)}
                </span>
              ))}
            </>
          )}
        </div>
      )}
      <ol className="lines" aria-live="polite" aria-relevant="additions">
        {snap.lines.map((line, i) => (
          <Line key={line.id} line={line} prev={snap.lines[i - 1]} />
        ))}
      </ol>
      {snap.partnerTyping && snap.phase === 'chatting' && (
        <div className="typing" aria-live="polite">
          <span className="typing-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {t.typing}
        </div>
      )}
      {snap.phase === 'ended' && (
        <div className="ended-actions">
          <button type="button" className="btn primary" onClick={() => session.next()}>
            <NextIcon size={18} className="flip-rtl" /> {t.newChat} <kbd>Esc</kbd>
          </button>
          {snap.lines.some((l) => l.from !== 'system') && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => downloadTranscript(snap.lines, snap.common, t, lang)}
            >
              <DownloadIcon size={18} /> {t.saveChat}
            </button>
          )}
          {snap.reportable && (
            <button type="button" className="btn ghost danger-text" onClick={onReport}>
              <FlagIcon size={18} /> {t.report}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
