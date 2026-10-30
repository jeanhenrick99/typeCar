import type { TrackTheme } from '../types';

/** Miniatura estilizada do cenário de cada pista */
export function TrackPreview({ track, className = '' }: { track: TrackTheme; className?: string }) {
  const id = `tp-${track.id}`;
  return (
    <svg viewBox="0 0 240 80" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={track.sky[0]} />
          <stop offset="1" stopColor={track.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="240" height="48" fill={`url(#${id}-sky)`} />

      {track.scenery === 'city' && (
        <g>
          {[8, 30, 46, 70, 96, 118, 140, 166, 188, 212].map((x, i) => {
            const h = 14 + ((i * 37) % 26);
            return (
              <g key={x}>
                <rect x={x} y={48 - h} width={16} height={h} fill="#0b0d1c" />
                <rect x={x} y={48 - h} width={16} height={1.2} fill={i % 2 ? track.neon : track.neon2} />
                <rect x={x + 4} y={52 - h} width={2} height={2} fill={track.neon} opacity="0.7" />
                <rect x={x + 9} y={58 - h} width={2} height={2} fill={track.neon2} opacity="0.7" />
              </g>
            );
          })}
          {Array.from({ length: 22 }, (_, i) => (
            <line key={i} x1={i * 11 + 4} y1={(i * 13) % 40} x2={i * 11 + 2} y2={((i * 13) % 40) + 7} stroke="#aac8ff" strokeOpacity="0.45" />
          ))}
        </g>
      )}

      {track.scenery === 'coast' && (
        <g>
          <circle cx="150" cy="38" r="18" fill="#ffb14a" />
          <rect x="128" y="30" width="44" height="2" fill={track.sky[1]} />
          <rect x="128" y="35" width="44" height="2.5" fill={track.sky[1]} />
          <rect y="38" width="240" height="10" fill="#4a1a5a" />
          <rect x="138" y="40" width="24" height="1.2" fill="#ffb14a" opacity="0.7" />
          <rect x="142" y="43" width="16" height="1" fill="#ffb14a" opacity="0.5" />
          {[30, 70, 200].map((x) => (
            <g key={x} stroke="#16061b" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d={`M ${x} 48 Q ${x + 2} 32 ${x + 6} 22`} />
              <path d={`M ${x + 6} 22 q -9 0 -13 6 M ${x + 6} 22 q 9 0 13 6 M ${x + 6} 22 q -4 -5 -10 -4 M ${x + 6} 22 q 4 -5 10 -4`} />
            </g>
          ))}
        </g>
      )}

      {track.scenery === 'desert' && (
        <g>
          <circle cx="205" cy="14" r="7" fill="#fffbe8" />
          <path d="M 10 40 L 18 24 L 62 24 L 70 40 Z" fill="#b4573a" />
          <path d="M 120 40 L 126 30 L 156 30 L 162 40 Z" fill="#b4573a" opacity="0.85" />
          <path d="M 0 48 Q 50 34 110 44 T 240 40 L 240 48 Z" fill="#e7b06b" />
          <g fill="#4a6b34">
            <rect x="92" y="28" width="5" height="20" rx="2.5" />
            <rect x="86" y="33" width="4" height="8" rx="2" />
            <rect x="86" y="39" width="8" height="3" rx="1.5" />
            <rect x="99" y="30" width="4" height="9" rx="2" />
            <rect x="95" y="37" width="8" height="3" rx="1.5" />
          </g>
        </g>
      )}

      {track.scenery === 'arctic' && (
        <g>
          <path d="M 0 22 Q 60 6 120 18 T 240 12" stroke={track.neon} strokeWidth="7" fill="none" opacity="0.35" />
          <path d="M 0 28 Q 70 14 140 24 T 240 18" stroke={track.neon2} strokeWidth="5" fill="none" opacity="0.3" />
          <path d="M 0 48 L 30 26 L 52 40 L 84 18 L 118 44 L 150 22 L 186 42 L 214 28 L 240 40 L 240 48 Z" fill="#0e2038" />
          <path d="M 76 24 L 84 18 L 92 26 Z M 143 27 L 150 22 L 158 28 Z M 25 30 L 30 26 L 36 30 Z" fill="#e8f3ff" />
          {[20, 60, 104, 170, 222].map((x) => (
            <path key={x} d={`M ${x} 48 l 6 -14 l 6 14 Z`} fill="#0b1a28" />
          ))}
        </g>
      )}

      {/* pista */}
      <rect y="48" width="240" height="3" fill={track.curbA} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 20} y="48" width="10" height="3" fill={track.curbB} />
      ))}
      <rect y="51" width="240" height="20" fill={track.asphalt} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={i * 44 + 6} y="60.5" width="24" height="1.4" fill={track.asphaltLine} opacity="0.6" />
      ))}
      <rect y="71" width="240" height="9" fill={track.grass} />
    </svg>
  );
}
