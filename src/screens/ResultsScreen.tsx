import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { RaceResult } from '../types';
import type { Racer } from '../game/RaceController';
import { GameButton } from '../components/GameButton';
import { IconBack, IconRestart, IconTrophy } from '../components/Icons';

interface Props {
  result: RaceResult;
  newBest: boolean;
  racers: Racer[];
  onRetry: () => void;
  onMenu: () => void;
}

function formatTime(ms: number) {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${m > 0 ? `${m}:` : ''}${(s % 60).toFixed(2).padStart(m > 0 ? 5 : 4, '0')}s`;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        x: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 2,
        rot: Math.random() * 720 - 360,
        color: ['#ff6a00', '#00d4ff', '#ffffff', '#ffd000', '#ff2bd6'][i % 5],
        w: 6 + Math.random() * 6,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block"
          style={{ left: `${p.x}%`, width: p.w, height: p.w * 0.45, background: p.color }}
          initial={{ y: -40, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: p.rot, opacity: [1, 1, 0] }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn', repeat: Infinity, repeatDelay: Math.random() * 1.5 }}
        />
      ))}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 10);
  const w = 300;
  const h = 60;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - (v / max) * (h - 6) - 3]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#00d4ff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#00d4ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#spark-fill)" />
      <motion.path
        d={d}
        fill="none"
        stroke="#00d4ff"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.6 }}
        style={{ filter: 'drop-shadow(0 0 4px #00d4ff)' }}
      />
    </svg>
  );
}

export function ResultsScreen({ result, newBest, racers, onRetry, onMenu }: Props) {
  const win = result.position === 1;
  const podium = result.position <= 3;
  const title = win ? 'VITÓRIA!' : podium ? 'PÓDIO!' : 'FIM DE PROVA';
  const subtitle = win
    ? 'Você cruzou a linha de chegada em primeiro.'
    : result.finished
      ? 'Você completou a prova. Os rivais foram mais rápidos desta vez.'
      : 'Um rival cruzou a linha de chegada antes de você.';
  const accent = win ? '#ff6a00' : podium ? '#00d4ff' : '#ff2b4a';

  const stats = [
    { label: 'Posição', value: `${result.position}º`, sub: `de ${result.totalRacers}` },
    { label: 'Tempo total', value: formatTime(result.timeMs) },
    { label: 'PPM', value: String(result.wpm), sub: newBest ? 'NOVO RECORDE' : undefined, highlight: true },
    { label: 'Precisão', value: `${result.accuracy.toFixed(1)}%` },
    { label: 'Erros', value: String(result.errors) },
    { label: 'Combo máx.', value: `x${result.maxStreak}` },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-asphalt-950/85 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {win && <Confetti />}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}40 0%, transparent 60%)` }}
      />

      <div className="relative mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="relative mb-2"
        >
          {win ? (
            <motion.div
              animate={{ rotate: [0, -6, 6, 0], y: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-b from-yellow-300 to-blaze text-asphalt-950 shadow-[0_0_60px_rgba(255,170,0,0.8)]"
            >
              <IconTrophy className="h-10 w-10" />
            </motion.div>
          ) : (
            <div
              className="grid h-20 w-20 place-items-center rounded-full border-2 font-display text-3xl font-black italic"
              style={{ borderColor: accent, color: accent, boxShadow: `0 0 40px ${accent}80` }}
            >
              {result.position}º
            </div>
          )}
        </motion.div>

        <motion.h2
          initial={{ y: 30, opacity: 0, letterSpacing: '0.6em' }}
          animate={{ y: 0, opacity: 1, letterSpacing: '0.05em' }}
          transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
          className="text-center font-display text-5xl sm:text-7xl font-black italic"
          style={{ color: win ? '#fff' : accent, textShadow: `0 0 40px ${accent}` }}
        >
          {title}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-2 text-center font-hud text-lg text-white/60">
          {subtitle}
        </motion.p>

        <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
              className={`cut-corner glass relative overflow-hidden px-4 py-4 ${s.highlight ? 'border-volt/40' : ''}`}
            >
              <p className="hud-label">{s.label}</p>
              <p className={`mt-1 font-display text-3xl sm:text-4xl font-black tabular-nums ${s.highlight ? 'text-volt text-glow-volt' : 'text-white'}`}>
                {s.value}
              </p>
              {s.sub && (
                <p className={`mt-0.5 font-display text-[10px] font-bold tracking-[0.25em] ${s.sub === 'NOVO RECORDE' ? 'text-blaze animate-pulseGlow' : 'text-white/40'}`}>
                  {s.sub}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-4 grid w-full gap-3 sm:grid-cols-[1.4fr_1fr]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="cut-corner glass px-4 py-3">
            <p className="hud-label mb-1">Ritmo durante a corrida (PPM)</p>
            <Sparkline values={result.wpmSamples} />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="cut-corner glass px-4 py-3">
            <p className="hud-label mb-2">Classificação</p>
            <ol className="space-y-1">
              {racers.map((r, i) => (
                <li key={r.id} className={`flex items-center gap-2 font-hud text-base ${r.isPlayer ? 'font-bold text-white' : 'text-white/60'}`}>
                  <span className="w-6 font-display text-sm text-white/40">{i + 1}º</span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  <span className="flex-1 truncate">{r.isPlayer ? `${r.name} (você)` : r.name}</span>
                  <span className="font-mono text-xs text-white/40">
                    {r.finishTimeMs !== null ? formatTime(r.finishTimeMs) : `${Math.round(r.progress * 100)}%`}
                  </span>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 flex flex-wrap justify-center gap-4"
        >
          <GameButton size="lg" onClick={onRetry} icon={<IconRestart className="h-5 w-5" />}>
            Jogar novamente
          </GameButton>
          <GameButton size="lg" variant="secondary" onClick={onMenu} icon={<IconBack className="h-5 w-5" />}>
            Voltar ao menu
          </GameButton>
        </motion.div>
        <p className="mt-3 font-hud text-sm text-white/30">Enter para correr de novo · Esc para o menu</p>
      </div>
    </motion.div>
  );
}
