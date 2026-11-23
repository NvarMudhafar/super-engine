import { useEffect, useLayoutEffect, useRef } from 'react';
import { listify, session, type ChatLine, type Snapshot } from '../lib/session.ts';
import { downloadTranscript } from '../lib/transcript.ts';
import { DownloadIcon, FlagIcon, NextIcon } from './Icons.tsx';

function Searching({ snap }: { snap: Snapshot }) {
  const hasInterests = snap.interests.length > 0;
  let detail: string;
  if (snap.conn !== 'open') detail = 'Reconnecting to the server…';
  else if (!hasInterests) detail = 'Matching you with a random stranger.';
  else if (snap.widened) detail = `No one online shares ${listify(snap.interests)} right now, so we're widening to anyone.`;
  else detail = `Waiting for someone who also likes ${listify(snap.interests)}.`;

  return (
    <div className="searching" role="status" aria-live="polite">
      <div className="radar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h2>Looking for someone…</h2>
      <p>{detail}</p>
      <p className="tip">
        Tip: press <kbd>Esc</kbd> twice to skip a chat.
      </p>
    </div>
  );
}

function Line({ line, prev }: { line: ChatLine; prev?: ChatLine }) {
  if (line.from === 'system') {
    return (
      <li className="line system">
        <span>{line.text}</span>
      </li>
    );
  }
  const continued = prev?.from === line.from;
  return (
    <li className={`line ${line.from}${continued ? ' cont' : ''}${line.status ? ` ${line.status}` : ''}`}>
      <span className="sr-only">{line.from === 'me' ? 'You:' : 'Stranger:'}</span>
      <div className="bubble">{line.text}</div>
      {line.status === 'failed' && <div className="line-note">{line.note}</div>}
    </li>
  );
}

export function MessageList({ snap, onReport }: { snap: Snapshot; onReport: () => void }) {
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

  if (snap.phase === 'searching' || snap.phase === 'camera') {
    return (
      <div className="messages" ref={scroller}>
        <Searching snap={snap} />
      </div>
    );
  }

  return (
    <div className="messages" ref={scroller} onScroll={onScroll}>
      {snap.common.length > 0 && (
        <div className="common">
          <span>You both like</span>
          {snap.common.map((c) => (
            <span key={c} className="tag tag-warm">
              {c}
            </span>
          ))}
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
          Stranger is typing
        </div>
      )}
      {snap.phase === 'ended' && (
        <div className="ended-actions">
          <button type="button" className="btn primary" onClick={() => session.next()}>
            <NextIcon size={18} /> New chat <kbd>Esc</kbd>
          </button>
          {snap.lines.some((l) => l.from !== 'system') && (
            <button type="button" className="btn ghost" onClick={() => downloadTranscript(snap.lines, snap.common)}>
              <DownloadIcon size={18} /> Save chat
            </button>
          )}
          {snap.reportable && (
            <button type="button" className="btn ghost danger-text" onClick={onReport}>
              <FlagIcon size={18} /> Report
            </button>
          )}
        </div>
      )}
    </div>
  );
}
