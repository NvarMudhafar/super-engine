import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { clsx } from '../lib/util';

/** City / series accent colour for a given palette index. */
export function accentVar(index: number): string {
  return `var(--series-${(((index % 8) + 8) % 8) + 1})`;
}

export function dotStyle(index: number): CSSProperties {
  return { ['--dot' as string]: accentVar(index) };
}

/* ------------------------------------------------------------------ fields */

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

interface TextProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'date' | 'time' | 'datetime-local' | 'url' | 'number';
  min?: number;
  step?: number;
  autoFocus?: boolean;
}

export function Text({ label, value, onChange, hint, type = 'text', ...rest }: TextProps) {
  return (
    <Field label={label} hint={hint}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

export function Area({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function Money({
  label,
  value,
  onChange,
  currency,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  currency: string;
  hint?: string;
}) {
  // Kept as a string while focused so "1", "1." and "" are all typable.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === 0 ? '' : String(value));
  return (
    <Field label={`${label} (${currency})`} hint={hint}>
      <input
        type="text"
        inputMode="decimal"
        value={shown}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '');
          setDraft(raw);
          const n = Number.parseFloat(raw);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        onBlur={() => setDraft(null)}
      />
    </Field>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  hint?: string;
}

export function Select<T extends string>({ label, value, onChange, options, hint }: SelectProps<T>) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------------- modal */

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    // Focus the first field so the form is typable straight away.
    panel.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={clsx('modal', wide && 'wide')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body" ref={panel}>
          {children}
        </div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/**
 * Delete button that asks once, inline, instead of throwing up a dialog.
 * Reverts after 3 s so a stray click can't stay armed.
 */
export function DeleteButton({ onDelete, label = 'Delete' }: { onDelete: () => void; label?: string }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  if (armed) {
    return (
      <button className="btn btn-danger btn-sm" onClick={onDelete}>
        Sure?
      </button>
    );
  }
  return (
    <button
      className="btn btn-ghost btn-icon"
      onClick={() => setArmed(true)}
      title={label}
      aria-label={label}
    >
      🗑
    </button>
  );
}

/* ------------------------------------------------------------------ layout */

export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  small,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  small?: boolean;
}) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={clsx('stat-value', small && 'sm')}>{value}</div>
      {note ? <div className="stat-note">{note}</div> : null}
    </div>
  );
}

export function Card({
  title,
  note,
  actions,
  children,
}: {
  title?: string;
  note?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      {title ? (
        <div className="card-head">
          <h2>{title}</h2>
          {note ? <span className="card-title-note">{note}</span> : null}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  ariaLabel: string;
}) {
  return (
    <div className="switch-group" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Small right-aligned external link, hidden when there is no URL. */
export function LinkOut({ href, label = 'Open' }: { href: string; label?: string }) {
  if (!href) return null;
  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  return (
    <a
      className="small link-out"
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  );
}

export function PriceTier({ tier }: { tier: number }) {
  const n = Math.min(4, Math.max(1, tier));
  return (
    <span className="tier" title={`${'€'.repeat(n)} — ${n} of 4`}>
      <b>{'€'.repeat(n)}</b>
      <i>{'€'.repeat(4 - n)}</i>
    </span>
  );
}
