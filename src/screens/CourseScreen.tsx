import { motion } from 'framer-motion';
import { useState } from 'react';
import { HeroBackground } from '../components/HeroBackground';
import { VirtualKeyboard } from '../components/course/VirtualKeyboard';
import { Hands } from '../components/course/Hands';
import { IconLock } from '../components/Icons';
import { LESSONS, isUnlocked, loadProgress } from '../data/course';
import { FINGER_INFO, HOME_KEYS, type Finger } from '../data/keyboard';
import { audio } from '../lib/audio';
import { LessonPlayer, Stars } from './LessonPlayer';

const POSTURE = [
  { t: 'Coluna reta', d: 'Sente-se com as costas apoiadas e os pés no chão.' },
  { t: 'Pulsos soltos', d: 'Pulsos retos e leves, sem apoiar com força na mesa.' },
  { t: 'Olhos na tela', d: 'Não olhe para o teclado: confie na posição dos dedos.' },
  { t: 'Relevo do F e J', d: 'Os indicadores sempre voltam para as teclas com relevo.' },
];

const LEGEND: Finger[] = ['lp', 'lr', 'lm', 'li', 'th'];

export function CourseScreen() {
  const [lesson, setLesson] = useState<number | null>(null);
  const [progress, setProgress] = useState(loadProgress);

  const open = (i: number) => {
    audio.unlock();
    audio.click();
    setLesson(i);
  };
  const exit = () => {
    setProgress(loadProgress());
    setLesson(null);
  };

  if (lesson !== null) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <HeroBackground intensity={0.35} />
        <LessonPlayer
          index={lesson}
          onExit={exit}
          onNext={() => {
            setProgress(loadProgress());
            setLesson((l) => (l === null ? null : Math.min(LESSONS.length - 1, l + 1)));
          }}
        />
      </div>
    );
  }

  const done = LESSONS.filter((l) => (progress[l.id]?.stars ?? 0) > 0).length;
  const totalStars = LESSONS.reduce((s, l) => s + (progress[l.id]?.stars ?? 0), 0);
  const nextIndex = LESSONS.findIndex((l) => !(progress[l.id]?.stars ?? 0));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroBackground intensity={0.5} />
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-24 sm:px-6 lg:pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <motion.h1 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="font-display text-3xl font-black italic sm:text-5xl">
              CURSO DE DIGITAÇÃO
            </motion.h1>
            <p className="mt-1 font-hud text-lg text-white/50">Aprenda a digitar com os dez dedos, sem olhar para o teclado.</p>
          </div>
          <div className="min-w-[14rem]">
            <div className="flex justify-between">
              <span className="hud-label">Progresso</span>
              <span className="font-display text-xs text-white/60">
                {done}/{LESSONS.length} lições · {totalStars}★
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-volt to-blaze"
                initial={{ width: 0 }}
                animate={{ width: `${(done / LESSONS.length) * 100}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        </div>

        {/* Posição das mãos */}
        <section className="mt-6 cut-corner glass p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            <div>
              <p className="hud-label">Antes de começar</p>
              <h2 className="mt-1 font-display text-xl font-black">Posicione os dedos na fileira do meio</h2>
              <p className="mt-2 font-hud text-base text-white/65">
                Cada dedo é responsável por uma coluna de teclas. As cores do teclado mostram qual dedo aperta cada tecla.
                A partir da posição inicial, o dedo sobe ou desce e depois volta.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {POSTURE.map((p) => (
                  <div key={p.t} className="rounded-md bg-white/5 px-3 py-2.5">
                    <p className="font-display text-xs font-bold text-volt">{p.t}</p>
                    <p className="mt-0.5 font-hud text-sm leading-snug text-white/60">{p.d}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                {LEGEND.map((f) => (
                  <span key={f} className="flex items-center gap-1.5 font-hud text-sm text-white/70">
                    <span className="h-3 w-3 rounded-sm" style={{ background: FINGER_INFO[f].color }} />
                    {FINGER_INFO[f].name}
                    {f === 'li' && <span className="text-white/40">(esq.)</span>}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 font-hud text-sm text-white/70">
                  <span className="h-3 w-3 rounded-sm" style={{ background: FINGER_INFO.ri.color }} />
                  Indicador <span className="text-white/40">(dir.)</span>
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Hands active={['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp', 'th']} showLabel={false} />
            </div>
          </div>
          <div className="mt-5">
            <VirtualKeyboard emphasize={Object.values(HOME_KEYS) as string[]} next={['f', 'j']} />
          </div>
        </section>

        {/* Lições */}
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {LESSONS.map((l, i) => {
            const unlocked = isUnlocked(i, progress);
            const p = progress[l.id];
            const recommended = i === nextIndex;
            return (
              <motion.button
                key={l.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.04 }}
                whileHover={unlocked ? { scale: 1.015 } : undefined}
                disabled={!unlocked}
                onMouseEnter={() => unlocked && audio.hover()}
                onClick={() => open(i)}
                className={`cut-corner relative flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                  recommended ? 'bg-volt/10 ring-1 ring-volt' : 'glass hover:bg-white/10'
                } ${unlocked ? '' : 'cursor-not-allowed opacity-45'}`}
              >
                <span className={`font-display text-3xl font-black italic ${p?.stars ? 'text-emerald-400' : recommended ? 'text-volt' : 'text-white/20'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-base font-bold">{l.title}</span>
                  <span className="block truncate font-hud text-sm text-white/55">{l.subtitle}</span>
                  {p && (
                    <span className="mt-0.5 block font-hud text-xs text-white/40">
                      Melhor: {p.bestWpm} PPM · {p.bestAccuracy}%
                    </span>
                  )}
                </span>
                {unlocked ? (
                  <span className="flex flex-col items-end gap-1">
                    <Stars n={p?.stars ?? 0} size="sm" />
                    {recommended && <span className="font-display text-[9px] font-bold tracking-[0.2em] text-volt">PRÓXIMA</span>}
                  </span>
                ) : (
                  <IconLock className="h-5 w-5 text-white/40" />
                )}
              </motion.button>
            );
          })}
        </section>
      </main>
    </div>
  );
}
