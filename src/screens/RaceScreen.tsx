import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RaceController } from '../game/RaceController';
import { RaceRenderer } from '../game/RaceRenderer';
import { buildRaceText } from '../data/texts';
import { getDuration, targetCharsFor } from '../data/durations';
import { getTrack } from '../data/tracks';
import { getDifficulty } from '../data/difficulties';
import { useProfile } from '../state/ProfileContext';
import { audio } from '../lib/audio';
import { submitScore } from '../lib/leaderboard';
import { TypingPanel } from '../components/race/TypingPanel';
import { SpeedGauge } from '../components/race/SpeedGauge';
import { Countdown } from '../components/race/Countdown';
import { RaceProgress, type RaceProgressHandle } from '../components/race/RaceProgress';
import { RaceHud, type HudData } from '../components/race/RaceHud';
import { ResultsScreen } from './ResultsScreen';
import type { RaceResult } from '../types';

interface Props {
  onExit: () => void;
  onRestart: () => void;
}


const ORDINAL = ['1º', '2º', '3º', '4º', '5º'];

export function RaceScreen({ onExit, onRestart }: Props) {
  const { profile, update, recordResult } = useProfile();
  const track = getTrack(profile.trackId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<RaceProgressHandle>(null);
  const rendererRef = useRef<RaceRenderer | null>(null);
  const composing = useRef(false);

  const [count, setCount] = useState<number | null>(3);
  const [, setTypingTick] = useState(0);
  const [focused, setFocused] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string; good: boolean } | null>(null);
  const [result, setResult] = useState<{ r: RaceResult; newBest: boolean } | null>(null);
  const [hud, setHud] = useState<HudData>({
    timeMs: 0,
    wpm: 0,
    accuracy: 100,
    position: 1,
    speed: 0,
    streak: 0,
    errors: 0,
    progress: 0,
    metersLeft: 0,
    board: [],
  });

  const showToast = useCallback((text: string, good: boolean) => setToast({ id: Date.now(), text, good }), []);

  // Controlador criado uma única vez por montagem (reiniciar = nova montagem)
  const race = useMemo(
    () =>
      new RaceController(
        {
          text: buildRaceText(targetCharsFor(profile.duration, profile.difficulty)),
          difficulty: profile.difficulty,
          playerName: profile.nickname,
          playerColor: profile.color,
          playerCar: profile.carId,
          trackId: track.id,
        },
        {},
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Eventos do controlador → áudio/efeitos/UI
  useEffect(() => {
    race.setEvents({
        onCountdownTick: (n: number) => {
          setCount(n);
          audio.countdown();
        },
        onGo: () => {
          setCount(0);
          audio.go();
          audio.startEngine(profile.carId);
          rendererRef.current?.burst();
          inputRef.current?.focus();
          setTimeout(() => setCount(null), 800);
        },
        onKey: (ok: boolean, char: string) => {
          if (ok) audio.key(char);
          else {
            audio.error();
            rendererRef.current?.bump(3);
          }
        },
        onWord: (streak: number) => {
          if (streak > 0 && streak % 5 === 0) {
            audio.streak();
            showToast(`COMBO x${streak} · NITRO!`, true);
          } else audio.word();
        },
        onOvertake: (gained: boolean) => {
          audio.overtake(gained);
          showToast(gained ? `ULTRAPASSAGEM! ${ORDINAL[race.position - 1]} LUGAR` : `PERDEU POSIÇÃO · ${ORDINAL[race.position - 1]}`, gained);
        },
        onFinish: (r: RaceResult) => {
          audio.stopEngine();
          inputRef.current?.blur();
          const { newBest } = recordResult(r);
          if (r.finished && r.chars > 0) {
            void submitScore({
              player: profile.nickname,
              wpm: r.wpm,
              accuracy: r.accuracy,
              time_ms: Math.round(r.timeMs),
              position: r.position,
              difficulty: r.difficulty,
              car: r.carId,
            });
          }
          setTimeout(() => {
            setResult({ r, newBest });
            if (r.position === 1) audio.win();
            else audio.lose();
          }, 1400);
        },
    });
    audio.countdown();
    return () => audio.stopEngine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race]);

  // Renderizador + loop principal
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = canvasBoxRef.current;
    if (!canvas || !box) return;
    const renderer = new RaceRenderer(canvas, race, track);
    rendererRef.current = renderer;

    const ro = new ResizeObserver(() => renderer.resize());
    ro.observe(box);

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      race.update(dt);
      renderer.render(dt);
      progressRef.current?.update(race.racers);
      audio.setEngineSpeed(race.player.speed);

      hudAcc += dt;
      if (hudAcc > 66) {
        hudAcc = 0;
        const meters = race.trackMeters;
        const me = race.player.progress;
        setHud({
          progress: me,
          metersLeft: (1 - me) * meters,
          board: race.standings().map((r) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            isPlayer: r.isPlayer,
            gap: (r.progress - me) * meters,
            finished: r.finishTimeMs !== null,
          })),
          timeMs: race.elapsedMs,
          wpm: Math.round(race.wpm),
          accuracy: race.typing.accuracy,
          position: race.position,
          speed: race.player.speed,
          streak: race.typing.streak,
          errors: race.typing.errors,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      rendererRef.current = null;
    };
  }, [race, track]);

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      } else if (result && e.key === 'Enter') {
        e.preventDefault();
        onRestart();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (!result) inputRef.current?.focus();
      } else if (!result && race.canType && document.activeElement !== inputRef.current && e.key.length === 1) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit, onRestart, result, race]);

  const processInput = (el: HTMLInputElement) => {
    const res = race.handleInput(el.value);
    if (!res) {
      el.value = '';
      return;
    }
    if (el.value !== res.inputValue) el.value = res.inputValue;
    setTypingTick((t) => t + 1);
  };

  const typing = race.typing;
  const caretIndex = typing.finished
    ? typing.totalChars
    : typing.targetOffsets[typing.wordIndex] + Math.min(typing.input.length, typing.currentTarget.length);
  const nitro = hud.streak >= 5 && hud.speed > 60;
  const diff = getDifficulty(profile.difficulty);

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-asphalt-950">
      {/* Cena da corrida */}
      <div ref={canvasBoxRef} className="relative min-h-[38vh] flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <Countdown value={count} />

        <div className="pointer-events-none absolute bottom-3 left-3 z-10 sm:bottom-4 sm:left-4">
          <SpeedGauge speed={hud.speed} nitro={nitro} />
        </div>

        <RaceHud
          hud={hud}
          totalRacers={race.racers.length}
          trackName={track.name}
          trackColor={track.neon}
          difficultyName={`${diff.name} · ${getDuration(profile.duration).label}`}
          soundOn={profile.sfx}
          onExit={onExit}
          onRestart={onRestart}
          onToggleSound={() => update({ sfx: !profile.sfx })}
        />

        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center sm:top-36">
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.id}
                initial={{ y: -20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onAnimationComplete={() => setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), 900)}
                className={`skew-panel px-5 py-1.5 font-display text-xs sm:text-sm font-black italic tracking-[0.2em] ${
                  toast.good ? 'bg-blaze text-white shadow-[0_0_30px_rgba(255,106,0,0.6)]' : 'bg-red-600/90 text-white'
                }`}
              >
                {toast.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progresso + digitação */}
      <section className="relative z-20 border-t border-white/10 bg-gradient-to-b from-asphalt-900 to-asphalt-950 px-3 pb-3 pt-2 sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 px-1">
            <RaceProgress ref={progressRef} racers={race.racers} />
          </div>
          <div
            onClick={() => inputRef.current?.focus()}
            className={`relative cursor-text rounded-lg border bg-asphalt-950/80 px-4 py-3 sm:px-6 sm:py-4 transition-colors ${
              typing.hasError
                ? 'border-red-500/70 shadow-[0_0_30px_rgba(255,40,60,0.25)]'
                : focused && race.canType
                  ? 'border-volt/60 shadow-[0_0_30px_rgba(0,212,255,0.15)]'
                  : 'border-white/10'
            }`}
          >
            <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-volt to-blaze" />
            <TypingPanel
              text={typing.text}
              states={typing.charStates()}
              overflow={typing.overflow}
              caretIndex={caretIndex}
              hasError={typing.hasError}
              active={race.phase !== 'countdown'}
              focused={focused}
            />
            <input
              ref={inputRef}
              className="absolute inset-0 h-full w-full cursor-text opacity-0"
              aria-label="Digite o texto da corrida"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="next"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              onCompositionStart={() => (composing.current = true)}
              onCompositionEnd={(e) => {
                composing.current = false;
                processInput(e.currentTarget);
              }}
              onInput={(e) => {
                if (composing.current) return;
                processInput(e.currentTarget);
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between px-1 font-hud text-xs sm:text-sm text-white/40">
            <span>
              {race.phase === 'countdown'
                ? 'Prepare-se… a digitação libera no GO!'
                : typing.hasError
                  ? 'Corrija o erro com Backspace para continuar acelerando'
                  : !focused && race.canType
                    ? 'Clique aqui ou comece a digitar'
                    : 'Digite o texto — cada letra correta acelera o carro'}
            </span>
            <span className="hidden sm:inline">
              Esc sair · Tab focar
            </span>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {result && <ResultsScreen result={result.r} newBest={result.newBest} racers={race.standings()} onRetry={onRestart} onMenu={onExit} />}
      </AnimatePresence>
    </div>
  );
}
