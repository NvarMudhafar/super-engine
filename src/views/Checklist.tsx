import { useMemo, useState } from 'react';
import { DeleteButton, Empty, SegmentedControl } from '../components/ui';
import { defaultChecklist } from '../lib/seed';
import { useStore } from '../lib/store';
import { clsx, pluralize, uid } from '../lib/util';

export default function Checklist() {
  const { data, add, update, remove, replace } = useStore();
  const [filter, setFilter] = useState<'all' | 'open'>('all');
  const [draft, setDraft] = useState('');
  const [group, setGroup] = useState('Packing');

  const groups = useMemo(() => {
    const order = ['Documents', 'Before you go', 'Packing', 'On arrival'];
    const found = [...new Set(data.checklist.map((c) => c.group))];
    return [
      ...order.filter((g) => found.includes(g)),
      ...found.filter((g) => !order.includes(g)).sort(),
    ];
  }, [data.checklist]);

  const done = data.checklist.filter((c) => c.done).length;
  const total = data.checklist.length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const addItem = () => {
    const label = draft.trim();
    if (!label) return;
    add('checklist', { id: uid(), label, group, done: false });
    setDraft('');
  };

  return (
    <div className="page stack">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Checklist</h1>
          <div className="page-sub">
            {total === 0
              ? 'Documents, bookings to chase and what to pack.'
              : `${done} of ${total} done`}
          </div>
        </div>
        <div className="page-actions">
          <SegmentedControl
            ariaLabel="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Outstanding' },
            ]}
          />
          {total > 0 ? (
            <button
              className="btn"
              onClick={() => replace('checklist', data.checklist.filter((c) => !c.done))}
              disabled={done === 0}
            >
              Clear {done} done
            </button>
          ) : null}
        </div>
      </div>

      {total > 0 ? (
        <div className="meter" aria-label={`${Math.round(pct)}% complete`}>
          <div className={clsx('meter-fill', pct === 100 && 'good')} style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      {total === 0 ? (
        <Empty
          icon="✓"
          title="Empty checklist"
          action={
            <button
              className="btn btn-primary"
              onClick={() => replace('checklist', defaultChecklist())}
            >
              Load the Spain checklist
            </button>
          }
        >
          Twenty-five items covering documents, the bookings that sell out, and what actually
          matters in a Spanish summer.
        </Empty>
      ) : (
        <div className="grid grid-2">
          {groups.map((g) => {
            const items = data.checklist
              .filter((c) => c.group === g)
              .filter((c) => filter === 'all' || !c.done);
            if (items.length === 0) return null;
            const groupDone = data.checklist.filter((c) => c.group === g && c.done).length;
            const groupTotal = data.checklist.filter((c) => c.group === g).length;
            return (
              <section className="card" key={g}>
                <div className="card-head">
                  <h2>{g}</h2>
                  <span className="card-title-note">
                    {groupDone}/{groupTotal}
                  </span>
                </div>
                <div className="stack-sm">
                  {items.map((c) => (
                    <div className="row" key={c.id} style={{ gap: 10 }}>
                      <label className="check" style={{ flex: 1, alignItems: 'flex-start' }}>
                        <input
                          type="checkbox"
                          checked={c.done}
                          onChange={(e) => update('checklist', c.id, { done: e.target.checked })}
                        />
                        <span className={clsx('small', c.done && 'strike dim')}>{c.label}</span>
                      </label>
                      <DeleteButton onDelete={() => remove('checklist', c.id)} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="card">
        <div className="card-head">
          <h2>Add an item</h2>
        </div>
        <div className="row row-wrap">
          <input
            style={{ flex: 3, minWidth: 200 }}
            value={draft}
            placeholder="Something to remember…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addItem();
            }}
          />
          <select
            style={{ flex: 1, minWidth: 140 }}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            {[...new Set([...groups, 'Documents', 'Before you go', 'Packing', 'On arrival'])].map(
              (g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ),
            )}
          </select>
          <button className="btn btn-primary" onClick={addItem} disabled={!draft.trim()}>
            Add
          </button>
        </div>
        {total > 0 ? (
          <p className="small dim" style={{ marginTop: 10 }}>
            {pluralize(total - done, 'item')} still outstanding. Press{' '}
            <span className="kbd">Enter</span> to add without reaching for the mouse.
          </p>
        ) : null}
      </section>
    </div>
  );
}
