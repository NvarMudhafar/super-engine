import type { IceCandidate, IceServer, Signal } from '../../shared/protocol.ts';

export type RtcState = 'idle' | 'connecting' | 'connected' | 'failed';

export interface PeerOptions {
  iceServers: IceServer[];
  /** Only use TURN relays, so the stranger never learns our IP address. */
  relayOnly: boolean;
  stream: MediaStream;
  initiator: boolean;
  signal: (s: Signal) => void;
  onStream: (s: MediaStream) => void;
  onState: (s: RtcState) => void;
}

/**
 * One WebRTC call. The server picks exactly one side to make the offer, so
 * there is no glare to resolve; candidates that arrive before the remote
 * description are held until it lands. If the connection fails, the offerer
 * tries a single ICE restart before giving up.
 */
export class PeerLink {
  private readonly pc: RTCPeerConnection;
  private readonly opts: PeerOptions;
  private pending: RTCIceCandidateInit[] = [];
  private closed = false;
  private restarted = false;

  constructor(opts: PeerOptions) {
    this.opts = opts;
    this.pc = new RTCPeerConnection({
      iceServers: opts.iceServers,
      iceTransportPolicy: opts.relayOnly ? 'relay' : 'all',
    });
    for (const track of opts.stream.getTracks()) this.pc.addTrack(track, opts.stream);

    this.pc.ontrack = (e) => opts.onStream(e.streams[0] ?? new MediaStream([e.track]));
    this.pc.onicecandidate = (e) =>
      opts.signal({ kind: 'ice', candidate: e.candidate ? (e.candidate.toJSON() as IceCandidate) : null });
    this.pc.onconnectionstatechange = () => {
      if (this.closed) return;
      const s = this.pc.connectionState;
      if (s === 'connected') opts.onState('connected');
      else if (s === 'failed') {
        if (opts.initiator && !this.restarted) {
          this.restarted = true;
          opts.onState('connecting');
          void this.offer(true);
        } else opts.onState('failed');
      } else if (s === 'connecting' || s === 'new') opts.onState('connecting');
    };
  }

  start() {
    this.opts.onState('connecting');
    if (this.opts.initiator) void this.offer(false);
  }

  async handle(s: Signal) {
    if (this.closed) return;
    try {
      if (s.kind === 'offer') {
        await this.pc.setRemoteDescription({ type: 'offer', sdp: s.sdp });
        await this.flush();
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.opts.signal({ kind: 'answer', sdp: answer.sdp ?? '' });
      } else if (s.kind === 'answer') {
        await this.pc.setRemoteDescription({ type: 'answer', sdp: s.sdp });
        await this.flush();
      } else if (s.candidate && s.candidate.candidate) {
        if (this.pc.remoteDescription) await this.pc.addIceCandidate(s.candidate);
        else this.pending.push(s.candidate);
      }
    } catch (err) {
      console.warn('[rtc]', err);
    }
  }

  close() {
    this.closed = true;
    this.pc.ontrack = this.pc.onicecandidate = this.pc.onconnectionstatechange = null;
    this.pc.close();
  }

  private async offer(iceRestart: boolean) {
    try {
      const offer = await this.pc.createOffer({ iceRestart });
      if (this.closed) return;
      await this.pc.setLocalDescription(offer);
      this.opts.signal({ kind: 'offer', sdp: offer.sdp ?? '' });
    } catch (err) {
      console.warn('[rtc]', err);
      this.opts.onState('failed');
    }
  }

  private async flush() {
    const queued = this.pending;
    this.pending = [];
    for (const c of queued) await this.pc.addIceCandidate(c).catch(() => {});
  }
}

/** Ask for camera + microphone, turning browser errors into something a person can act on. */
export async function getCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Video needs a secure connection (https or localhost) and a browser with camera support.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new Error("Camera and microphone access is blocked. Allow it in your browser's site settings, or use text chat.");
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      throw new Error('No camera or microphone was found on this device.');
    }
    if (name === 'NotReadableError') {
      throw new Error('Your camera is being used by another app. Close it and try again.');
    }
    throw new Error('Could not start your camera.');
  }
}
