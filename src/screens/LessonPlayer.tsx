import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TypingEngine } from '../game/TypingEngine';
import { TypingPanel } from '../components/race/TypingPanel';
import { VirtualKeyboard } from '../components/course/VirtualKeyboard';
import { Hands } from '../components/course/Hands';
import { GameButton } from '../components/GameButton';
import { IconBack, IconRestart } from '../components/Icons';
import { KEY_BY_ID, strokeHint, strokesFor, type Finger } from '../data/keyboard';
import { LESSONS, buildExercises, saveLessonResult, starsFor } from '../data/course';
import { audio } from '../lib/audio';

interface Props {
  index: number;
  onExit: () => void;
  onNext: () => void;
}

/** Converte KeyboardEvent.code (posição física) na tecla do ABNT2 */
const CODE_TO_KEY: Record<string, string> = {
  Backquote: "'", Minus: '-', Equal: '=', Backspace: 'backspace', Tab: 'tab', BracketLeft: '´', BracketRight: '[',
  Enter: 'enter', CapsLock: 'caps', Semicolon: 'ç', Quote: '~', Backslash: ']', ShiftLeft: 'shiftL', IntlBackslash: '\\',
  Comma: ',', Period: '.', Slash: ';', IntlRo: '/', ShiftRight: 'shiftR', Space: 'space',
};
function keyFromCode(code: string): string | null {
  if (code.startsWith('Key')) return code.slice(3).toLowerCase();
  if (code.startsWith('Digit')) return code.slice(5);
  return CODE_TO_KEY[code] ?? null;
}

interface Totals {
  chars: number;
  keystrokes: number;
  correct: number;
  errors: number;
  ms: number;
}

type Phase = 'intro' | 'typing' | 'done';

function Stars({ n, size = 'lg' }: { n: number; size?: 'sm' | 'lg' }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          className={size === 'lg' ? 'h-12 w-12' : 'h-4 w-4'}
          initial={size === 'lg' ? { scale: 0, rotate: -40 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3 + i * 0.2, type: 'spring', stiffness: 300, damping: 14 }}
        >
          <path
            d="M12 2l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.8 5.7 21.4l1.5-7.1L1.8 9.4 9 8.6z"
            fill={i < n ? '#ffd000' : 'rgba(255,255,255,0.1)'}
            stroke={i < n ? '#ffb000' : 'rgba(255,255,255,0.2)'}
            style={i < n && size === 'lg' ? { filter: 'drop-shadow(0 0 8px rgba(255,200,0,0.7))' } : undefined}
          />
        </motion.svg>
      ))}
    </div>
  );
}

export function LessonPlayer({ index, onExit, onNext }: Props) {
  const lesson = LESSONS[index];
  const [attempt, setAttempt] = useState(0);
  const exercises = useMemo(() => buildExercises(index, attempt), [index, attempt]);
  const [exIdx, setExIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [, setTick] = useState(0);
  const [focused, setFocused] = useState(false);
  const [deadStage, setDeadStage] = useState(0);
  const [flash, setFlash] = useState<{ key: string; ok: boolean; id: number } | null>(null);
  const [totals, setTotals] = useState<Totals>({ chars: 0, keystrokes: 0, correct: 0, errors: 0, ms: 0 });
  const [result, setResult] = useState<{ wpm: number; accuracy: number; errors: number; stars: number } | null>(null);

  const engine = useMemo(() => new TypingEngine(exercises[exIdx] ?? ''), [exercises, exIdx]);
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const startRef = useRef<number | null>(null);
  const activeKeysRef = useRef<string[]>([]);

  // reinicia ao mudar de lição
  useEffect(() => {
    setAttempt(0);
    setExIdx(0);
    setPhase('intro');
    setTotals({ chars: 0, keystrokes: 0, correct: 0, errors: 0, ms: 0 });
    setResult(null);
  }, [index]);

  const start = useCallback(() => {
    audio.unlock();
    setPhase('typing');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const restart = useCallback(() => {
    setAttempt((a) => a + 1);
    setExIdx(0);
    setTotals({ chars: 0, keystrokes: 0, correct: 0, errors: 0, ms: 0 });
    setResult(null);
    startRef.current = null;
    setPhase('typing');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const finishExercise = () => {
    const ms = startRef.current ? performance.now() - startRef.current : 0;
    startRef.current = null;
    const next: Totals = {
      chars: totals.chars + engine.totalChars,
      keystrokes: totals.keystrokes + engine.totalKeystrokes,
      correct: totals.correct + engine.correctKeystrokes,
      errors: totals.errors + engine.errors,
      ms: totals.ms + ms,
    };
    setTotals(next);
    if (exIdx + 1 < exercises.length) {
      audio.streak();
      setTimeout(() => {
        setExIdx((i) => i + 1);
        if (inputRef.current) inputRef.current.value = '';
      }, 500);
      return;
    }
    const minutes = Math.max(next.ms, 1) / 60000;
    const wpm = Math.round(next.chars / 5 / minutes);
    const accuracy = Math.round((next.keystrokes ? (next.correct / next.keystrokes) * 100 : 100) * 10) / 10;
    const stars = starsFor(lesson, wpm, accuracy);
    saveLessonResult(lesson.id, wpm, accuracy, stars);
    setResult({ wpm, accuracy, errors: next.errors, stars });
    setPhase('done');
    inputRef.current?.blur();
    if (stars > 0) audio.win();
    else audio.lose();
  };

  const processInput = (el: HTMLInputElement) => {
    if (phase !== 'typing' || engine.finished) {
      el.value = '';
      return;
    }
    if (startRef.current === null && el.value.length > 0) startRef.current = performance.now();
    const res = engine.setInput(el.value);
    if (el.value !== res.inputValue) el.value = res.inputValue;
    setDeadStage(0);
    if (res.wrong > 0) audio.error();
    else if (res.correct > 0) audio.key();
    if (res.committedWord && !res.finished) audio.word();
    setTick((t) => t + 1);
    if (res.finished) finishExercise();
  };

  // Próxima tecla esperada
  const nextChar = !engine.finished && !engine.hasError ? engine.currentTarget[engine.input.length] : undefined;
  const strokes = nextChar !== undefined ? strokesFor(nextChar) : [];
  const stroke = engine.hasError ? { key: 'backspace' } : strokes[Math.min(deadStage, strokes.length - 1)];
  const activeKeys = stroke ? [stroke.key, ...('shift' in stroke && stroke.shift ? [stroke.shift] : [])] : [];
  const nextKeys = !engine.hasError && deadStage === 0 && strokes[1] ? [strokes[1].key, ...(strokes[1].shift ? [strokes[1].shift] : [])] : [];
  const fingers: Finger[] = activeKeys.map((k) => KEY_BY_ID[k]?.finger).filter(Boolean) as Finger[];
  activeKeysRef.current = activeKeys;

  // Teclado físico: destaque da tecla apertada, acentos e atalhos
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (phase === 'intro' && e.key === 'Enter') {
        e.preventDefault();
        start();
        return;
      }
      if (phase === 'done' && e.key === 'Enter') {
        e.preventDefault();
        if (result && result.stars > 0 && index < LESSONS.length - 1) onNext();
        else restart();
        return;
      }
      if (e.key === 'Escape') {
        onExit();
        return;
      }
      if (phase !== 'typing') return;
      if (document.activeElement !== inputRef.current && e.key.length === 1) inputRef.current?.focus();
      const key = keyFromCode(e.code);
      if (!key) return;
      if (key === 'shiftL' || key === 'shiftR') return;
      if (e.key === 'Dead') setDeadStage(1);
      const ok = activeKeysRef.current.includes(key);
      setFlash({ key, ok, id: Date.now() });
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, [phase, start, restart, onExit, onNext, result, index]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash((f) => (f?.id === flash.id ? null : f)), 160);
    return () => clearTimeout(t);
  }, [flash]);

  const elapsed = startRef.current ? performance.now() - startRef.current : 0;
  const liveMs = totals.ms + elapsed;
  const liveChars = totals.chars + engine.progressChars;
  const liveWpm = liveMs > 1500 ? Math.round(liveChars / 5 / (liveMs / 60000)) : 0;
  const liveKeys = totals.keystrokes + engine.totalKeystrokes;
  const liveAcc = liveKeys ? ((totals.correct + engine.correctKeystrokes) / liveKeys) * 100 : 100;
  const caretIndex = engine.finished ? engine.totalChars : engine.targetOffsets[engine.wordIndex] + Math.min(engine.input.length, engine.currentTarget.length);

  // atualiza PPM ao vivo mesmo sem digitar
  useEffect(() => {
    if (phase !== 'typing') return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [phase]);

  const newKeys = lesson.newKeys;
  const newFingers = [...new Set(newKeys.map((k) => KEY_BY_ID[k]?.finger).filter(Boolean))] as Finger[];

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-28 pt-20 sm:px-6 sm:pt-24 lg:pb-12">
      {/* cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="glass flex h-9 items-center gap-1 rounded-md px-3 font-display text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white">
            <IconBack className="h-4 w-4" /> Lições
          </button>
          <div>
            <p className="hud-label">Lição {index + 1} de {LESSONS.length}</p>
            <h1 className="font-display text-xl font-black italic sm:text-2xl">{lesson.title}</h1>
          </div>
        </div>
        {phase === 'typing' && (
          <div className="flex items-center gap-5">
            <div className="flex gap-1.5">
              {exercises.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-6 skew-x-[-20deg] ${i < exIdx ? 'bg-emerald-400' : i === exIdx ? 'bg-volt shadow-[0_0_8px_#00d4ff]' : 'bg-white/15'}`}
                />
              ))}
            </div>
            <div className="text-right">
              <p className="hud-label">PPM</p>
              <p className="font-display text-2xl font-black leading-none text-volt">{liveWpm}</p>
            </div>
            <div className="text-right">
              <p className="hud-label">Precisão</p>
              <p className={`font-display text-2xl font-black leading-none ${liveAcc >= lesson.minAccuracy ? 'text-white' : 'text-amber-300'}`}>
                {liveAcc.toFixed(0)}%
              </p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]"
          >
            <div className="cut-corner glass p-6">
              <p className="hud-label">Teclas desta lição</p>
              <p className="mt-1 font-display text-2xl font-black tracking-wider text-volt">{lesson.subtitle}</p>
              <ul className="mt-4 space-y-2">
                {lesson.tips.map((t, i) => (
                  <li key={i} className="flex gap-3 font-hud text-lg leading-snug text-white/80">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-blaze" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-hud text-sm text-white/45">
                {exercises.length} exercícios · precisão mínima de {lesson.minAccuracy}% · 3 estrelas com 97% e {lesson.targetWpm} PPM
              </p>
              <GameButton className="mt-6" onClick={start}>
                Começar <span className="text-xs opacity-70">(Enter)</span>
              </GameButton>
            </div>
            <div className="flex items-center justify-center lg:w-72">
              <Hands active={newFingers.length ? newFingers : ['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp']} showLabel={false} />
            </div>
            <div className="lg:col-span-2">
              <VirtualKeyboard emphasize={newKeys} active={newKeys} />
            </div>
          </motion.div>
        )}

        {phase === 'typing' && (
          <motion.div key="typing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 space-y-4">
            <div
              onClick={() => inputRef.current?.focus()}
              className={`relative cursor-text rounded-lg border bg-asphalt-950/80 px-5 py-4 transition-colors ${
                engine.hasError ? 'border-red-500/70' : focused ? 'border-volt/60 shadow-[0_0_30px_rgba(0,212,255,0.15)]' : 'border-white/10'
              }`}
            >
              <TypingPanel
                key={`${attempt}-${exIdx}`}
                text={engine.text}
                states={engine.charStates()}
                overflow={engine.overflow}
                caretIndex={caretIndex}
                hasError={engine.hasError}
                active
                focused={focused}
              />
              <input
                ref={inputRef}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
                aria-label="Digite o exercício"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onPaste={(e) => e.preventDefault()}
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

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="font-hud text-base text-white/60">
                {engine.hasError ? (
                  <span className="text-red-300">Tecla errada — apague com Backspace (mínimo direito)</span>
                ) : nextChar !== undefined ? (
                  <>
                    Próxima tecla:{' '}
                    <span className="rounded bg-white/10 px-2 py-0.5 font-display text-sm font-bold text-white">{strokeHint(nextChar)}</span>
                  </>
                ) : (
                  'Muito bem!'
                )}
              </p>
              {!focused && <p className="font-hud text-sm text-amber-300">Clique no texto ou comece a digitar</p>}
            </div>

            <div className="grid items-center gap-4 lg:grid-cols-[1fr_17rem]">
              <VirtualKeyboard active={activeKeys} next={nextKeys} flash={flash} />
              <Hands active={fingers} shift={!!(stroke && 'shift' in stroke && stroke.shift)} />
            </div>
          </motion.div>
        )}

        {phase === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto mt-10 max-w-xl text-center">
            <div className="cut-corner glass flex flex-col items-center px-6 py-8">
              <Stars n={result.stars} />
              <h2 className={`mt-4 font-display text-3xl font-black italic ${result.stars ? 'text-white' : 'text-amber-300'}`}>
                {result.stars === 3 ? 'PERFEITO!' : result.stars ? 'LIÇÃO CONCLUÍDA' : 'QUASE LÁ'}
              </h2>
              <p className="mt-1 font-hud text-white/60">
                {result.stars
                  ? result.stars < 3
                    ? `Para 3 estrelas: 97% de precisão e ${lesson.targetWpm} PPM.`
                    : 'Você dominou estas teclas.'
                  : `É preciso pelo menos ${lesson.minAccuracy}% de precisão. Vá com calma e olhe para a tela, não para o teclado.`}
              </p>
              <div className="mt-6 grid w-full grid-cols-3 gap-3">
                {[
                  { l: 'PPM', v: result.wpm },
                  { l: 'Precisão', v: `${result.accuracy}%` },
                  { l: 'Erros', v: result.errors },
                ].map((s) => (
                  <div key={s.l} className="rounded-md bg-white/5 px-3 py-3">
                    <p className="hud-label">{s.l}</p>
                    <p className="mt-1 font-display text-2xl font-black">{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                {result.stars > 0 && index < LESSONS.length - 1 && <GameButton onClick={onNext}>Próxima lição</GameButton>}
                <GameButton variant="secondary" onClick={restart} icon={<IconRestart className="h-4 w-4" />}>
                  Repetir
                </GameButton>
                <GameButton variant="ghost" onClick={onExit}>
                  Lições
                </GameButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { Stars };
