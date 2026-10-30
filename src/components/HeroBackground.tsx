import { motion } from 'framer-motion';
import { useMemo } from 'react';

/** Fundo animado: céu neon, skyline, chão em grade com perspectiva e rastros de luz. */
export function HeroBackground({ intensity = 1 }: { intensity?: number }) {
  const streaks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        top: 30 + Math.random() * 65,
        width: 80 + Math.random() * 260,
        delay: Math.random() * 4,
        duration: 0.9 + Math.random() * 1.4,
        color: i % 3 === 0 ? '#ff6a00' : '#00d4ff',
      })),
    [],
  );

  const buildings = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        x: i * 2.6,
        w: 1.6 + Math.random() * 2.2,
        h: 8 + Math.random() * 26,
        neon: Math.random() > 0.75,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* céu */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,#1b1145_0%,#0a0820_45%,#05070d_80%)]" />
      <motion.div
        className="absolute left-1/2 top-[44%] h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.55) 0%, rgba(255,43,214,0.25) 40%, transparent 70%)' }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* skyline */}
      <svg className="absolute inset-x-0 top-[22%] h-[36%] w-full" viewBox="0 0 104 40" preserveAspectRatio="none">
        {buildings.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={40 - b.h} width={b.w} height={b.h} fill="#0a0b1d" />
            {b.neon && <rect x={b.x} y={40 - b.h} width={b.w} height={0.35} fill={i % 2 ? '#ff2bd6' : '#00d4ff'} />}
          </g>
        ))}
      </svg>

      {/* horizonte */}
      <div className="absolute inset-x-0 top-[58%] h-[2px] bg-gradient-to-r from-transparent via-volt to-transparent shadow-[0_0_30px_6px_rgba(0,212,255,0.5)]" />

      {/* chão em grade com perspectiva */}
      <div className="absolute inset-x-0 bottom-0 top-[58%] overflow-hidden [perspective:400px]">
        <div
          className="grid-floor animate-grid absolute -inset-x-1/2 top-0 h-[200%] origin-top"
          style={{ transform: 'rotateX(68deg)', opacity: 0.55 * intensity }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05070d]/20 via-transparent to-asphalt-950" />
      </div>

      {/* rastros de luz */}
      {streaks.map((s, i) => (
        <span
          key={i}
          className="absolute left-0 h-[2px] rounded-full"
          style={{
            top: `${s.top}%`,
            width: s.width,
            background: `linear-gradient(90deg, transparent, ${s.color})`,
            boxShadow: `0 0 12px ${s.color}`,
            animation: `streakFly ${s.duration}s linear ${s.delay}s infinite`,
            opacity: 0,
          }}
        />
      ))}

      {/* vinheta */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
    </div>
  );
}
