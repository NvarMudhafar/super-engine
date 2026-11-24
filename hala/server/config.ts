import { createHash, createHmac, randomBytes } from 'node:crypto';
import { isIPv6 } from 'node:net';
import type { IceServer } from '../shared/protocol.ts';

export interface Config {
  port: number;
  host: string;
  /** Honour X-Forwarded-For (only when behind a proxy you control). */
  trustProxy: boolean;
  /** Origins allowed to open the WebSocket. Empty = same host only. */
  allowedOrigins: string[];
  stunUrls: string[];
  turnUrls: string[];
  /** coturn `static-auth-secret`; when set, short-lived credentials are minted per person. */
  turnSecret: string;
  turnUsername: string;
  turnCredential: string;
  /** Salt for hashing IPs into identities. Random per process unless set. */
  ipSalt: string;
  /** JSONL file reports are appended to, or '' to disable. */
  reportLog: string;
  banThreshold: number;
  banHours: number;
  maxConnectionsPerIp: number;
  widenAfterMs: number;
  /** Public address, e.g. https://hala.iq — used in link previews. Else taken from each request. */
  publicUrl: string;
}

const list = (v: string | undefined, fallback: string[] = []) =>
  v === undefined ? fallback : v.split(',').map((s) => s.trim()).filter(Boolean);

const int = (v: string | undefined, fallback: number, min = 0) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
};

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const reportLog = env.REPORT_LOG ?? 'data/reports.jsonl';
  return {
    port: int(env.PORT, 3000, 1),
    host: env.HOST ?? '0.0.0.0',
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
    allowedOrigins: list(env.ALLOWED_ORIGINS),
    stunUrls: list(env.STUN_URLS, ['stun:stun.l.google.com:19302']),
    turnUrls: list(env.TURN_URLS),
    turnSecret: env.TURN_SECRET ?? '',
    turnUsername: env.TURN_USERNAME ?? '',
    turnCredential: env.TURN_CREDENTIAL ?? '',
    ipSalt: env.IP_SALT || randomBytes(16).toString('hex'),
    reportLog: reportLog === 'off' ? '' : reportLog,
    banThreshold: int(env.BAN_THRESHOLD, 3, 1),
    banHours: int(env.BAN_HOURS, 24, 1),
    maxConnectionsPerIp: int(env.MAX_CONNECTIONS_PER_IP, 8, 1),
    widenAfterMs: int(env.WIDEN_AFTER_MS, 8000),
    publicUrl: (env.PUBLIC_URL ?? '').replace(/\/+$/, ''),
  };
}

export const relayAvailable = (c: Config) =>
  c.turnUrls.length > 0 && (c.turnSecret !== '' || (c.turnUsername !== '' && c.turnCredential !== ''));

/**
 * ICE servers for one person. With a TURN shared secret this follows the
 * standard "TURN REST API" scheme coturn understands: the username is an
 * expiry timestamp, the password an HMAC of it, so nothing long-lived ever
 * reaches the browser.
 */
export function iceServersFor(c: Config, clientId: string, now = Date.now()): IceServer[] {
  const servers: IceServer[] = [];
  if (c.stunUrls.length) servers.push({ urls: c.stunUrls });
  if (!relayAvailable(c)) return servers;

  if (c.turnSecret) {
    const expiry = Math.floor(now / 1000) + 12 * 3600;
    const username = `${expiry}:${clientId}`;
    const credential = createHmac('sha1', c.turnSecret).update(username).digest('base64');
    servers.push({ urls: c.turnUrls, username, credential });
  } else {
    servers.push({ urls: c.turnUrls, username: c.turnUsername, credential: c.turnCredential });
  }
  return servers;
}

/** Expand an IPv6 address to 8 groups (handles `::` and embedded IPv4). */
function expandIPv6(ip: string): string[] {
  let addr = ip.split('%')[0];
  const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const [a, b, c, d] = v4[1].split('.').map(Number);
    addr = addr.slice(0, -v4[1].length) + ((a << 8) | b).toString(16) + ':' + ((c << 8) | d).toString(16);
  }
  const [head, tail] = addr.split('::');
  const h = head ? head.split(':') : [];
  const t = tail !== undefined && tail !== '' ? tail.split(':') : [];
  const fill = tail !== undefined ? Array(8 - h.length - t.length).fill('0') : [];
  return [...h, ...fill, ...t].map((g) => g.padStart(4, '0').toLowerCase());
}

/**
 * The identity used for bans, blocks and rate limits: a salted hash, never the
 * raw address. IPv6 users are grouped by /64, because one household is
 * usually handed a whole /64 and could otherwise hop addresses at will.
 */
export function identityFor(ip: string, salt: string): string {
  let basis = ip.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');
  if (isIPv6(basis)) basis = expandIPv6(basis).slice(0, 4).join(':') + '::/64';
  return createHash('sha256').update(salt).update(basis).digest('base64url').slice(0, 16);
}
