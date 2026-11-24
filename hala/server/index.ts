import { appendFile, mkdir } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { LIMITS } from '../shared/protocol.ts';
import { iceServersFor, identityFor, loadConfig, relayAvailable } from './config.ts';
import { Hub, type ReportEntry } from './hub.ts';
import { SECURITY_HEADERS, createStaticHandler } from './static.ts';

const config = loadConfig(process.env);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Reports are appended one JSON object per line, in order, for human review.
let reportQueue = Promise.resolve();
function logReport(entry: ReportEntry) {
  console.log(
    `[report] ${entry.reason}${entry.autoBanned ? ' → auto-ban' : ''} (${entry.distinctReporters} distinct) room=${entry.roomId}`,
  );
  if (!config.reportLog) return;
  const file = join(root, config.reportLog);
  reportQueue = reportQueue
    .then(() => mkdir(dirname(file), { recursive: true }))
    .then(() => appendFile(file, JSON.stringify(entry) + '\n'))
    .catch((err) => console.error('[report] could not write log:', err));
}

const hub = new Hub({
  widenAfterMs: config.widenAfterMs,
  banThreshold: config.banThreshold,
  banMs: config.banHours * 3600_000,
  maxConnectionsPerKey: config.maxConnectionsPerIp,
  relayAvailable: relayAvailable(config),
  iceServers: (id) => iceServersFor(config, id),
  onReport: logReport,
});

/** The site's own address, for the absolute URLs link previews need. */
function originOf(req: IncomingMessage): string {
  if (config.publicUrl) return config.publicUrl;
  const header = (name: string) => {
    const v = req.headers[name];
    return (Array.isArray(v) ? v[0] : v)?.split(',')[0]?.trim();
  };
  const proto = (config.trustProxy && header('x-forwarded-proto')) || ('encrypted' in req.socket ? 'https' : 'http');
  const host = (config.trustProxy && header('x-forwarded-host')) || header('host') || `localhost:${config.port}`;
  // Only a plain host[:port] may land in the page.
  return /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `${proto}://${host}` : `http://localhost:${config.port}`;
}

const serveStatic = createStaticHandler(join(root, 'dist'), (html, req) =>
  html.replaceAll('https://__HALA_ORIGIN__', originOf(req)),
);

const server = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, ...hub.stats() }));
    return;
  }
  serveStatic(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.writeHead(500).end();
  });
});

function clientIp(req: IncomingMessage): string {
  if (config.trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return false; // browsers always send one; anything else isn't our client
  if (config.allowedOrigins.length) return config.allowedOrigins.includes(origin);
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

const wss = new WebSocketServer({ noServer: true, maxPayload: LIMITS.signal + 4096 });
const alive = new WeakSet<WebSocket>();

server.on('upgrade', (req, socket, head) => {
  const path = new URL(req.url ?? '/', 'http://x').pathname;
  if (path !== '/ws' || !originAllowed(req)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const client = hub.connect(
      {
        send: (data) => ws.readyState === ws.OPEN && ws.send(data),
        close: (code, reason) => ws.close(code, reason),
      },
      identityFor(clientIp(req), config.ipSalt),
    );
    if (!client) return;
    alive.add(ws);
    ws.on('pong', () => alive.add(ws));
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      hub.receive(client, data.toString());
    });
    ws.on('close', () => hub.disconnect(client));
    ws.on('error', () => hub.disconnect(client));
  });
});

// Drop connections that stop answering pings (sleeping laptops, dead networks).
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.has(ws)) {
      ws.terminate();
      continue;
    }
    alive.delete(ws);
    ws.ping();
  }
}, 25_000);

const ticker = setInterval(() => hub.tick(), 1000);

server.listen(config.port, config.host, () => {
  const relay = relayAvailable(config) ? 'TURN relay on' : 'no TURN relay (video is direct peer-to-peer)';
  console.log(`hala listening on http://localhost:${config.port}  ·  ${relay}`);
});

function shutdown() {
  clearInterval(heartbeat);
  clearInterval(ticker);
  hub.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
