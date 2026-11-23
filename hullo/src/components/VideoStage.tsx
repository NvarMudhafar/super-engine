import { useEffect, useRef } from 'react';
import { session, type Snapshot } from '../lib/session.ts';
import { EyeIcon, EyeOffIcon, MicIcon, MicOffIcon, VideoIcon, VideoOffIcon } from './Icons.tsx';

function useStream(stream: MediaStream | null) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    if (stream) el.play().catch(() => {});
  }, [stream]);
  return ref;
}

export function VideoStage({
  snap,
  revealed,
  setRevealed,
}: {
  snap: Snapshot;
  revealed: boolean;
  setRevealed: (v: boolean) => void;
}) {
  const remote = useStream(snap.remoteStream);
  const local = useStream(snap.localStream);
  const chatting = snap.phase === 'chatting';
  const hasVideo = chatting && snap.remoteStream !== null;
  const camOff = hasVideo && !snap.partnerMedia.cam;
  const blurred = hasVideo && !revealed && !camOff;

  let overlay: string | null = null;
  if (snap.phase === 'searching' || snap.phase === 'camera') overlay = 'Looking for someone…';
  else if (snap.phase === 'ended') overlay = 'Chat ended';
  else if (chatting && snap.rtc === 'failed') overlay = "Video couldn't connect — you can still text.";
  else if (chatting && !snap.remoteStream) overlay = 'Connecting video…';
  else if (camOff) overlay = "Stranger's camera is off";

  return (
    <section className="stage" aria-label="Video">
      <div className={`remote${blurred ? ' is-blurred' : ''}${hasVideo && !camOff ? ' has-video' : ''}`}>
        <video ref={remote} autoPlay playsInline aria-label="Stranger's video" />
        {overlay && (
          <div className="stage-overlay">
            {(snap.phase === 'searching' || (chatting && !snap.remoteStream && snap.rtc !== 'failed')) && (
              <span className="spinner" aria-hidden="true" />
            )}
            <span>{overlay}</span>
          </div>
        )}
        {blurred && (
          <div className="reveal">
            <button type="button" className="btn reveal-btn" onClick={() => setRevealed(true)}>
              <EyeIcon size={18} /> Show video
            </button>
            <span>Blurred until you choose. Report it if anything's wrong.</span>
          </div>
        )}
        {hasVideo && !snap.partnerMedia.mic && (
          <span className="badge muted-badge">
            <MicOffIcon size={14} /> Stranger is muted
          </span>
        )}
      </div>

      <div className={`self-view${snap.localMedia.cam ? '' : ' off'}`}>
        <video ref={local} autoPlay playsInline muted aria-label="Your video" />
        {!snap.localMedia.cam && (
          <div className="self-off">
            <VideoOffIcon size={20} />
          </div>
        )}
      </div>

      <div className="stage-controls">
        <button
          type="button"
          className={`round-btn${snap.localMedia.mic ? '' : ' off'}`}
          aria-pressed={!snap.localMedia.mic}
          aria-label={snap.localMedia.mic ? 'Mute microphone' : 'Unmute microphone'}
          title={snap.localMedia.mic ? 'Mute' : 'Unmute'}
          onClick={() => session.toggle('mic')}
        >
          {snap.localMedia.mic ? <MicIcon /> : <MicOffIcon />}
        </button>
        <button
          type="button"
          className={`round-btn${snap.localMedia.cam ? '' : ' off'}`}
          aria-pressed={!snap.localMedia.cam}
          aria-label={snap.localMedia.cam ? 'Turn camera off' : 'Turn camera on'}
          title={snap.localMedia.cam ? 'Camera off' : 'Camera on'}
          onClick={() => session.toggle('cam')}
        >
          {snap.localMedia.cam ? <VideoIcon /> : <VideoOffIcon />}
        </button>
        {hasVideo && !camOff && (
          <button
            type="button"
            className="round-btn"
            aria-label={revealed ? "Blur stranger's video" : "Show stranger's video"}
            title={revealed ? 'Blur their video' : 'Show their video'}
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </section>
  );
}
