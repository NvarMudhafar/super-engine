# هلا · hala — talk to someone new

Random one-on-one text and video chat made for Iraq. Pull up a chair and pour
some chai. People are matched on shared interests and their city, a stranger's
video stays blurred until you choose to see it, and reporting takes one tap.
The app is in Iraqi Arabic by default, with a one-tap switch to English.

```bash
cd hala
npm install
npm run dev        # http://localhost:5173 — open it in two windows to chat with yourself
```

Needs Node 22.18 or newer. The server is TypeScript that Node runs directly, so
there is no build step on the server side.

## Made for Iraq

- **Arabic first, written in Iraqi dialect.** The interface uses everyday Iraqi
  words (سوالف، گعدة، ماكو، شلونك؟) rather than formal فصحى. The layout runs
  fully right-to-left and numbers use Arabic-Indic digits. The **EN** button in
  the top bar switches everything to English, including messages that are
  already on screen. Each chat bubble picks its own direction, so mixed Arabic
  and English conversations read naturally.
- **City matching.** The start screen has an optional *مدينتك* (your city) picker
  with 22 Iraqi cities. People from the same city are matched first. The city
  is only shown to someone who picked the same one («انتو الثنين من البصرة»).
- **Interests match across spellings and languages.** «كرة القدم», «كره قدم»,
  «طوبة» and "Football" all match. So do «أربيل», «هولير» and "Erbil", and
  «ببجي» and "PUBG". Hamza, taa marbuta and the «ال» prefix are ignored, as are
  Persian- and Kurdish-keyboard letters (ک/ی) and Arabic-Indic digits. Tags are
  shown exactly as the person typed them, but translated into the reader's
  language when the app knows the word.
- **Icebreakers with a local flavour.** «دولمة لو قوزي؟», «چاي لو گهوة؟», «تشجع
  الزوراء لو الشرطة لو الجوية؟». When you share a city, some ask about it:
  «وين أطيب أكل بالبصرة؟».
- **Blackmail safety.** The rules (*آداب الگعدة*) include a "watch out for
  blackmail" box: anything on camera can be recorded, don't move to another
  app or send photos, and if someone threatens you, don't pay, keep the
  evidence and contact the Community Police. *Blackmail or threats* is its own
  report reason.
- **A warm, cozy look.** Sand, terracotta brick and turquoise-tile colours, with
  a lamp-lit brown dark mode. The logo is an *istikan* of chai. While you wait
  for a match, the search screen shows your glass of tea beside an empty one
  waiting for a guest. A faint eight-point star pattern sits behind the start
  screen. The fonts are Readex Pro and Baloo Bhaijaan 2, both bundled with the
  app, so no request ever goes to a font CDN.

## What's different from the classic version

**Matching**
- **Interest matching that ranks.** More shared interests beat fewer; ties go to
  whoever has waited longest. Shared interests are shown when you connect.
- **Fallback is your choice.** If nobody shares your tags, you're widened to
  anyone after 8 seconds, but only if you ticked that box, and the screen says
  when it happens.
- **No instant rematches.** Two people who just parted can't be paired again for
  15 seconds. A block keeps them apart for 24 hours.

**Safety**
- **Video starts blurred.** Every new stranger's camera is blurred until you tap
  *Show video*. You can turn this off.
- **One-tap report, even after they leave.** Reporting ends the chat and blocks
  the pair. A chat can still be reported for 3 minutes after it ends, so
  flash-and-leave doesn't get away clean. The reported person isn't told.
- **Automatic removal needs several different people.** Three *distinct*
  reporters within an hour gets someone a 24-hour ban. Reports from one person,
  or from someone on the same IP, never count twice.
- **Bot detection.** The same link pasted as the opening message to three
  strangers in a row gets a 1-hour ban. A pasted opener without a link is just
  refused after five repeats, with a nudge.
- **Rate limits** on messages, skips, signalling and reports. There's also a cap
  on connections per IP.
- **18+ gate and house rules** on the start screen.
- **Links are never clickable.** All messages render as plain text.

**Privacy**
- No accounts and no message storage. Messages are relayed and kept in memory
  only for the chat's lifetime. The exception is a report: the last 50 lines of
  that chat are saved with it so a person can review it.
- IPs are never stored as-is. Bans and limits use a salted hash, and IPv6
  addresses are grouped by /64 so nobody can hop addresses inside their own
  allocation.
- **Hide my IP.** Peer-to-peer video normally shows each browser the other's IP
  address. If you configure a TURN relay, users can route video through it
  instead. It's on by default whenever it's available.
- A strict CSP with no third-party scripts, fonts or trackers.

**Comfort**
- `Esc` `Esc` skips. The first press asks "Sure?", so one stray key doesn't end
  a good chat.
- Typing indicator, delivery state for your own messages, and a 💡 button that
  suggests a conversation starter, about a shared interest when there is one.
- *Save chat* downloads the conversation as a text file. It stays in your
  browser and is never uploaded.
- An unread count in the tab title while you're in another tab.
- Light and dark themes. It works on phones.
- Mic and camera toggles; the other person sees "muted" or "camera off".
- If the connection drops, it reconnects with backoff and resumes a search that
  was in progress.

## Running it for real

```bash
npm run build      # client → dist/
npm start          # serves dist/ and the WebSocket on $PORT (default 3000)
```

**HTTPS is required for video.** Browsers only allow the camera on `https://`
or `localhost`. Put the server behind a TLS-terminating proxy (Caddy, nginx, a
load balancer), make sure it forwards WebSocket upgrades on `/ws`, and set
`TRUST_PROXY=1` so the real client IP is used.

**Sharing the link.** Links shared on WhatsApp, Telegram, Instagram or X show
a preview card (`public/og.jpg`). Those apps need the image's full address, so
set `PUBLIC_URL` to your domain. Without it, the server uses the address each
request came in on. On a phone, the site can be added to the home screen as
«هلا», with its own icon and no browser bar.

`GET /healthz` returns live counts:
`{ ok, online, waiting, chats, videoChats, bans }`.

### Configuration

| Variable | Default | |
| --- | --- | --- |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | |
| `PUBLIC_URL` | from each request | The site's public address, e.g. `https://hala.iq`. It goes into link previews. Set it in production. |
| `TRUST_PROXY` | off | Use `X-Forwarded-For`. Turn this on only behind a proxy you control. |
| `ALLOWED_ORIGINS` | same host | Comma-separated origins allowed to open the WebSocket. |
| `STUN_URLS` | Google's public STUN | Comma-separated. Set to empty to disable. |
| `TURN_URLS` | — | e.g. `turn:turn.example.com:3478,turns:turn.example.com:5349` |
| `TURN_SECRET` | — | coturn `static-auth-secret`. Each user gets 12-hour credentials. |
| `TURN_USERNAME` / `TURN_CREDENTIAL` | — | Static TURN credentials, if you're not using a secret. |
| `IP_SALT` | random per start | Set it so the identities in the report log stay comparable across restarts. Keep it secret. |
| `REPORT_LOG` | `data/reports.jsonl` | Where reports are appended. `off` disables logging. |
| `BAN_THRESHOLD` | `3` | Distinct reporters within an hour before a ban. |
| `BAN_HOURS` | `24` | |
| `MAX_CONNECTIONS_PER_IP` | `8` | |
| `WIDEN_AFTER_MS` | `8000` | How long an interest search waits before widening. |

### TURN (recommended)

Without TURN, some pairs can't connect video at all (strict NATs, some mobile
carriers); they can still text. "Hide my IP" also isn't offered. A minimal coturn setup:

```
# /etc/turnserver.conf
use-auth-secret
static-auth-secret=<long random string>
realm=turn.example.com
```

Then start hala with `TURN_URLS=turn:turn.example.com:3478` and
`TURN_SECRET=<the same string>`.

### Reviewing reports

Each report is one JSON line containing the reason, an optional note, the mode,
how long the chat lasted, how many distinct people have reported that identity,
whether it triggered an auto-ban, and the last lines of the chat labelled
`reporter` / `reported`. Identities are the salted hashes, never IPs.

### Limits of this version

- **Single process.** The queue, bans and blocks live in memory. Running several
  instances needs that state moved to something shared, such as Redis.
- **Bans and blocks reset on restart.** They aren't persisted yet.
- **No automated image moderation.** Blur-by-default and fast reporting are the
  defences. A serious deployment should add server-side or on-device nudity
  detection for video.

> **If you run this publicly:** an anonymous video-chat service attracts abuse,
> including attempts to reach minors. Have a real person reviewing
> `reports.jsonl`. Know your legal reporting duties for child-safety material:
> in the US that means reporting to NCMEC, and other countries have their own
> equivalents. Put real terms of service and a privacy policy in place before
> launch.

## How it's built

```
shared/protocol.ts      every message between browser and server, typed
shared/interests.ts     interest matching keys, Arabic folding, synonyms, Iraqi cities
server/index.ts         HTTP + WebSocket entry point, static files, heartbeat
server/hub.ts           connections, rooms, relay, reports, bans, blocks
server/matchmaker.ts    the queue: pure and clock-injectable
server/moderation.ts    token buckets, expiring sets, report counting, opener spam guard
server/validate.ts      strict parsing of every inbound frame
server/config.ts        env config, TURN credentials, IP hashing
src/lib/session.ts      client state machine (external store for React)
src/lib/i18n.ts         every word on screen, in Iraqi Arabic and English
src/lib/rtc.ts          the WebRTC call
src/components/         Home, ChatScreen, VideoStage, MessageList, Composer, dialogs
```

The hub never touches a socket. It talks to a `Transport` interface, so the
whole server can be tested with fake connections and a fake clock.

```bash
npm test           # matchmaking (incl. Arabic/English), relay, reports, bans, spam, validation
npm run typecheck  # client and server
```

React 18 + Vite on the client and `ws` on the server. Those are the only
runtime dependencies.
