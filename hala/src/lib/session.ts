import { useSyncExternalStore } from 'react';
import type {
  AckFailure,
  BanReason,
  ClientMsg,
  EndReason,
  ErrorCode,
  IceServer,
  MediaState,
  Mode,
  NoticeCode,
  ReportReason,
  ServerMsg,
} from '../../shared/protocol.ts';
import { CameraError, getCamera, PeerLink, type CameraErrorCode, type RtcState } from './rtc.ts';
import { attention } from './attention.ts';

export type Phase = 'idle' | 'camera' | 'searching' | 'chatting' | 'ended' | 'banned';

export type EndKind = EndReason | 'connection-lost';

/**
 * The store holds no prose, only what happened; views word it in the
 * reader's language, so switching language mid-chat re-words everything.
 */
export type SystemLine = { kind: 'intro'; common: string[] } | { kind: 'end'; reason: EndKind };

export type ToastCode = NoticeCode | ErrorCode | 'too-many-tabs' | 'video-failed';

export interface ChatLine {
  id: string;
  from: 'me' | 'them' | 'system';
  /** The message itself (empty for system lines). */
  text: string;
  ts: number;
  status?: 'sending' | 'sent' | 'failed';
  fail?: AckFailure;
  sys?: SystemLine;
}

export interface Snapshot {
  conn: 'connecting' | 'open' | 'offline';
  online: number | null;
  phase: Phase;
  mode: Mode;
  interests: string[];
  widened: boolean;
  common: string[];
  lines: ChatLine[];
  partnerTyping: boolean;
  partnerMedia: MediaState;
  localMedia: MediaState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  rtc: RtcState;
  endReason: EndKind | null;
  /** A chat (live or just ended) that can still be reported. */
  reportable: boolean;
  startedAt: number | null;
  /** Bumps on every new match, so views can reset per-stranger state. */
  matchId: number;
  ban: { until: number; reason: BanReason } | null;
  relayAvailable: boolean;
  widenAfterMs: number;
  cameraError: CameraErrorCode | null;
  toast: { id: number; code: ToastCode } | null;
}

const REPORT_GRACE_MS = 3 * 60_000;

let seq = 0;
const lineId = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;
const system = (sys: SystemLine): ChatLine => ({ id: lineId(), from: 'system', text: '', sys, ts: Date.now() });

/**
 * Everything about the connection to the server and the current chat, as an
 * external store React subscribes to. Server frames are handled synchronously
 * here (not in effects) so WebRTC signalling is never raced by a render.
 */
export class Session {
  private snap: Snapshot = {
    conn: 'connecting',
    online: null,
    phase: 'idle',
    mode: 'text',
    interests: [],
    widened: false,
    common: [],
    lines: [],
    partnerTyping: false,
    partnerMedia: { cam: true, mic: true },
    localMedia: { cam: true, mic: true },
    localStream: null,
    remoteStream: null,
    rtc: 'idle',
    endReason: null,
    reportable: false,
    startedAt: null,
    matchId: 0,
    ban: null,
    relayAvailable: false,
    widenAfterMs: 8000,
    cameraError: null,
    toast: null,
  };
  private readonly listeners = new Set<() => void>();
  private ws: WebSocket | null = null;
  private retries = 0;
  private retryTimer: number | undefined;
  private findTimer: number | undefined;
  private reportTimer: number | undefined;
  private typingTimer: number | undefined;
  private typingSent = false;
  private iceServers: IceServer[] = [];
  private peer: PeerLink | null = null;
  private search: { mode: Mode; interests: string[]; fallback: boolean } | null = null;
  private toastSeq = 0;

  /** Read at match time, so a settings change applies to the next stranger. */
  relayOnly = true;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snap;

  private set(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    for (const fn of this.listeners) fn();
  }

  private addLine(line: ChatLine) {
    this.set({ lines: [...this.snap.lines, line] });
  }

  toast(code: ToastCode) {
    this.set({ toast: { id: ++this.toastSeq, code } });
  }

  dismissToast() {
    this.set({ toast: null });
  }

  // ─── connection ────────────────────────────────────────────────────────────

  connect() {
    if (this.ws) return;
    window.clearTimeout(this.retryTimer);
    const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
    const ws = new WebSocket(url);
    this.ws = ws;
    this.set({ conn: 'connecting' });

    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') return;
      let msg: ServerMsg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this.handle(msg);
    };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.set({ conn: 'offline' });
      if (this.snap.phase === 'chatting') this.endLocally('connection-lost');

      if (e.code === 4003) return; // banned — the 'banned' frame already explained
      let delay = Math.min(15_000, 1000 * 2 ** this.retries++);
      if (e.code === 4029) {
        this.toast('too-many-tabs');
        delay = 10_000;
      }
      this.retryTimer = window.setTimeout(() => this.connect(), delay);
    };
  }

  private send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private handle(msg: ServerMsg) {
    switch (msg.t) {
      case 'welcome':
        this.retries = 0;
        this.iceServers = msg.iceServers;
        this.set({ conn: 'open', online: msg.online, relayAvailable: msg.relayAvailable, widenAfterMs: msg.widenAfterMs });
        // Picking up where we left off: a search in progress is simply resent.
        if (this.snap.phase === 'searching') this.beginSearch();
        return;

      case 'online':
        return this.set({ online: msg.count });

      case 'queued':
        if (this.snap.phase === 'searching') this.set({ widened: msg.widened });
        return;

      case 'matched': {
        this.closePeer();
        window.clearTimeout(this.reportTimer);
        this.set({
          phase: 'chatting',
          mode: msg.mode,
          common: msg.common,
          lines: [system({ kind: 'intro', common: msg.common })],
          partnerTyping: false,
          partnerMedia: { cam: true, mic: true },
          remoteStream: null,
          rtc: msg.mode === 'video' ? 'connecting' : 'idle',
          endReason: null,
          reportable: true,
          startedAt: Date.now(),
          matchId: this.snap.matchId + 1,
          widened: false,
        });
        if (msg.mode === 'video' && this.snap.localStream) this.startPeer(msg.initiator, this.snap.localStream);
        attention.poke('stranger');
        return;
      }

      case 'chat':
        this.addLine({ id: lineId(), from: 'them', text: msg.text, ts: msg.ts });
        this.set({ partnerTyping: false });
        attention.poke('message');
        return;

      case 'ack':
        return this.set({
          lines: this.snap.lines.map((l) =>
            l.id === msg.id
              ? { ...l, status: msg.ok ? 'sent' : 'failed', fail: msg.ok ? undefined : (msg.reason ?? 'empty') }
              : l,
          ),
        });

      case 'typing':
        return this.set({ partnerTyping: msg.on });

      case 'signal':
        void this.peer?.handle(msg.data);
        return;

      case 'media':
        return this.set({ partnerMedia: msg.state });

      case 'ended':
        return this.endLocally(msg.reason);

      case 'notice':
        return this.toast(msg.code);

      case 'error':
        if (msg.code === 'skipping-fast' && this.snap.phase === 'searching' && msg.retryInMs !== undefined) {
          window.clearTimeout(this.findTimer);
          this.findTimer = window.setTimeout(() => this.beginSearch(), msg.retryInMs + 50);
        }
        return this.toast(msg.code);

      case 'banned':
        this.closePeer();
        this.stopCamera();
        this.search = null;
        return this.set({ phase: 'banned', ban: { until: msg.until, reason: msg.reason }, reportable: false });
    }
  }

  private endLocally(reason: EndKind) {
    this.closePeer();
    this.setTyping(false);
    // We asked for the next stranger ourselves — the old chat closing is old news.
    if (this.snap.phase === 'searching' && reason === 'you-left') return;
    if (this.snap.phase !== 'chatting') return;

    const reportable = reason === 'you-left' || reason === 'partner-left';
    window.clearTimeout(this.reportTimer);
    if (reportable) this.reportTimer = window.setTimeout(() => this.set({ reportable: false }), REPORT_GRACE_MS);
    this.set({
      phase: 'ended',
      endReason: reason,
      partnerTyping: false,
      remoteStream: null,
      rtc: 'idle',
      reportable,
      lines: [...this.snap.lines, system({ kind: 'end', reason })],
    });
  }

  // ─── video ─────────────────────────────────────────────────────────────────

  private startPeer(initiator: boolean, stream: MediaStream) {
    const matchId = this.snap.matchId;
    const live = () => this.snap.matchId === matchId && this.snap.phase === 'chatting';
    this.peer = new PeerLink({
      iceServers: this.iceServers,
      relayOnly: this.relayOnly && this.snap.relayAvailable,
      stream,
      initiator,
      signal: (data) => this.send({ t: 'signal', data }),
      onStream: (remoteStream) => live() && this.set({ remoteStream }),
      onState: (rtc) => {
        if (!live()) return;
        this.set({ rtc });
        if (rtc === 'failed') this.toast('video-failed');
      },
    });
    this.peer.start();
    this.send({ t: 'media', state: this.snap.localMedia });
  }

  private closePeer() {
    this.peer?.close();
    this.peer = null;
  }

  private stopCamera() {
    for (const track of this.snap.localStream?.getTracks() ?? []) track.stop();
    this.set({ localStream: null });
  }

  toggle(kind: 'cam' | 'mic') {
    const stream = this.snap.localStream;
    if (!stream) return;
    const on = !this.snap.localMedia[kind];
    const tracks = kind === 'cam' ? stream.getVideoTracks() : stream.getAudioTracks();
    for (const t of tracks) t.enabled = on;
    const localMedia = { ...this.snap.localMedia, [kind]: on };
    this.set({ localMedia });
    if (this.snap.phase === 'chatting') this.send({ t: 'media', state: localMedia });
  }

  // ─── actions ───────────────────────────────────────────────────────────────

  async start(mode: Mode, interests: string[], fallback: boolean) {
    this.search = { mode, interests, fallback };
    this.set({ mode, interests, cameraError: null });
    if (mode === 'video' && !this.snap.localStream) {
      this.set({ phase: 'camera' });
      try {
        const localStream = await getCamera();
        if (this.snap.phase !== 'camera') {
          for (const t of localStream.getTracks()) t.stop(); // user backed out while we waited
          return;
        }
        this.set({ localStream, localMedia: { cam: true, mic: true } });
      } catch (err) {
        this.search = null;
        this.set({ phase: 'idle', cameraError: err instanceof CameraError ? err.code : 'unknown' });
        return;
      }
    }
    if (mode === 'text') this.stopCamera();
    this.beginSearch();
  }

  /** Skip to the next stranger (or start again after a chat ended). */
  next() {
    if (!this.search) return;
    this.closePeer();
    this.beginSearch();
  }

  private beginSearch() {
    if (!this.search) return;
    window.clearTimeout(this.findTimer);
    this.set({
      phase: 'searching',
      widened: false,
      common: [],
      lines: [],
      partnerTyping: false,
      remoteStream: null,
      rtc: 'idle',
      endReason: null,
      reportable: false,
      startedAt: null,
    });
    this.send({ t: 'find', ...this.search });
  }

  /** Leave whatever is happening and go back to the start screen. */
  stop() {
    window.clearTimeout(this.findTimer);
    this.send({ t: 'leave' });
    this.search = null;
    this.closePeer();
    this.stopCamera();
    this.set({ phase: 'idle', lines: [], common: [], remoteStream: null, rtc: 'idle', reportable: false, endReason: null });
  }

  say(text: string) {
    const trimmed = text.trim();
    if (!trimmed || this.snap.phase !== 'chatting') return;
    const id = lineId();
    this.addLine({ id, from: 'me', text: trimmed, ts: Date.now(), status: 'sending' });
    this.send({ t: 'chat', id, text: trimmed });
    this.setTyping(false);
  }

  /** Call on every keystroke; sends "typing" once and "stopped" after a pause. */
  setTyping(on: boolean) {
    window.clearTimeout(this.typingTimer);
    if (on && this.snap.phase === 'chatting') {
      if (!this.typingSent) this.send({ t: 'typing', on: true });
      this.typingSent = true;
      this.typingTimer = window.setTimeout(() => this.setTyping(false), 3000);
    } else if (this.typingSent) {
      this.typingSent = false;
      this.send({ t: 'typing', on: false });
    }
  }

  report(reason: ReportReason, note: string) {
    this.send({ t: 'report', reason, note: note.trim() || undefined });
    if (this.snap.phase === 'ended') {
      window.clearTimeout(this.reportTimer);
      this.set({ reportable: false });
    }
  }

  block() {
    this.send({ t: 'block' });
    if (this.snap.phase === 'ended') this.set({ reportable: false });
  }
}

export const session = new Session();

export function useSession(): Snapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot);
}
