import { useEffect, useMemo, useState } from 'react';
import { openTodos, useStore, useTheme } from './lib/store';
import { daysBetween, fmtRange, pluralize, todayISO } from './lib/util';
import type { ViewId } from './types';
import Overview from './views/Overview';
import Cities from './views/Cities';
import CityDetail from './views/CityDetail';
import Itinerary from './views/Itinerary';
import Transport from './views/Transport';
import Budget from './views/Budget';
import Checklist from './views/Checklist';
import Library from './views/Library';
import Settings from './views/Settings';

interface Route {
  view: ViewId;
  param?: string;
  /** Transfer code carried in by a `#/receive/<code>` link. */
  receive?: string;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');

  // A transfer link is `#/receive/<code>`. The code is base64url so it has no
  // slashes of its own, but take everything after the first one regardless
  // rather than letting split() truncate it.
  if (raw.startsWith('receive/')) {
    return { view: 'settings', param: undefined, receive: raw.slice('receive/'.length) };
  }

  const [view, param] = raw.split('/');
  const known: ViewId[] = [
    'overview',
    'cities',
    'itinerary',
    'transport',
    'budget',
    'checklist',
    'library',
    'settings',
  ];
  const match = known.find((v) => v === view);
  return { view: match ?? 'overview', param: param || undefined };
}

export function navigate(hash: string) {
  window.location.hash = hash.startsWith('#') ? hash : `#${hash}`;
}

const NAV: Array<{ view: ViewId; label: string; icon: string; group: string }> = [
  { view: 'overview', label: 'Overview', icon: '◈', group: 'Trip' },
  { view: 'itinerary', label: 'Itinerary', icon: '▤', group: 'Trip' },
  { view: 'cities', label: 'Cities', icon: '⌂', group: 'Trip' },
  { view: 'transport', label: 'Getting around', icon: '⇄', group: 'Trip' },
  { view: 'budget', label: 'Budget', icon: '€', group: 'Money' },
  { view: 'library', label: 'Spain picks', icon: '★', group: 'Planning' },
  { view: 'checklist', label: 'Checklist', icon: '✓', group: 'Planning' },
  { view: 'settings', label: 'Settings & data', icon: '⚙', group: 'Planning' },
];

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [theme, setTheme] = useTheme();
  const { data, undo, canUndo, saveFailed } = useStore();

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Ctrl/Cmd+Z anywhere outside a text field walks the edit history back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo]);

  const counts = useMemo<Partial<Record<ViewId, number>>>(() => {
    const todos = openTodos(data).length;
    return {
      cities: data.cities.length,
      transport: data.legs.length,
      checklist: data.checklist.filter((c) => !c.done).length,
      overview: todos,
    };
  }, [data]);

  const countdown = daysBetween(todayISO(), data.trip.startDate);
  const subtitle =
    countdown > 0
      ? `in ${pluralize(countdown, 'day')}`
      : countdown === 0
        ? 'today!'
        : daysBetween(todayISO(), data.trip.endDate) >= 0
          ? 'in progress'
          : fmtRange(data.trip.startDate, data.trip.endDate);

  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            E
          </div>
          <div className="brand-text">
            <div className="brand-title">{data.trip.name || 'Untitled trip'}</div>
            <div className="brand-sub">{subtitle}</div>
          </div>
        </div>

        <nav className="nav">
          {groups.map((group) => (
            <div key={group}>
              <div className="nav-label">{group}</div>
              {NAV.filter((n) => n.group === group).map((n) => (
                <button
                  key={n.view}
                  className="nav-item"
                  style={{ width: '100%' }}
                  aria-current={route.view === n.view}
                  onClick={() => navigate(`#/${n.view}`)}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {n.icon}
                  </span>
                  <span>{n.label}</span>
                  {counts[n.view] ? <span className="nav-count">{counts[n.view]}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Switch theme"
          >
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
          <span className="spacer" />
          <button
            className="btn btn-ghost btn-sm"
            onClick={undo}
            disabled={!canUndo}
            title="Undo last change (Ctrl+Z)"
          >
            ↶ Undo
          </button>
        </div>
      </aside>

      <main className="main">
        {saveFailed ? (
          <div className="page" style={{ marginBottom: 18 }}>
            <div className="callout" style={{ borderLeftColor: 'var(--bad)' }}>
              <span aria-hidden="true">⚠</span>
              <span>
                This browser is not letting the planner save — private browsing, a full disk or
                blocked storage will do that. Your changes are held for this session only and will
                be lost on reload. Use <a href="#/settings">Settings &amp; data → Export</a> now to
                keep them.
              </span>
            </div>
          </div>
        ) : null}
        {route.view === 'overview' && <Overview />}
        {route.view === 'cities' &&
          (route.param ? <CityDetail cityId={route.param} /> : <Cities />)}
        {route.view === 'itinerary' && <Itinerary />}
        {route.view === 'transport' && <Transport />}
        {route.view === 'budget' && <Budget />}
        {route.view === 'checklist' && <Checklist />}
        {route.view === 'library' && <Library />}
        {route.view === 'settings' && <Settings incomingCode={route.receive} />}
      </main>
    </div>
  );
}
