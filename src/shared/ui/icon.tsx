import type { CSSProperties, ReactNode } from 'react';
export function Icon({
  name,
  size = 20,
}: {
  name:
    | 'play'
    | 'pause'
    | 'undo'
    | 'redo'
    | 'download'
    | 'plus'
    | 'close'
    | 'kick'
    | 'snare'
    | 'hat'
    | 'tom'
    | 'cymbal'
    | 'stop'
    | 'upload';
  size?: number;
}) {
  const paths: Record<typeof name, ReactNode> = {
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" strokeWidth="4" />
      </>
    ),
    stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
    undo: (
      <>
        <path d="m9 5-5 5 5 5" />
        <path d="M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -2)" />
      </>
    ),
    redo: (
      <>
        <path d="m15 5 5 5-5 5" />
        <path d="M20 10H10a6 6 0 0 0 0 12" transform="translate(0 -2)" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m-5 5 5-5 5 5M5 16v4h14v-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    kick: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <path d="m6 19-2 3m14-3 2 3" />
      </>
    ),
    snare: (
      <>
        <ellipse cx="12" cy="8" rx="9" ry="4" />
        <path d="M3 8v8c0 5 18 5 18 0V8M7 11v7m10-7v7" />
      </>
    ),
    tom: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v12c0 5 16 5 16 0V5M7 8v10m10-10v10" />
      </>
    ),
    cymbal: (
      <>
        <path d="m2 9 8-3h4l8 3c-4 4-16 4-20 0ZM12 3v17m-5 2 5-4 5 4" />
      </>
    ),
    hat: (
      <>
        <path d="M2 10c3-5 17-5 20 0-5 3-15 3-20 0ZM12 3v18m-5 1 5-4 5 4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 } as CSSProperties}
    >
      {paths[name]}
    </svg>
  );
}
