import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LIMITS, type ReportReason } from '../../shared/protocol.ts';
import { BlockIcon, CloseIcon, FlagIcon } from './Icons.tsx';

/** A native <dialog>: focus trapping, Esc to close and inert background for free. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' modal-wide' : ''}`}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="modal-inner">
          <header className="modal-head">
            <h2 id="modal-title">{title}</h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function RulesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="House rules & privacy" wide>
      <div className="prose">
        <h3>The rules</h3>
        <ol className="rules">
          <li>
            <strong>18+ only.</strong> If someone seems to be under 18, leave and report them.
          </li>
          <li>
            <strong>No nudity or sexual content</strong>, on camera or in text.
          </li>
          <li>
            <strong>No harassment, threats or hate.</strong> Disagreeing is fine; targeting someone is not.
          </li>
          <li>
            <strong>No spam, ads or bots.</strong> Copy-pasted links get blocked automatically.
          </li>
          <li>
            <strong>Don't record or share</strong> anyone's video or messages without their permission.
          </li>
        </ol>
        <p>
          Breaking these gets you reported. When several different people report the same person, they're removed
          automatically for a day.
        </p>

        <h3>Your privacy</h3>
        <ul>
          <li>
            <strong>No accounts.</strong> You're just “Stranger”. Nothing identifies you unless you share it — so don't share
            your full name, address, school or socials with someone you just met.
          </li>
          <li>
            <strong>Messages aren't stored.</strong> They pass through the server to reach the other person and are kept in
            memory only for the length of the chat.
          </li>
          <li>
            <strong>Reports include evidence.</strong> If you report a chat, its last messages are saved with the report so a
            person can review it.
          </li>
          <li>
            <strong>Video goes directly between browsers.</strong> It never touches the server, but a direct connection
            means each browser can see the other's IP address. Where this server offers a relay, “Hide my IP address” routes
            video through it instead.
          </li>
          <li>
            <strong>Your IP address is never stored as-is.</strong> The server keeps a scrambled (hashed) form to enforce
            bans and rate limits.
          </li>
        </ul>
      </div>
      <footer className="modal-foot">
        <button type="button" className="btn primary" onClick={onClose}>
          Got it
        </button>
      </footer>
    </Modal>
  );
}

const REASONS: Array<{ id: ReportReason; label: string; hint?: string }> = [
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'minor', label: 'They seem to be under 18' },
  { id: 'harassment', label: 'Harassment or threats' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'spam', label: 'Spam, ads or a bot' },
  { id: 'other', label: 'Something else' },
];

export function ReportDialog({
  open,
  onClose,
  onReport,
  onBlock,
}: {
  open: boolean;
  onClose: () => void;
  onReport: (reason: ReportReason, note: string) => void;
  onBlock: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setReason(null);
      setNote('');
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Report this stranger">
      <form
        className="report-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) onReport(reason, note);
        }}
      >
        <fieldset>
          <legend className="sr-only">What happened?</legend>
          {REASONS.map((r) => (
            <label key={r.id} className={`radio-row${reason === r.id ? ' selected' : ''}`}>
              <input type="radio" name="reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
              <span>{r.label}</span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span className="field-label">
            Anything to add? <span className="muted">Optional</span>
          </span>
          <textarea
            rows={2}
            maxLength={LIMITS.reportNote}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened, briefly"
          />
        </label>
        <p className="fine-print">
          The chat ends and you won't be matched with them again. The last messages of the chat are attached for review.
          They won't know who reported them.
        </p>
        <footer className="modal-foot split">
          <button type="button" className="btn ghost" onClick={onBlock}>
            <BlockIcon size={18} /> Just block
          </button>
          <button type="submit" className="btn danger" disabled={!reason}>
            <FlagIcon size={18} /> Report and leave
          </button>
        </footer>
      </form>
    </Modal>
  );
}
