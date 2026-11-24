import { useRef, useState, type KeyboardEvent } from 'react';
import { LIMITS } from '../../shared/protocol.ts';
import { interestKey, normalizeInterest } from '../../shared/interests.ts';
import { SUGGESTIONS, useI18n } from '../lib/i18n.ts';
import { CloseIcon } from './Icons.tsx';

export function InterestInput({
  value,
  onChange,
  max = LIMITS.interests,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const { t, lang } = useI18n();
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const full = value.length >= max;
  const have = new Set(value.map(interestKey));

  const add = (raw: string) => {
    const next = [...value];
    const keys = new Set(have);
    for (const part of raw.split(/[,،]/)) {
      const tag = normalizeInterest(part);
      const key = tag && interestKey(tag);
      if (key && !keys.has(key)) {
        next.push(tag);
        keys.add(key);
      }
    }
    if (next.length !== value.length) onChange(next.slice(0, max));
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === '،' || e.key === 'Tab') && draft.trim()) {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const unused = SUGGESTIONS.filter((s) => !have.has(interestKey(s.en)));

  return (
    <div className="interests">
      <div className="tag-field" onClick={() => input.current?.focus()}>
        {value.map((tag) => (
          <span className="tag" key={tag} dir="auto">
            {tag}
            <button
              type="button"
              className="tag-remove"
              aria-label={t.removeTag(tag)}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((v) => v !== tag));
              }}
            >
              <CloseIcon size={14} />
            </button>
          </span>
        ))}
        <input
          ref={input}
          id="interest-input"
          dir={draft ? 'auto' : undefined}
          value={draft}
          disabled={full}
          maxLength={LIMITS.interest + 4}
          placeholder={full ? t.interestFull : value.length ? t.interestMore : t.interestEmpty}
          onChange={(e) => (/[,،]/.test(e.target.value) ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
          autoComplete="off"
          enterKeyHint="done"
        />
      </div>
      {!full && unused.length > 0 && (
        <div className="suggestions" aria-label={t.suggestionsLabel}>
          {unused.slice(0, 8).map((s) => (
            <button type="button" key={s.en} className="suggestion" onClick={() => add(s[lang])}>
              + {s[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
