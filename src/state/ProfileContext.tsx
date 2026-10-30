import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { CarModelId, DifficultyId, RaceResult } from '../types';
import { loadJSON, saveJSON } from '../lib/storage';
import { audio } from '../lib/audio';
import { supabase } from '../lib/supabase';
import { CAR_MODELS } from '../data/cars';

export interface Profile {
  nickname: string;
  carId: CarModelId;
  color: string;
  trackId: string;
  difficulty: DifficultyId;
  /** Duração média desejada da corrida, em segundos */
  duration: number;
  volume: number;
  sfx: boolean;
  engineSound: boolean;
  stats: { races: number; wins: number; podiums: number; bestWpm: number; bestAccuracy: number };
}

const DEFAULT_PROFILE: Profile = {
  nickname: `PILOTO${Math.floor(100 + Math.random() * 900)}`,
  carId: 'rosso',
  color: '#e0142d',
  trackId: 'neon-city',
  difficulty: 'medio',
  duration: 60,
  volume: 0.6,
  sfx: true,
  engineSound: true,
  stats: { races: 0, wins: 0, podiums: 0, bestWpm: 0, bestAccuracy: 0 },
};

const KEY = 'typecar:profile';

interface Ctx {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  recordResult: (r: RaceResult) => { newBest: boolean };
  user: User | null;
}

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => {
    const p = loadJSON(KEY, DEFAULT_PROFILE);
    // carros que deixaram de existir voltam para o padrão
    const known = CAR_MODELS.some((c) => c.id === p.carId);
    const carId = known ? p.carId : DEFAULT_PROFILE.carId;
    const color = known ? p.color : DEFAULT_PROFILE.color;
    return { ...p, carId, color, stats: { ...DEFAULT_PROFILE.stats, ...p.stats } };
  });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => saveJSON(KEY, profile), [profile]);

  useEffect(() => {
    audio.setVolume(profile.volume);
    audio.setEnabled(profile.sfx);
    audio.setEngineEnabled(profile.engineSound);
  }, [profile.volume, profile.sfx, profile.engineSound]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const update = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), []);

  const recordResult = useCallback(
    (r: RaceResult) => {
      const newBest = r.finished && r.wpm > profile.stats.bestWpm;
      setProfile((p) => ({
        ...p,
        stats: {
          races: p.stats.races + 1,
          wins: p.stats.wins + (r.position === 1 ? 1 : 0),
          podiums: p.stats.podiums + (r.position <= 3 ? 1 : 0),
          bestWpm: r.finished ? Math.max(p.stats.bestWpm, r.wpm) : p.stats.bestWpm,
          bestAccuracy: r.finished ? Math.max(p.stats.bestAccuracy, r.accuracy) : p.stats.bestAccuracy,
        },
      }));
      return { newBest };
    },
    [profile.stats.bestWpm],
  );

  const value = useMemo(() => ({ profile, update, recordResult, user }), [profile, update, recordResult, user]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile fora do ProfileProvider');
  return ctx;
}
