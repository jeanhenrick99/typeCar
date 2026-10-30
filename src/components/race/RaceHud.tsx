import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconBack, IconRestart, IconVolume } from '../Icons';

export interface BoardRow {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  /** distância em metros em relação ao jogador (positivo = à frente) */
  gap: number;
  finished: boolean;
}

export interface HudData {
  timeMs: number;
  wpm: number;
  accuracy: number;
  position: number;
  speed: number;
  streak: number;
  errors: number;
  progress: number;
  metersLeft: number;
  board: BoardRow[];
}

interface Props {
  hud: HudData;
  totalRacers: number;
  trackName: string;
  trackColor: string;
  difficultyName: string;
  soundOn: boolean;
  onExit: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
}

function formatTime(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return { main: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, cs: String(cs).padStart(2, '0') };
}

function IconButton({ onClick, title, children }: { onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="pointer-events-auto grid h-8 w-8 place-items-center skew-x-[-12deg] border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition hover:border-volt/60 hover:text-volt"
    >
      <span className="skew-x-[12deg]">{children}</span>
    </button>
  );
}

/** HUD sobreposto à pista, no estilo de jogos de corrida arcade. */
export function RaceHud({ hud, totalRacers, trackName, trackColor, difficultyName, soundOn, onExit, onRestart, onToggleSound }: Props) {
  const t = formatTime(hud.timeMs);
  const leader = hud.position === 1;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
      {/* escurecimento para legibilidade */}
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/75 via-black/35 to-transparent sm:h-48" />

      <div className="relative flex items-start justify-between gap-3 px-3 pt-3 sm:px-5 sm:pt-4">
        {/* ── Posição + classificação ── */}
        <div className="flex flex-col gap-2">
          <div className="relative flex items-end gap-1 pl-3">
            <span className={`absolute left-0 top-1 bottom-1 w-[4px] skew-x-[-12deg] ${leader ? 'bg-blaze shadow-[0_0_14px_#ff6a00]' : 'bg-volt shadow-[0_0_14px_#00d4ff]'}`} />
            <AnimatePresence mode="popLayout">
              <motion.span
                key={hud.position}
                initial={{ y: -18, opacity: 0, scale: 1.4 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 18, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                className={`font-display text-5xl font-black italic leading-[0.85] sm:text-7xl ${leader ? 'text-blaze text-glow-blaze' : 'text-white'}`}
              >
                {hud.position}
              </motion.span>
            </AnimatePresence>
            <div className="mb-0.5 flex flex-col leading-none">
              <span className={`font-display text-lg font-black italic sm:text-2xl ${leader ? 'text-blaze' : 'text-white'}`}>º</span>
              <span className="font-display text-xs font-bold text-white/40 sm:text-sm">/{totalRacers}</span>
            </div>
          </div>

          <ol className="hidden w-48 space-y-[3px] md:block">
            {hud.board.map((r, i) => (
              <motion.li
                layout
                key={r.id}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className={`flex h-[22px] items-center gap-2 skew-x-[-12deg] pl-2 pr-2.5 ${
                  r.isPlayer ? 'bg-volt/90 text-asphalt-950' : 'bg-black/55 text-white/85 backdrop-blur-sm'
                }`}
              >
                <span className="flex skew-x-[12deg] items-center gap-2 w-full">
                  <span className={`w-3 font-display text-[11px] font-black ${r.isPlayer ? '' : 'text-white/50'}`}>{i + 1}</span>
                  <span className="h-3 w-[3px]" style={{ background: r.isPlayer ? '#05070d' : r.color }} />
                  <span className="flex-1 truncate font-hud text-[13px] font-bold tracking-wider">{r.isPlayer ? 'VOCÊ' : r.name}</span>
                  <span className={`font-mono text-[10px] font-bold tabular-nums ${r.isPlayer ? '' : 'text-white/55'}`}>
                    {r.finished ? 'FIM' : r.isPlayer ? '' : `${r.gap > 0 ? '+' : ''}${Math.round(r.gap)}m`}
                  </span>
                </span>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* ── Cronômetro central ── */}
        <div className="flex flex-col items-center">
          <p className="mb-1 hidden font-display text-[10px] font-bold tracking-[0.3em] sm:block" style={{ color: trackColor }}>
            {trackName.toUpperCase()} <span className="text-white/35">· {difficultyName.toUpperCase()}</span>
          </p>
          <div
            className="relative bg-black/55 px-6 pb-1.5 pt-1 backdrop-blur-sm sm:px-10"
            style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 14px) 100%, 14px 100%)' }}
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            <p className="font-mono text-2xl font-bold tabular-nums leading-none text-white sm:text-4xl">
              {t.main}
              <span className="text-base text-white/50 sm:text-xl">.{t.cs}</span>
            </p>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-[3px] w-24 overflow-hidden bg-white/15 sm:w-36">
              <div className="h-full bg-gradient-to-r from-volt to-blaze" style={{ width: `${Math.min(100, hud.progress * 100)}%` }} />
            </div>
            <span className="font-display text-[9px] font-bold tracking-[0.2em] text-white/60 tabular-nums sm:text-[10px]">
              {Math.max(0, Math.round(hud.metersLeft))} M
            </span>
          </div>
        </div>

        {/* ── Desempenho + controles ── */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1.5">
            <IconButton onClick={onToggleSound} title={soundOn ? 'Silenciar' : 'Ativar som'}>
              <IconVolume muted={!soundOn} className="h-4 w-4" />
            </IconButton>
            <IconButton onClick={onRestart} title="Reiniciar">
              <IconRestart className="h-4 w-4" />
            </IconButton>
            <IconButton onClick={onExit} title="Sair (Esc)">
              <IconBack className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="flex items-end gap-1.5 pr-1">
            <span className="font-display text-4xl font-black italic leading-none tabular-nums text-volt text-glow-volt sm:text-6xl">{hud.wpm}</span>
            <span className="mb-1 font-display text-[10px] font-bold tracking-[0.25em] text-white/60 sm:text-xs">PPM</span>
          </div>

          <div className="hidden gap-1.5 md:flex">
            <div className="skew-x-[-12deg] bg-black/55 px-3 py-1 backdrop-blur-sm">
              <div className="skew-x-[12deg] flex items-baseline gap-1.5">
                <span className="font-display text-[9px] font-bold tracking-[0.2em] text-white/45">PRECISÃO</span>
                <span className={`font-display text-sm font-black tabular-nums ${hud.accuracy >= 95 ? 'text-emerald-300' : hud.accuracy >= 85 ? 'text-white' : 'text-amber-300'}`}>
                  {hud.accuracy.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="skew-x-[-12deg] bg-black/55 px-3 py-1 backdrop-blur-sm">
              <div className="skew-x-[12deg] flex items-baseline gap-1.5">
                <span className="font-display text-[9px] font-bold tracking-[0.2em] text-white/45">ERROS</span>
                <span className={`font-display text-sm font-black tabular-nums ${hud.errors ? 'text-red-400' : 'text-white'}`}>{hud.errors}</span>
              </div>
            </div>
          </div>

          {hud.streak >= 2 && (
            <motion.div
              key={hud.streak}
              initial={{ scale: 1.3, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`skew-panel px-3 py-0.5 font-display text-[10px] font-bold tracking-[0.2em] sm:text-xs ${
                hud.streak >= 5 ? 'bg-volt text-asphalt-950 shadow-[0_0_16px_rgba(0,212,255,0.6)]' : 'bg-black/55 text-white/80'
              }`}
            >
              COMBO x{hud.streak}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
