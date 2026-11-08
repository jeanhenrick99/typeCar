import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { RaceResult } from '../types';
import type { Racer } from '../game/RaceController';
import { GameButton } from '../components/GameButton';
import { IconBack, IconFlame, IconRestart, IconShare, IconTrophy } from '../components/Icons';
import { ShareModal } from '../components/ShareModal';
import { getCosmetic, levelInfo, resolveColor, streakTier, type Cosmetic, type RaceReward } from '../lib/progression';
import { useProfile } from '../state/ProfileContext';
import { getTrack } from '../data/tracks';
import { getDifficulty } from '../data/difficulties';
import type { CardData } from '../lib/shareCard';

interface Props {
  result: RaceResult;
  newBest: boolean;
  reward: RaceReward;
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
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none">
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

const KIND_NAME: Record<Cosmetic['kind'], string> = { paint: 'Pintura', wheel: 'Rodas', neon: 'Neon', smoke: 'Nitro' };

/** XP ganho, barra de nível, sequência de dias e itens liberados */
function RewardPanel({ reward }: { reward: RaceReward }) {
  const info = levelInfo(reward.xpTotal);
  const before = levelInfo(reward.xpTotal - reward.xpGained);
  const leveled = reward.levelAfter > reward.levelBefore;
  const startRatio = leveled ? 0 : before.ratio;
  const tier = streakTier(reward.streak);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="cut-corner glass mt-2 flex w-full flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:mt-3"
    >
      <div className="flex items-baseline gap-2" title={reward.xpLines.map((l) => `${l.label}: +${l.xp}`).join(' · ')}>
        <span className="font-display text-2xl font-black italic text-volt text-glow-volt">+{reward.xpGained}</span>
        <span className="font-display text-[10px] font-bold tracking-[0.25em] text-white/55">XP</span>
      </div>

      <div className="min-w-[180px] flex-1">
        <div className="mb-1 flex items-center justify-between font-display text-[10px] font-bold tracking-[0.2em]">
          <span className={leveled ? 'text-blaze animate-pulseGlow' : 'text-white/70'}>
            {leveled ? `SUBIU PARA O NÍVEL ${info.level}!` : `NÍVEL ${info.level}`}
          </span>
          <span className="font-mono text-white/40">
            {info.into}/{info.need}
          </span>
        </div>
        <div className="h-2 skew-x-[-14deg] overflow-hidden bg-black/60 ring-1 ring-white/15">
          <motion.div
            className="h-full bg-gradient-to-r from-blaze to-volt"
            initial={{ width: `${startRatio * 100}%` }}
            animate={{ width: `${info.ratio * 100}%` }}
            transition={{ delay: 0.9, duration: 1.1, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-1 hidden truncate font-hud text-xs text-white/40 sm:block">
          {reward.xpLines.map((l) => `${l.label} +${l.xp}`).join(' · ')}
        </p>
      </div>

      {reward.streak > 0 && (
        <div className="flex items-center gap-1.5" title={`Sequência ${tier.label}`}>
          <IconFlame className="h-6 w-6" style={{ color: tier.color, filter: `drop-shadow(0 0 6px ${tier.color})` }} />
          <div className="leading-none">
            <p className="font-display text-lg font-black" style={{ color: tier.color }}>
              {reward.streak}
            </p>
            <p className="font-display text-[8px] font-bold tracking-[0.2em] text-white/50">{reward.streak === 1 ? 'DIA' : 'DIAS'}</p>
          </div>
        </div>
      )}

      {reward.unlocked.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-1.5">
          <span className="font-display text-[10px] font-bold tracking-[0.2em] text-blaze">LIBERADO NA GARAGEM:</span>
          {reward.unlocked.map((c) => (
            <span key={c.kind + c.id} className="flex items-center gap-1.5 rounded-sm bg-white/10 px-2 py-0.5 font-hud text-xs font-semibold text-white/85">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: c.color === 'rainbow' ? 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' : (c.color ?? '#555') }}
              />
              {KIND_NAME[c.kind]} {c.name}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function ResultsScreen({ result, newBest, reward, racers, onRetry, onMenu }: Props) {
  const { profile } = useProfile();
  const [sharing, setSharing] = useState(false);
  const cardData = useMemo<CardData>(() => {
    const track = getTrack(result.trackId);
    return {
      result,
      nickname: profile.nickname,
      level: reward.levelAfter,
      streak: reward.streak,
      car: result.carId,
      color: profile.color,
      rim: getCosmetic('wheel', profile.wheel).color,
      neon: resolveColor(getCosmetic('neon', profile.neon).color, 1.2),
      trackName: track.name,
      trackColor: track.neon,
      difficultyName: getDifficulty(result.difficulty).name,
    };
    // o card retrata o carro como estava nesta corrida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, reward]);

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

      {/* layout compacto: cabe inteiro na tela, sem precisar rolar */}
      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center px-4 py-4 sm:py-6">
        <motion.div
          initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="relative mb-1"
        >
          {win ? (
            <motion.div
              animate={{ rotate: [0, -6, 6, 0], y: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-yellow-300 to-blaze text-asphalt-950 shadow-[0_0_50px_rgba(255,170,0,0.8)] sm:h-16 sm:w-16"
            >
              <IconTrophy className="h-7 w-7 sm:h-8 sm:w-8" />
            </motion.div>
          ) : (
            <div
              className="grid h-14 w-14 place-items-center rounded-full border-2 font-display text-2xl font-black italic sm:h-16 sm:w-16"
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
          className="text-center font-display text-4xl font-black italic sm:text-6xl"
          style={{ color: win ? '#fff' : accent, textShadow: `0 0 40px ${accent}` }}
        >
          {title}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-1 text-center font-hud text-base text-white/60 sm:text-lg">
          {subtitle}
        </motion.p>

        <div className="mt-5 grid w-full grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
              className={`cut-corner glass relative overflow-hidden px-3 py-2.5 sm:px-4 ${s.highlight ? 'border-volt/40' : ''}`}
            >
              <p className="hud-label">{s.label}</p>
              <p className={`mt-1 font-display text-xl font-black tabular-nums sm:text-3xl ${s.highlight ? 'text-volt text-glow-volt' : 'text-white'}`}>
                {s.value}
              </p>
              {s.sub && (
                <p className={`mt-0.5 font-display text-[9px] font-bold tracking-[0.2em] ${s.sub === 'NOVO RECORDE' ? 'text-blaze animate-pulseGlow' : 'text-white/40'}`}>
                  {s.sub}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        <RewardPanel reward={reward} />

        <div className="mt-2 grid w-full gap-2 sm:mt-3 sm:grid-cols-[1.4fr_1fr] sm:gap-3">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="cut-corner glass hidden px-4 py-2.5 sm:block">
            <p className="hud-label mb-1">Ritmo durante a corrida (PPM)</p>
            <Sparkline values={result.wpmSamples} />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="cut-corner glass px-4 py-2.5">
            <p className="hud-label mb-1">Classificação</p>
            <ol className="space-y-0.5">
              {racers.map((r, i) => (
                <li key={r.id} className={`flex items-center gap-2 font-hud text-sm sm:text-base ${r.isPlayer ? 'font-bold text-white' : 'text-white/60'}`}>
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
          className="mt-5 flex flex-wrap justify-center gap-3 sm:gap-4"
        >
          <GameButton size="lg" onClick={onRetry} icon={<IconRestart className="h-5 w-5" />}>
            Jogar novamente
          </GameButton>
          <GameButton size="lg" variant="secondary" onClick={() => setSharing(true)} icon={<IconShare className="h-5 w-5" />}>
            Compartilhar
          </GameButton>
          <GameButton size="lg" variant="ghost" onClick={onMenu} icon={<IconBack className="h-5 w-5" />}>
            Menu
          </GameButton>
        </motion.div>
        <p className="mt-2 hidden font-hud text-sm text-white/30 sm:block">Enter para correr de novo · Esc para o menu</p>
      </div>
      <AnimatePresence>{sharing && <ShareModal data={cardData} onClose={() => setSharing(false)} />}</AnimatePresence>
    </motion.div>
  );
}
