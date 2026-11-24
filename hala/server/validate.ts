import { LIMITS, REPORT_REASONS, type ClientMsg, type IceCandidate, type Signal } from '../shared/protocol.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const optStr = (v: unknown, max: number) => v === undefined || v === null || isStr(v, max);

function parseSignal(v: unknown): Signal | null {
  if (!isObj(v)) return null;
  if ((v.kind === 'offer' || v.kind === 'answer') && isStr(v.sdp, LIMITS.signal)) {
    return { kind: v.kind, sdp: v.sdp };
  }
  if (v.kind === 'ice') {
    if (v.candidate === null) return { kind: 'ice', candidate: null };
    const c = v.candidate;
    if (!isObj(c) || !isStr(c.candidate, 2048)) return null;
    if (!optStr(c.sdpMid, 64) || !optStr(c.usernameFragment, 256)) return null;
    if (c.sdpMLineIndex !== undefined && c.sdpMLineIndex !== null && !Number.isInteger(c.sdpMLineIndex)) return null;
    const candidate: IceCandidate = {
      candidate: c.candidate,
      sdpMid: (c.sdpMid as string | null | undefined) ?? null,
      sdpMLineIndex: (c.sdpMLineIndex as number | null | undefined) ?? null,
    };
    if (typeof c.usernameFragment === 'string') candidate.usernameFragment = c.usernameFragment;
    return { kind: 'ice', candidate };
  }
  return null;
}

/**
 * Turn an untrusted frame into a ClientMsg, or null if it is malformed.
 * Never throws. Only the fields we know about are copied across.
 */
export function parseClientMsg(raw: string): ClientMsg | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(v) || typeof v.t !== 'string') return null;

  switch (v.t) {
    case 'find': {
      if (v.mode !== 'text' && v.mode !== 'video') return null;
      if (!Array.isArray(v.interests) || v.interests.length > 50) return null;
      return {
        t: 'find',
        mode: v.mode,
        interests: v.interests.filter((i): i is string => isStr(i, 200)),
        fallback: v.fallback !== false,
      };
    }
    case 'cancel':
    case 'leave':
    case 'block':
      return { t: v.t };
    case 'chat':
      if (!isStr(v.id, 40) || typeof v.text !== 'string' || v.text.length > LIMITS.message * 4) return null;
      return { t: 'chat', id: v.id, text: v.text };
    case 'typing':
      return { t: 'typing', on: v.on === true };
    case 'signal': {
      const data = parseSignal(v.data);
      return data ? { t: 'signal', data } : null;
    }
    case 'media':
      if (!isObj(v.state)) return null;
      return { t: 'media', state: { cam: v.state.cam === true, mic: v.state.mic === true } };
    case 'report': {
      const reason = REPORT_REASONS.find((r) => r === v.reason);
      if (!reason || !optStr(v.note, LIMITS.reportNote * 4)) return null;
      return { t: 'report', reason, note: typeof v.note === 'string' ? v.note : undefined };
    }
    default:
      return null;
  }
}
