import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import type { Screen } from './types';
import { NavBar } from './components/NavBar';
import { SettingsModal } from './components/SettingsModal';
import { MenuScreen } from './screens/MenuScreen';
import { RaceScreen } from './screens/RaceScreen';
import { GarageScreen } from './screens/GarageScreen';
import { RankingScreen } from './screens/RankingScreen';
import { CourseScreen } from './screens/CourseScreen';
import { audio } from './lib/audio';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [raceId, setRaceId] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const play = useCallback(() => {
    audio.unlock();
    setRaceId((n) => n + 1);
    setScreen('race');
  }, []);

  // Enter no menu inicia a corrida
  useEffect(() => {
    if (screen !== 'menu' || settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) play();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, settingsOpen, play]);

  return (
    <div className="min-h-screen bg-asphalt-950">
      {screen !== 'race' && (
        <NavBar current={screen} onNavigate={setScreen} onPlay={play} onSettings={() => setSettingsOpen(true)} />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={screen === 'race' ? `race-${raceId}` : screen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {screen === 'menu' && <MenuScreen onPlay={play} onGarage={() => setScreen('garage')} />}
          {screen === 'garage' && <GarageScreen onPlay={play} />}
          {screen === 'ranking' && <RankingScreen />}
          {screen === 'course' && <CourseScreen />}
          {screen === 'race' && <RaceScreen onExit={() => setScreen('menu')} onRestart={play} />}
        </motion.div>
      </AnimatePresence>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
