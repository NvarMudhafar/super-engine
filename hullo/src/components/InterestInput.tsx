import { useRef, useState, type KeyboardEvent } from 'react';
import { LIMITS } from '../../shared/protocol.ts';
import { normalizeInterest } from '../../shared/interests.ts';
import { CloseIcon } from './Icons.tsx';

const SUGGESTIONS = ['music', 'movies', 'gaming', 'books', 'anime', 'travel', 'art', 'tech', 'sports', 'language exchange'];

export function InterestInput({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const full = value.length >= LIMITS.interests;

  const add = (raw: string) => {
    const tags = raw
      .split(',')
      .map(normalizeInterest)
      .filter((t) => t && !value.includes(t));
    if (tags.length) onChange([...value, ...new Set(tags)].slice(0, LIMITS.interests));
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && draft.trim()) {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const unused = SUGGESTIONS.filter((s) => !value.includes(s));

  return (
    <div className="interests">
      <div className="tag-field" onClick={() => input.current?.focus()}>
        {value.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
            <button
              type="button"
              className="tag-remove"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((t) => t !== tag));
              }}
            >
              <CloseIcon size={14} />
            </button>
          </span>
        ))}
        <input
          ref={input}
          id="interest-input"
          value={draft}
          disabled={full}
          maxLength={LIMITS.interest + 4}
          placeholder={full ? 'That’s the maximum' : value.length ? 'Add another…' : 'Type an interest and press Enter'}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
          autoComplete="off"
          enterKeyHint="done"
        />
      </div>
      {!full && unused.length > 0 && (
        <div className="suggestions" aria-label="Suggestions">
          {unused.slice(0, 7).map((s) => (
            <button type="button" key={s} className="suggestion" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
