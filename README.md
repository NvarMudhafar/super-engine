# España — Trip Planner

A planner for a trip through Spain. Cities, hotels, restaurants, sights, trains
and budget in one place, running locally in your browser.

```bash
npm install
npm run dev      # opens http://localhost:5173
```

That's it — no account, no server, no API keys. Everything you enter is saved to
this browser's local storage on this computer.

## What's in it

**Overview** — countdown, budget meter, a proportional strip of the whole route,
and a "next up" list of everything still unbooked: hotels marked as ideas,
transport not yet booked, tables to reserve, timed tickets not yet bought.

**Cities** — one card per stop with its dates and a running cost. Open a city and
you get three tabs:

- *Hotels* — dates, total cost, confirmation number, booking link, and a
  booked / paid status that feeds the budget.
- *Eat & drink* — cuisine, area, € tier, a per-person estimate, reservation state
  (walk-in / need to reserve / requested / confirmed) and a table time. Star the
  ones you refuse to miss.
- *See & do* — categorised, prioritised, with a "needs a timed ticket" flag that
  nags you from the overview until the tickets are bought.

**Itinerary** — every day of the trip, in order. Check-ins, check-outs, trains
and confirmed restaurant tables appear on their own day automatically; you add
anything else, optionally with a time. Laid out for printing, one day per row.

**Getting around** — flights, trains, buses and drives, with operator, times,
locator and cost. Endpoints are usually your cities, but "somewhere else" covers
the flights in and out.

**Budget** — a single total split two ways: by category (lodging, transport,
food, activities, shopping, other) and by city. Everything you enter elsewhere
rolls in automatically; log anything else by hand. "Locked in" counts only what
you have actually marked booked or paid, so you can see committed vs planned.
There is a table view of the same numbers, and an optional second currency for a
converted read-out.

**Spain picks** — ten cities (Madrid, Barcelona, Seville, Granada, San Sebastián,
Valencia, Córdoba, Bilbao, Málaga, Toledo) with curated restaurants and sights,
each with a note on what to order or when to go, and flags on the ones that
genuinely need booking months ahead. Add a whole city with its highlights, or
cherry-pick. Everything lands in your own editable lists.

**Checklist** — documents, the bookings that sell out, what to pack, what to do
on arrival. Pre-loaded for Spain; add your own.

## Notes on the data

- Everything lives in `localStorage` under `spain-trip-planner/v1`. Clearing site
  data wipes it, and it will not appear on your phone.
- **Settings & data → Export** writes a JSON backup you can re-import later or on
  another machine. Worth doing once the plan is real.
- `Ctrl`/`⌘`+`Z` undoes the last change, up to 40 steps back.
- `Settings & data → Load the sample trip` fills the app with a worked two-week
  loop (Madrid → Córdoba → Seville → Granada → Valencia → Barcelona) if you want
  to see everything populated before entering your own.
- Prices in Spain picks are rough per-person guides in euros and drift over time.
  Opening hours especially are worth re-checking before you build a day around
  one.

## Stack

React 18 + TypeScript + Vite. No UI library, no state library, no network calls.

- `src/types.ts` — the data model.
- `src/lib/store.tsx` — the single store, persistence, undo, and derived
  selectors (`openTodos`, `cityOnDate`, `cityCost`).
- `src/lib/budget.ts` — how the budget rolls up, and the fixed category→colour
  mapping.
- `src/lib/seed.ts` — the curated Spain library, the default checklist and the
  sample trip.
- `src/index.css` — design tokens for both themes. Chart series colours are a
  validated colourblind-safe palette; the light/dark steps are deliberate pairs,
  so don't re-pick them by eye.

```bash
npm run build      # production build into dist/
npm run typecheck
```

The build uses a relative base, so `dist/` can be served from any path.
