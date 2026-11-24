/**
 * The wire protocol between the browser and the chat server. Every frame is a
 * JSON object with a `t` (type) field. The server validates everything it
 * receives (see server/validate.ts) — these types describe the happy path.
 */

export type Mode = 'text' | 'video';

export const REPORT_REASONS = ['nudity', 'minor', 'blackmail', 'harassment', 'hate', 'spam', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const LIMITS = {
  /** Longest chat message, in characters. */
  message: 1000,
  /** Most interests a person can match on. */
  interests: 10,
  /** Longest single interest, in characters. */
  interest: 24,
  /** Longest free-text note attached to a report. */
  reportNote: 300,
  /** Largest signalling payload (SDP blobs are a few kB). */
  signal: 32 * 1024,
} as const;

/** The subset of RTCIceCandidateInit that crosses the wire. */
export interface IceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export type Signal =
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'ice'; candidate: IceCandidate | null };

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface MediaState {
  cam: boolean;
  mic: boolean;
}

// ─── browser → server ────────────────────────────────────────────────────────

export type ClientMsg =
  /** Join the queue. If already chatting, that chat ends first ("next"). */
  | { t: 'find'; mode: Mode; interests: string[]; fallback: boolean }
  /** Leave the queue without matching. */
  | { t: 'cancel' }
  /** End the current chat and go idle. */
  | { t: 'leave' }
  | { t: 'chat'; id: string; text: string }
  | { t: 'typing'; on: boolean }
  | { t: 'signal'; data: Signal }
  | { t: 'media'; state: MediaState }
  /** Report the current partner — or the previous one, shortly after a chat ends. */
  | { t: 'report'; reason: ReportReason; note?: string }
  /** Never match with the current (or just-ended) partner again. */
  | { t: 'block' };

// ─── server → browser ────────────────────────────────────────────────────────

export type EndReason = 'you-left' | 'partner-left' | 'you-reported' | 'you-blocked';

/**
 * The server never sends prose: it sends codes and the browser words them in
 * the reader's language.
 */
export type NoticeCode = 'report-sent' | 'blocked' | 'restarting';
export type ErrorCode = 'skipping-fast' | 'reporting-fast' | 'bad-request' | 'not-in-chat' | 'nothing-to-report';
export type BanReason = 'reports' | 'spam';
export type AckFailure = 'not-in-chat' | 'empty' | 'slow-down' | 'repeat-opener';

export type ServerMsg =
  | {
      t: 'welcome';
      online: number;
      iceServers: IceServer[];
      /** A TURN relay is configured, so "hide my IP" is possible in video. */
      relayAvailable: boolean;
      /** How long an interest search waits before widening. */
      widenAfterMs: number;
    }
  | { t: 'online'; count: number }
  /** In the queue. `widened` once we've given up on shared interests. */
  | { t: 'queued'; mode: Mode; widened: boolean }
  /** Interests both people listed, spelled the way the person who was searching wrote them. */
  | { t: 'matched'; mode: Mode; common: string[]; initiator: boolean }
  | { t: 'chat'; text: string; ts: number }
  /** Delivery result for one of our own chat messages. */
  | { t: 'ack'; id: string; ok: boolean; reason?: AckFailure }
  | { t: 'typing'; on: boolean }
  | { t: 'signal'; data: Signal }
  | { t: 'media'; state: MediaState }
  | { t: 'ended'; reason: EndReason }
  | { t: 'notice'; code: NoticeCode }
  | { t: 'error'; code: ErrorCode; retryInMs?: number }
  | { t: 'banned'; until: number; reason: BanReason };
