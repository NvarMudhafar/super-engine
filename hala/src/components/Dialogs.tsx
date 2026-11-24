import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LIMITS, REPORT_REASONS, type ReportReason } from '../../shared/protocol.ts';
import { useI18n } from '../lib/i18n.ts';
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
  const { t } = useI18n();

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
            <button type="button" className="icon-btn" aria-label={t.close} onClick={onClose}>
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
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={t.rulesTitle} wide>
      <div className="prose">
        <h3>{t.rulesHeading}</h3>
        <ol className="rules">
          {t.rules.map(([title, body]) => (
            <li key={title}>
              <strong>{title}</strong> {body}
            </li>
          ))}
        </ol>
        <p>{t.rulesAfter}</p>

        <div className="safety-box">
          <h3>{t.safetyHeading}</h3>
          <ul>
            {t.safety.map(([title, body]) => (
              <li key={title}>
                <strong>{title}</strong> {body}
              </li>
            ))}
          </ul>
        </div>

        <h3>{t.privacyHeading}</h3>
        <ul>
          {t.privacy.map(([title, body]) => (
            <li key={title}>
              <strong>{title}</strong> {body}
            </li>
          ))}
        </ul>
      </div>
      <footer className="modal-foot">
        <button type="button" className="btn primary" onClick={onClose}>
          {t.gotIt}
        </button>
      </footer>
    </Modal>
  );
}

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
  const { t } = useI18n();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setReason(null);
      setNote('');
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={t.reportTitle}>
      <form
        className="report-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) onReport(reason, note);
        }}
      >
        <fieldset>
          <legend className="sr-only">{t.whatHappened}</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r} className={`radio-row${reason === r ? ' selected' : ''}`}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              <span>{t.reasons[r]}</span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span className="field-label">
            {t.noteLabel} <span className="muted">{t.optional}</span>
          </span>
          <textarea
            rows={2}
            dir={note ? 'auto' : undefined}
            maxLength={LIMITS.reportNote}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.notePlaceholder}
          />
        </label>
        <p className="fine-print">{t.reportFinePrint}</p>
        <footer className="modal-foot split">
          <button type="button" className="btn ghost" onClick={onBlock}>
            <BlockIcon size={18} /> {t.justBlock}
          </button>
          <button type="submit" className="btn danger" disabled={!reason}>
            <FlagIcon size={18} /> {t.reportAndLeave}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
