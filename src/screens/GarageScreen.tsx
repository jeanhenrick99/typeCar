import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { HeroBackground } from '../components/HeroBackground';
import { CarPhoto } from '../components/CarPhoto';
import { GameButton } from '../components/GameButton';
import { IconBolt, IconLock, IconVolume } from '../components/Icons';
import { CAR_COLORS, CAR_MODELS, getCarModel } from '../data/cars';
import { TRACKS } from '../data/tracks';
import { TrackPreview } from '../components/TrackPreview';
import { useProfile } from '../state/ProfileContext';
import { audio } from '../lib/audio';

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between">
        <span className="hud-label">{label}</span>
        <span className="font-display text-xs text-white/60">{value}/10</span>
      </div>
      <div className="mt-1 flex gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.span
            key={i}
            initial={false}
            animate={{ opacity: i < value ? 1 : 0.15 }}
            className={`h-2 flex-1 skew-x-[-20deg] ${i < value ? (i >= 8 ? 'bg-blaze' : 'bg-volt') : 'bg-white'}`}
          />
        ))}
      </div>
    </div>
  );
}

export function GarageScreen({ onPlay }: { onPlay: () => void }) {
  const { profile, update } = useProfile();
  const car = getCarModel(profile.carId);

  // para a demonstração do motor ao sair da garagem
  useEffect(() => () => audio.stopEngine(), []);
  const color = CAR_COLORS.find((c) => c.hex === profile.color);

  const track = TRACKS.find((t) => t.id === profile.trackId) ?? TRACKS[0];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HeroBackground intensity={0.6} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6 lg:pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-display text-3xl sm:text-5xl font-black italic"
            >
              GARAGEM
            </motion.h1>
            <p className="mt-1 font-hud text-lg text-white/50">Escolha sua máquina, pinte do seu jeito e defina a pista.</p>
          </div>
          <GameButton className="hidden sm:flex" onClick={onPlay} icon={<IconBolt className="h-5 w-5" />}>
            Correr agora
          </GameButton>
        </div>

        {/* Destaque: carro + desempenho e pintura */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="relative cut-corner glass flex flex-col justify-center overflow-hidden px-4 pb-5 pt-6 sm:px-8">
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,rgba(0,212,255,0.25),transparent_70%)]" />
            <div className="absolute inset-x-[10%] bottom-[30%] h-px bg-gradient-to-r from-transparent via-volt/60 to-transparent" />
            <AnimatePresence mode="wait">
              <motion.div
                key={car.id}
                initial={{ x: 120, opacity: 0, filter: 'blur(6px)' }}
                animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ x: -120, opacity: 0, filter: 'blur(6px)' }}
                transition={{ type: 'spring', stiffness: 160, damping: 20 }}
                className="mx-auto w-full max-w-2xl"
              >
                <CarPhoto model={car.id} color={profile.color} spinning className="relative" />
              </motion.div>
            </AnimatePresence>
            <div className="relative mt-1 text-center">
              <p className="font-display text-2xl sm:text-3xl font-black italic">{car.name}</p>
              <p className="font-hud text-white/50">{car.tagline}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="cut-corner glass flex-1 space-y-3 px-5 py-4">
              <p className="hud-label">Desempenho</p>
              <StatBar label="Aceleração" value={car.stats.aceleracao} />
              <StatBar label="Velocidade" value={car.stats.velocidade} />
              <StatBar label="Controle" value={car.stats.controle} />
              <p className="pt-1 font-hud text-xs text-white/35">Atributos visuais — na pista, quem manda são seus dedos.</p>
              <button
                onClick={() => audio.previewEngine(car.id)}
                className="group flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 transition hover:border-volt/50 hover:bg-volt/10"
                title={profile.sfx ? 'Ouvir o motor' : 'Ative os efeitos sonoros nas configurações'}
              >
                <span className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 group-hover:text-white">
                  <IconVolume className="h-4 w-4 text-volt" /> Ouvir motor
                </span>
              </button>
            </div>

            <div className="cut-corner glass px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="hud-label">Pintura</p>
                <p className="font-hud text-sm font-semibold" style={{ color: profile.color }}>
                  {profile.color === car.signature ? 'Original' : (color?.name ?? 'Personalizada')}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-10 gap-2">
                {[{ id: 'original', name: 'Original', hex: car.signature }, ...CAR_COLORS.filter((c) => c.hex !== car.signature)].map((c) => {
                  const active = c.hex === profile.color;
                  return (
                    <motion.button
                      key={c.id}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        audio.unlock();
                        audio.click();
                        update({ color: c.hex });
                      }}
                      title={c.name}
                      className={`aspect-square w-full rounded-full border-2 transition-shadow ${active ? 'border-white' : 'border-transparent'}`}
                      style={{ background: c.hex, boxShadow: active ? `0 0 14px ${c.hex}` : undefined }}
                    />
                  );
                })}
                <label className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-white/40" title="Cor personalizada">
                  <span className="absolute inset-0 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] opacity-80" />
                  <input
                    type="color"
                    value={profile.color}
                    onChange={(e) => update({ color: e.target.value })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Seleção de carros */}
        <section className="mt-6">
          <p className="hud-label mb-2">Carros</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CAR_MODELS.map((m) => {
              const active = m.id === profile.carId;
              return (
                <button
                  key={m.id}
                  onMouseEnter={() => audio.hover()}
                  onClick={() => {
                    audio.unlock();
                    audio.click();
                    // quem estava com a pintura original continua com a original do novo carro
                    update({ carId: m.id, color: profile.color === car.signature ? m.signature : profile.color });
                  }}
                  className={`cut-corner group relative overflow-hidden px-3 pb-3 pt-2 text-left transition-all ${
                    active ? 'bg-volt/15 ring-1 ring-volt' : 'glass hover:bg-white/10'
                  }`}
                >
                  <CarPhoto
                    model={m.id}
                    color={active ? profile.color : m.signature}
                    shadow={false}
                    className={`my-2 transition-opacity ${active ? '' : 'opacity-70 group-hover:opacity-100'}`}
                  />
                  <p className={`font-display text-sm font-bold ${active ? 'text-volt' : 'text-white/80'}`}>{m.name}</p>
                  {active && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-volt shadow-[0_0_8px_#00d4ff]" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Seleção de pista */}
        <section className="mt-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="hud-label">Pista</p>
            <p className="font-hud text-sm text-white/55">
              <span className="font-semibold" style={{ color: track.neon }}>
                {track.name}:
              </span>{' '}
              {track.description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {TRACKS.map((t) => {
              const active = t.id === profile.trackId;
              return (
                <button
                  key={t.id}
                  disabled={t.locked}
                  onClick={() => {
                    audio.click();
                    update({ trackId: t.id });
                  }}
                  className={`group relative block w-full overflow-hidden rounded-md text-left transition-all ${
                    active ? 'ring-2 ring-volt shadow-[0_0_20px_rgba(0,212,255,0.25)]' : 'ring-1 ring-white/10 hover:ring-white/30'
                  } ${t.locked ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <TrackPreview
                    track={t}
                    className={`block h-24 w-full transition-transform duration-500 ${active ? '' : 'opacity-70 group-hover:opacity-100'} group-hover:scale-105`}
                  />
                  <span className="block bg-asphalt-950/85 px-3 py-2">
                    <span className="block font-display text-sm font-bold" style={{ color: active ? t.neon : undefined }}>
                      {t.name}
                    </span>
                    {t.locked ? (
                      <span className="mt-1 flex items-center gap-1 font-display text-[9px] font-bold tracking-widest text-white/60">
                        <IconLock className="h-3.5 w-3.5" /> EM BREVE
                      </span>
                    ) : (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {t.features.map((f) => (
                          <span key={f} className="rounded-sm bg-white/10 px-1.5 py-0.5 font-hud text-[10px] font-semibold text-white/70">
                            {f}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <GameButton className="mt-6 w-full sm:hidden" onClick={onPlay} icon={<IconBolt className="h-5 w-5" />}>
          Correr agora
        </GameButton>
      </main>
    </div>
  );
}
