import { useId, type ReactNode, type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

const slash = <path d="M3 3l18 18" />;

export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </Icon>
);

export const VideoIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
    <path d="M15.5 10.5l6-3.5v10l-6-3.5" />
  </Icon>
);

export const VideoOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15.5 10.5l6-3.5v10l-6-3.5M10 6h3a2.5 2.5 0 0 1 2.5 2.5V11M15.5 15.5A2.5 2.5 0 0 1 13 18H5a2.5 2.5 0 0 1-2.5-2.5v-7A2.5 2.5 0 0 1 4.5 6" />
    {slash}
  </Icon>
);

export const MicIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="2.5" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
  </Icon>
);

export const MicOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 10V5.5a3 3 0 0 0-5.7-1.3M9 9v2.5a3 3 0 0 0 4.8 2.4M5 11a7 7 0 0 0 11.5 5.4M19 11c0 .9-.2 1.8-.5 2.6M12 18v3.5" />
    {slash}
  </Icon>
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const EyeOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.7 3.6M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.6 4.9-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    {slash}
  </Icon>
);

export const FlagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 21V4M5 4h11.5l-2.2 4.5L16.5 13H5" />
  </Icon>
);

export const SendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h9M4.3 4.6l15.4 6.6c.7.3.7 1.3 0 1.6L4.3 19.4c-.8.3-1.5-.5-1.2-1.2L6 12 3.1 5.8c-.3-.7.4-1.5 1.2-1.2z" />
  </Icon>
);

export const BulbIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 18h6M10 21.5h4M12 2.5a6.5 6.5 0 0 0-4 11.6c.6.5 1 1.3 1 2.1V17h6v-.8c0-.8.4-1.6 1-2.1a6.5 6.5 0 0 0-4-11.6z" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5v12M7 11l5 5 5-5M4.5 20.5h15" />
  </Icon>
);

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 14.1A8.5 8.5 0 1 1 9.9 3.5a6.8 6.8 0 0 0 10.6 10.6z" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const NextIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5.5l9 6.5-9 6.5z" />
    <path d="M18 5.5v13" />
  </Icon>
);

export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2.5l8 3v6c0 4.7-3.3 8.7-8 10-4.7-1.3-8-5.3-8-10v-6z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </Icon>
);

export const SparkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
  </Icon>
);

export const BlockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21.5s-7-6.1-7-11.5a7 7 0 0 1 14 0c0 5.4-7 11.5-7 11.5z" />
    <circle cx="12" cy="10" r="2.5" />
  </Icon>
);

/** An istikan — the little Iraqi tea glass — in 32×32 units, rim at the top. */
const GLASS = 'M8.5 7h15c0 5-4 7.6-4 12.3 0 2.5 1.5 4 1.5 6.2h-10c0-2.2 1.5-3.7 1.5-6.2C12.5 14.6 8.5 12 8.5 7z';

/** The mark: a glass of chai on its saucer. */
export function Logo({ size = 30 }: { size?: number }) {
  const clip = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="logo-mark">
      <clipPath id={clip}>
        <path d={GLASS} />
      </clipPath>
      <rect x="0" y="10.5" width="32" height="16" fill="var(--tea)" clipPath={`url(#${clip})`} />
      <path d={GLASS} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <ellipse cx="16" cy="28" rx="11" ry="2.3" fill="currentColor" />
    </svg>
  );
}

function Glass({ x, waiting }: { x: number; waiting?: boolean }) {
  const clip = useId().replace(/:/g, '');
  // Sit a 32-unit glass, scaled up, on a saucer centred at x.
  const s = 2.6;
  const tx = x - 16 * s;
  const ty = 93 - 25.5 * s;
  return (
    <g className={waiting ? 'glass waiting' : 'glass'}>
      <ellipse cx={x} cy="96" rx="30" ry="6.5" className="saucer" />
      <ellipse cx={x} cy="94.6" rx="16" ry="2.6" className="saucer-well" />
      <g transform={`translate(${tx} ${ty}) scale(${s})`}>
        <clipPath id={clip}>
          <path d={GLASS} />
        </clipPath>
        {!waiting && (
          <>
            <rect x="0" y="10.5" width="32" height="16" fill="url(#tea-fill)" clipPath={`url(#${clip})`} />
            <rect x="10.4" y="11.5" width="1.6" height="7" rx="0.8" fill="#fff" opacity="0.35" clipPath={`url(#${clip})`} />
          </>
        )}
        <path d={GLASS} className="glass-line" vectorEffect="non-scaling-stroke" />
      </g>
      {!waiting && (
        <g className="steam">
          <path d={`M${x - 7} 40c-5-5 5-9 0-14s5-9 0-14`} />
          <path d={`M${x + 1} 42c-5-5 5-9 0-14s5-9 0-14`} />
          <path d={`M${x + 9} 40c-5-5 5-9 0-14s5-9 0-14`} />
        </g>
      )}
    </g>
  );
}

/**
 * Two glasses of chai — the start screen's welcome. While searching, the
 * second glass is an empty outline waiting for a guest.
 */
export function TeaScene({ waiting = false, className = '' }: { waiting?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={`tea-scene ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tea-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--tea-light)" />
          <stop offset="1" stopColor="var(--tea)" />
        </linearGradient>
      </defs>
      <Glass x={48} />
      <Glass x={112} waiting={waiting} />
      <rect x="74" y="86" width="9" height="9" rx="2" className="sugar" transform="rotate(-8 78.5 90.5)" />
    </svg>
  );
}
