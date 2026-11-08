import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { HeroBackground } from '../components/HeroBackground';
import { CarPhoto } from '../components/CarPhoto';
import { GameButton } from '../components/GameButton';
import { IconBolt, IconFlame, IconLock, IconVolume } from '../components/Icons';
import {
  cosmeticsOf,
  getCosmetic,
  isUnlocked,
  levelInfo,
  liveStreak,
  requirement,
  streakTier,
  type Cosmetic,
  type CosmeticKind,
} from '../lib/progression';
import { CAR_COLORS, CAR_MODELS, getCarModel } from '../data/cars';
import { TRACKS } from '../data/tracks';
import { TrackPreview } from '../components/TrackPreview';
import { useProfile } from '../state/ProfileContext';
import { audio } from '../lib/audio';

function swatchBg(color: string | null) {
  if (color === 'rainbow') return 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)';
  return color ?? 'transparent';
}

type SwatchItem = { id: string; name: string; color: string | null; kind?: CosmeticKind; level?: number; streak?: number };

/** Bolinha de cor de um item, com cadeado quando ainda não foi liberado */
function Swatch({ c, active, locked, onPick }: { c: SwatchItem; active: boolean; locked: boolean; onPick: () => void }) {
  const req = c.kind ? requirement(c as Cosmetic) : '';
  return (
    <motion.button
      whileHover={locked ? undefined : { scale: 1.15 }}
      whileTap={locked ? undefined : { scale: 0.9 }}
      onClick={() => {
        audio.unlock();
        if (locked) return audio.error();
        audio.click();
        onPick();
      }}
      title={locked ? `${c.name} · libera com ${req}` : c.name}
      aria-label={locked ? `${c.name} (bloqueado: ${req})` : c.name}
      className={`relative aspect-square w-full rounded-full border-2 transition-shadow ${
        active ? 'border-white' : c.color ? 'border-transparent' : 'border-white/25'
      } ${locked ? 'cursor-not-allowed' : ''}`}
      style={{ background: swatchBg(c.color), boxShadow: active && c.color && c.color !== 'rainbow' ? `0 0 14px ${c.color}` : undefined }}
    >
      {!c.color && <span className="absolute inset-[22%] rotate-45 border-t-2 border-white/40" />}
      {locked && (
        <span className="absolute inset-0 grid place-items-center rounded-full bg-asphalt-950/70">
          <IconLock className="h-3.5 w-3.5 text-white/70" />
        </span>
      )}
    </motion.button>
  );
}

const LOOK_ROWS: { kind: CosmeticKind; label: string; field: 'wheel' | 'neon' | 'smoke' }[] = [
  { kind: 'wheel', label: 'Rodas', field: 'wheel' },
  { kind: 'neon', label: 'Neon', field: 'neon' },
  { kind: 'smoke', label: 'Nitro', field: 'smoke' },
];

export function GarageScreen({ onPlay }: { onPlay: () => void }) {
  const { profile, update } = useProfile();
  const car = getCarModel(profile.carId);
  const lvl = levelInfo(profile.xp);
  const streakNow = liveStreak(profile.streak);
  const tier = streakTier(streakNow);
  const unlocked = (c: Cosmetic) => isUnlocked(c, lvl.level, profile.streak.best);
  const rim = getCosmetic('wheel', profile.wheel).color;
  const neon = getCosmetic('neon', profile.neon).color;
  const premiumPaints = cosmeticsOf('paint');

  // para a demonstração do motor ao sair da garagem
  useEffect(() => () => audio.stopEngine(), []);
  const color = CAR_COLORS.find((c) => c.hex === profile.color) ?? premiumPaints.find((c) => c.color === profile.color);

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
          <div className="flex flex-wrap items-center gap-3">
            {/* nível e sequência de dias */}
            <div className="cut-corner glass flex items-center gap-4 px-4 py-2">
              <div className="w-40 sm:w-48">
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="font-display text-sm font-black italic text-volt">NÍVEL {lvl.level}</span>
                  <span className="font-mono text-[10px] text-white/40">
                    {lvl.into}/{lvl.need} XP
                  </span>
                </div>
                <div className="h-2 skew-x-[-14deg] overflow-hidden bg-black/60 ring-1 ring-white/15">
                  <div className="h-full bg-gradient-to-r from-blaze to-volt" style={{ width: `${lvl.ratio * 100}%` }} />
                </div>
              </div>
              <div
                className="flex items-center gap-1"
                title={streakNow ? `${streakNow} dias seguidos · recorde ${profile.streak.best}` : 'Corra hoje para começar uma sequência'}
              >
                <IconFlame
                  className="h-6 w-6"
                  style={{ color: streakNow ? tier.color : 'rgba(255,255,255,0.2)', filter: streakNow ? `drop-shadow(0 0 6px ${tier.color})` : undefined }}
                />
                <span className="font-display text-lg font-black" style={{ color: streakNow ? tier.color : 'rgba(255,255,255,0.3)' }}>
                  {streakNow}
                </span>
              </div>
            </div>
            <GameButton className="hidden sm:flex" onClick={onPlay} icon={<IconBolt className="h-5 w-5" />}>
              Correr agora
            </GameButton>
          </div>
        </div>

        {/* Destaque: carro + motor e pintura */}
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
                <CarPhoto model={car.id} color={profile.color} rim={rim} neon={neon} spinning className="relative" />
              </motion.div>
            </AnimatePresence>
            <div className="relative mt-1 text-center">
              <p className="font-display text-2xl sm:text-3xl font-black italic">{car.name}</p>
              <p className="font-hud text-white/50">{car.tagline}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="cut-corner glass flex flex-1 flex-col justify-center gap-3 px-5 py-4">
              <p className="hud-label">Motor</p>
              <button
                onClick={() => audio.previewEngine(car.id)}
                className="group flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-3 transition hover:border-volt/50 hover:bg-volt/10"
                title={profile.sfx ? 'Ouvir o motor' : 'Ative os efeitos sonoros nas configurações'}
              >
                <span className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 group-hover:text-white">
                  <IconVolume className="h-4 w-4 text-volt" /> Ouvir motor
                </span>
              </button>
              <p className="font-hud text-xs text-white/35">Todos os carros são iguais na pista: quem manda são seus dedos.</p>
            </div>

            <div className="cut-corner glass px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="hud-label">Pintura</p>
                <p className="font-hud text-sm font-semibold" style={{ color: profile.color }}>
                  {profile.color === car.signature ? 'Original' : (color?.name ?? 'Personalizada')}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-8 gap-2">
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
                {premiumPaints.map((c) => (
                  <Swatch key={c.id} c={c} active={c.color === profile.color} locked={!unlocked(c)} onPick={() => update({ color: c.color! })} />
                ))}
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

            {/* peças visuais liberadas por nível e sequência de dias */}
            <div className="cut-corner glass flex flex-col gap-3 px-5 py-4">
              {LOOK_ROWS.map((row) => {
                const current = getCosmetic(row.kind, profile[row.field]);
                return (
                  <div key={row.kind}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="hud-label">{row.label}</p>
                      <p className="font-hud text-sm font-semibold text-white/70">{current.name}</p>
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                      {cosmeticsOf(row.kind).map((c) => (
                        <Swatch
                          key={c.id}
                          c={c}
                          active={c.id === current.id}
                          locked={!unlocked(c)}
                          onPick={() => update({ [row.field]: c.id })}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="font-hud text-xs text-white/35">Suba de nível e jogue dias seguidos para liberar mais peças.</p>
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
