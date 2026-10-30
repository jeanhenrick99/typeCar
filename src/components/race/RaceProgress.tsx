import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { Racer } from '../../game/RaceController';

export interface RaceProgressHandle {
  update: (racers: Racer[]) => void;
}

/**
 * Mini-mapa linear da corrida. Atualizado diretamente via ref a cada quadro
 * (sem re-render do React) para movimento fluido.
 */
export const RaceProgress = forwardRef<RaceProgressHandle, { racers: Racer[] }>(function RaceProgress({ racers }, ref) {
  const dots = useRef<Record<string, HTMLDivElement | null>>({});

  useImperativeHandle(ref, () => ({
    update(rs) {
      for (const r of rs) {
        const el = dots.current[r.id];
        if (el) el.style.left = `${Math.min(100, r.visualProgress * 100)}%`;
      }
    },
  }));

  return (
    <div className="relative h-8 w-full">
      <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_18px,rgba(255,255,255,0.08)_18px_20px)]" />
      </div>
      <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-5 w-1 bg-white/80" title="Largada" />
      <div
        className="absolute -right-1 top-1/2 -translate-y-1/2 h-6 w-3 bg-[conic-gradient(#fff_0_25%,#000_0_50%,#fff_0_75%,#000_0)] bg-[length:6px_6px]"
        title="Chegada"
      />
      {racers.map((r) => (
        <div
          key={r.id}
          ref={(el) => (dots.current[r.id] = el)}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: '0%', zIndex: r.isPlayer ? 2 : 1 }}
        >
          <div
            className={`rounded-full border-2 ${r.isPlayer ? 'h-4 w-4 border-white' : 'h-3 w-3 border-asphalt-950'}`}
            style={{ background: r.color, boxShadow: `0 0 10px ${r.color}` }}
          />
          {r.isPlayer && (
            <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 font-display text-[8px] font-bold tracking-widest text-volt">
              VOCÊ
            </span>
          )}
        </div>
      ))}
    </div>
  );
});
