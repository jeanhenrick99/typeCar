import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useProfile } from '../state/ProfileContext';
import { IconVolume } from './Icons';
import { GameButton } from './GameButton';
import { audio } from '../lib/audio';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface Props {
  open: boolean;
  onClose: () => void;
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between py-2"
    >
      <span className="font-hud text-base font-semibold text-white/80">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-volt' : 'bg-white/15'}`}>
        <motion.span
          layout
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          style={{ left: on ? 22 : 2 }}
        />
      </span>
    </button>
  );
}

export function SettingsModal({ open, onClose }: Props) {
  const { profile, update, user } = useProfile();
  const [nick, setNick] = useState(profile.nickname);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const saveNick = () => {
    const clean = nick.trim().toUpperCase().replace(/[^A-Z0-9_\-À-Ú ]/gi, '').slice(0, 16);
    if (clean) update({ nickname: clean });
    setNick(clean || profile.nickname);
  };

  const signInGoogle = async () => {
    if (!auth) return;
    setAuthMsg(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setAuthMsg(
        code === 'auth/operation-not-allowed'
          ? 'Ative o login com Google no console do Firebase (Authentication > Método de login).'
          : code === 'auth/popup-closed-by-user'
            ? null
            : `Não foi possível entrar: ${code || (e as Error).message}`,
      );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: 30, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="cut-corner glass relative w-full max-w-md bg-asphalt-900/95 p-6 sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-volt via-volt/50 to-blaze" />
            <h2 className="font-display text-xl font-black italic tracking-wider">CONFIGURAÇÕES</h2>

            <section className="mt-6">
              <p className="hud-label mb-2">Nome do piloto</p>
              <div className="flex gap-2">
                <input
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  onBlur={saveNick}
                  onKeyDown={(e) => e.key === 'Enter' && saveNick()}
                  maxLength={16}
                  className="w-full rounded-md border border-white/15 bg-asphalt-950 px-3 py-2 font-hud text-lg font-bold uppercase tracking-wider outline-none focus:border-volt"
                />
              </div>
            </section>

            <section className="mt-6">
              <p className="hud-label mb-2">Áudio</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => update({ sfx: !profile.sfx })}
                  className={profile.sfx ? 'text-volt' : 'text-white/40'}
                  aria-label={profile.sfx ? 'Silenciar' : 'Ativar som'}
                >
                  <IconVolume muted={!profile.sfx} className="h-6 w-6" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={profile.volume}
                  onChange={(e) => update({ volume: Number(e.target.value), sfx: true })}
                  onMouseUp={() => {
                    audio.unlock();
                    audio.word();
                  }}
                  className="w-full"
                  aria-label="Volume"
                />
                <span className="w-10 text-right font-mono text-sm text-white/70">{Math.round(profile.volume * 100)}</span>
              </div>
              <div className="mt-2 divide-y divide-white/5">
                <Toggle label="Efeitos sonoros" on={profile.sfx} onChange={(v) => update({ sfx: v })} />
                <Toggle label="Som do motor" on={profile.engineSound} onChange={(v) => update({ engineSound: v })} />
              </div>
            </section>

            <section className="mt-6">
              <p className="hud-label mb-2">Conta online</p>
              {!auth ? (
                <p className="text-sm text-white/50">
                  Modo offline: seu progresso e ranking ficam salvos neste navegador. Configure o Firebase no arquivo
                  <code className="mx-1 rounded bg-white/10 px-1">.env</code> para ativar ranking global.
                </p>
              ) : user ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-white/70">{user.displayName ?? user.email}</span>
                  <GameButton size="md" variant="ghost" onClick={() => auth && signOut(auth)}>
                    Sair
                  </GameButton>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-white/50">Suas corridas já entram no ranking global. Entre para vincular as pontuações à sua conta.</p>
                  <GameButton size="md" variant="secondary" onClick={signInGoogle}>
                    Entrar com Google
                  </GameButton>
                  {authMsg && <p className="text-sm text-amber-300">{authMsg}</p>}
                </div>
              )}
            </section>

            <div className="mt-8 flex justify-end">
              <GameButton size="md" onClick={onClose}>
                Pronto
              </GameButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
