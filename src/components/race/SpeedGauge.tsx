interface Props {
  speed: number;
  max?: number;
  nitro?: boolean;
}

/** Velocímetro em arco */
export function SpeedGauge({ speed, max = 400, nitro }: Props) {
  const r = 52;
  const start = 135;
  const sweep = 270;
  const k = Math.min(1, speed / max);
  const circ = 2 * Math.PI * r;
  const arcLen = (sweep / 360) * circ;
  const ticks = Array.from({ length: 9 }, (_, i) => i);

  return (
    <div className="relative h-[124px] w-[124px] sm:h-[140px] sm:w-[140px]">
      <svg viewBox="0 0 140 140" className="h-full w-full">
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#00d4ff" />
            <stop offset="0.6" stopColor="#00d4ff" />
            <stop offset="1" stopColor="#ff6a00" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r="66" fill="rgba(5,7,13,0.85)" stroke="rgba(255,255,255,0.08)" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="9"
          strokeDasharray={`${arcLen} ${circ}`}
          transform={`rotate(${start} 70 70)`}
          strokeLinecap="round"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth="9"
          strokeDasharray={`${arcLen * k} ${circ}`}
          transform={`rotate(${start} 70 70)`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 120ms linear', filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.7))' }}
        />
        {ticks.map((i) => {
          const a = ((start + (sweep / 8) * i) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={70 + Math.cos(a) * 40}
              y1={70 + Math.sin(a) * 40}
              x2={70 + Math.cos(a) * 44}
              y2={70 + Math.sin(a) * 44}
              stroke={i >= 7 ? '#ff6a00' : 'rgba(255,255,255,0.4)'}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-3xl sm:text-4xl font-black tabular-nums leading-none ${nitro ? 'text-volt text-glow-volt' : 'text-white'}`}>
          {Math.round(speed)}
        </span>
        <span className="mt-1 font-display text-[9px] tracking-[0.3em] text-white/50">KM/H</span>
        {nitro && <span className="mt-1 font-display text-[9px] font-bold tracking-[0.25em] text-volt animate-pulseGlow">NITRO</span>}
      </div>
    </div>
  );
}
