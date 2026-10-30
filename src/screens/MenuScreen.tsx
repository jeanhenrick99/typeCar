import { motion } from 'framer-motion';
import { HeroBackground } from '../components/HeroBackground';
import { Logo } from '../components/Logo';
import { GameButton } from '../components/GameButton';
import { CarPhoto } from '../components/CarPhoto';
import { IconBolt, IconGarage } from '../components/Icons';
import { useProfile } from '../state/ProfileContext';
import { DIFFICULTIES } from '../data/difficulties';
import { DURATIONS } from '../data/durations';
import { getCarModel } from '../data/cars';
import { getTrack } from '../data/tracks';
import { audio } from '../lib/audio';

interface Props {
  onPlay: () => void;
  onGarage: () => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, x: -30 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 220, damping: 24 } },
};

export function MenuScreen({ onPlay, onGarage }: Props) {
  const { profile, update } = useProfile();
  const car = getCarModel(profile.carId);
  const track = getTrack(profile.trackId);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroBackground />

      {/* estrada com perspectiva sob o carro */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[6%] h-[22%] overflow-hidden">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden">
          <div className="animate-road flex h-full w-[200%] gap-[60px]">
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className="h-full w-[100px] shrink-0 bg-white/40" />
            ))}
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-24 pt-24 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-12">
        <motion.section variants={container} initial="hidden" animate="show" className="order-2 lg:order-1">
          <motion.p variants={item} className="mb-4 inline-flex items-center gap-2 font-display text-[11px] font-bold tracking-[0.35em] text-volt">
            <span className="h-[2px] w-8 bg-volt shadow-[0_0_10px_#00d4ff]" />
            TEMPORADA 01 · CORRIDA DE DIGITAÇÃO
          </motion.p>
          <motion.div variants={item}>
            <Logo size="lg" />
          </motion.div>
          <motion.p variants={item} className="mt-5 max-w-lg font-hud text-lg sm:text-xl font-medium leading-snug text-white/70">
            Seus dedos são o motor. Digite rápido, sem errar, e deixe os rivais comendo poeira até a bandeira quadriculada.
          </motion.p>

          <motion.div variants={item} className="mt-7">
            <p className="hud-label mb-2">Nível dos rivais</p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => {
                const active = d.id === profile.difficulty;
                return (
                  <button
                    key={d.id}
                    onMouseEnter={() => audio.hover()}
                    onClick={() => {
                      audio.unlock();
                      audio.click();
                      update({ difficulty: d.id });
                    }}
                    title={d.description}
                    className={`skew-panel px-4 py-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] transition-all ${
                      active
                        ? 'bg-volt text-asphalt-950 shadow-[0_0_20px_rgba(0,212,255,0.6)]'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 font-hud text-sm text-white/40">{DIFFICULTIES.find((d) => d.id === profile.difficulty)?.description}</p>
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <p className="hud-label mb-2">Duração média da corrida</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => {
                const active = d.seconds === profile.duration;
                return (
                  <button
                    key={d.seconds}
                    onMouseEnter={() => audio.hover()}
                    onClick={() => {
                      audio.unlock();
                      audio.click();
                      update({ duration: d.seconds });
                    }}
                    className={`skew-panel flex items-baseline gap-2 px-4 py-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] transition-all ${
                      active
                        ? 'bg-blaze text-white shadow-[0_0_20px_rgba(255,106,0,0.55)]'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {d.label}
                    <span className={`font-hud text-xs normal-case tracking-normal ${active ? 'text-white/80' : 'text-white/35'}`}>{d.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-4">
            <GameButton size="xl" onClick={onPlay} icon={<IconBolt className="h-6 w-6" />}>
              Jogar agora
            </GameButton>
            <GameButton size="lg" variant="secondary" onClick={onGarage} icon={<IconGarage className="h-5 w-5" />}>
              Garagem
            </GameButton>
          </motion.div>
          <motion.p variants={item} className="mt-3 font-hud text-sm text-white/40">
            Pressione <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white/70">Enter</kbd> para largar
          </motion.p>

          <motion.div variants={item} className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            {[
              { label: 'Recorde PPM', value: profile.stats.bestWpm || '—', accent: 'text-blaze' },
              { label: 'Vitórias', value: profile.stats.wins, accent: 'text-volt' },
              { label: 'Corridas', value: profile.stats.races, accent: 'text-white' },
            ].map((s) => (
              <div key={s.label} className="cut-corner glass px-4 py-3">
                <p className="hud-label">{s.label}</p>
                <p className={`mt-1 font-display text-2xl sm:text-3xl font-black ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </motion.div>
        </motion.section>

        <section className="relative order-1 lg:order-2">
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.2 }}
            className="relative"
          >
            {/* rastros atrás do carro */}
            <div className="absolute left-[-10%] top-[45%] w-1/2 space-y-3 opacity-70">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="h-[2px] rounded-full bg-gradient-to-r from-transparent to-volt"
                  style={{ width: `${60 + i * 12}%`, marginLeft: `${i * 8}%` }}
                  animate={{ x: [0, -40, 0], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.6 + i * 0.15, repeat: Infinity }}
                />
              ))}
            </div>
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}>
              <CarPhoto model={car.id} color={profile.color} spinning className="relative drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)]" />
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-2 flex items-end justify-between gap-4 px-2"
          >
            <div>
              <p className="hud-label">Seu carro</p>
              <p className="font-display text-xl sm:text-2xl font-black italic">{car.name}</p>
            </div>
            <div className="text-right">
              <p className="hud-label">Pista</p>
              <p className="font-display text-base sm:text-lg font-bold" style={{ color: track.neon }}>
                {track.name}
              </p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* como jogar */}
      <div className="relative z-10 mx-auto hidden max-w-7xl grid-cols-3 gap-4 px-6 pb-16 lg:grid">
        {[
          { n: '01', t: 'Digite', d: 'Cada letra correta empurra seu carro para frente.' },
          { n: '02', t: 'Acelere', d: 'Quanto maior seu PPM, maior sua velocidade. 5 palavras perfeitas ativam o nitro.' },
          { n: '03', t: 'Vença', d: 'Erros travam o carro até serem corrigidos. Precisão é velocidade.' },
        ].map((s) => (
          <div key={s.n} className="glass cut-corner flex gap-4 p-5">
            <span className="font-display text-3xl font-black text-white/15">{s.n}</span>
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-volt">{s.t}</p>
              <p className="mt-1 font-hud text-base text-white/60">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
