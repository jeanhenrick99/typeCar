import { motion } from 'framer-motion';
import type { Screen } from '../types';
import { Logo } from './Logo';
import { IconFlag, IconGarage, IconKeyboard, IconSettings, IconTrophy, IconUser } from './Icons';
import { useProfile } from '../state/ProfileContext';
import { audio } from '../lib/audio';

interface Props {
  current: Screen;
  onNavigate: (s: Screen) => void;
  onPlay: () => void;
  onSettings: () => void;
}

const ITEMS: { id: Screen; label: string; Icon: typeof IconFlag }[] = [
  { id: 'menu', label: 'Início', Icon: IconFlag },
  { id: 'garage', label: 'Garagem', Icon: IconGarage },
  { id: 'ranking', label: 'Ranking', Icon: IconTrophy },
  { id: 'course', label: 'Curso', Icon: IconKeyboard },
];

export function NavBar({ current, onNavigate, onSettings }: Props) {
  const { profile, user } = useProfile();
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="absolute inset-0 bg-gradient-to-b from-asphalt-950 via-asphalt-950/80 to-transparent pointer-events-none" />
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <button onClick={() => onNavigate('menu')} className="shrink-0" aria-label="TypeCar — início">
          <Logo />
        </button>

        <ul className="hidden md:flex items-center gap-1">
          {ITEMS.map(({ id, label, Icon }) => {
            const active = current === id;
            return (
              <li key={id}>
                <button
                  onMouseEnter={() => audio.hover()}
                  onClick={() => {
                    audio.unlock();
                    audio.click();
                    onNavigate(id);
                  }}
                  className={`relative flex items-center gap-2 px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                    active ? 'text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-0.5 h-[2px] bg-volt shadow-[0_0_12px_#00d4ff]"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 glass skew-panel px-4 py-1.5">
            <IconUser className="h-4 w-4 text-volt" />
            <span className="font-hud text-sm font-bold tracking-wider">{profile.nickname}</span>
            {user && <span className="ml-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" title="Conectado" />}
          </div>
          <button
            onClick={() => {
              audio.unlock();
              audio.click();
              onSettings();
            }}
            className="glass grid h-10 w-10 place-items-center rounded-md text-white/70 transition hover:text-volt hover:border-volt/50"
            aria-label="Configurações"
          >
            <IconSettings />
          </button>
        </div>
      </nav>

      {/* Navegação inferior no celular */}
      <ul className="md:hidden fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/10 bg-asphalt-950/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ id, label, Icon }) => (
          <li key={id} className="flex-1">
            <button
              onClick={() => onNavigate(id)}
              className={`flex w-full flex-col items-center gap-1 py-2.5 font-display text-[10px] uppercase tracking-widest ${
                current === id ? 'text-volt' : 'text-white/50'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </header>
  );
}
