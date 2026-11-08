import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { CarModelId, DifficultyId, RaceResult } from '../types';
import { loadJSON, saveJSON } from '../lib/storage';
import { audio } from '../lib/audio';
import { auth } from '../lib/firebase';
import { CAR_MODELS } from '../data/cars';
import { loadCloudProgress, mergeProgress, saveCloudProgress } from '../lib/cloudProgress';
import {
  advanceStreak,
  DEFAULT_LOOK,
  EMPTY_STREAK,
  levelInfo,
  newlyUnlocked,
  raceXp,
  type RaceReward,
  type Streak,
} from '../lib/progression';

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
  /** XP total acumulado */
  xp: number;
  streak: Streak;
  /** Peças visuais escolhidas (ids de COSMETICS) */
  wheel: string;
  neon: string;
  smoke: string;
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
  xp: 0,
  streak: EMPTY_STREAK,
  ...DEFAULT_LOOK,
};

const KEY = 'typecar:profile';

interface Ctx {
  profile: Profile;
  update: (patch: Partial<Profile>) => void;
  recordResult: (r: RaceResult) => { newBest: boolean; reward: RaceReward };
  user: User | null;
  /** Estado do salvamento na conta: off = sem login */
  sync: SyncState;
}

export type SyncState = 'off' | 'loading' | 'synced' | 'error';

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => {
    const p = loadJSON(KEY, DEFAULT_PROFILE);
    // carros que deixaram de existir voltam para o padrão
    const known = CAR_MODELS.some((c) => c.id === p.carId);
    const carId = known ? p.carId : DEFAULT_PROFILE.carId;
    const color = known ? p.color : DEFAULT_PROFILE.color;
    return { ...p, carId, color, stats: { ...DEFAULT_PROFILE.stats, ...p.stats }, streak: { ...EMPTY_STREAK, ...p.streak } };
  });
  // perfil mais recente, para calcular recompensas sem depender de closures antigas
  const latest = useRef(profile);
  latest.current = profile;
  const [user, setUser] = useState<User | null>(null);
  const [sync, setSync] = useState<SyncState>('off');
  // conta cujo progresso já foi carregado: só depois disso o perfil é enviado
  const syncedUid = useRef<string | null>(null);

  useEffect(() => saveJSON(KEY, profile), [profile]);

  useEffect(() => {
    audio.setVolume(profile.volume);
    audio.setEnabled(profile.sfx);
    audio.setEngineEnabled(profile.engineSound);
  }, [profile.volume, profile.sfx, profile.engineSound]);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Ao entrar: traz o progresso da conta e junta com o do aparelho
  useEffect(() => {
    syncedUid.current = null;
    if (!user) {
      setSync('off');
      return;
    }
    let alive = true;
    setSync('loading');
    loadCloudProgress(user.uid)
      .then((cloud) => {
        if (!alive) return;
        const merged = cloud ? mergeProgress(latest.current, cloud) : latest.current;
        latest.current = merged;
        setProfile(merged);
        syncedUid.current = user.uid;
        setSync('synced');
        // primeira vez nesta conta (ou progresso juntado): grava já
        return saveCloudProgress(user.uid, merged).then(() => undefined);
      })
      .catch(() => alive && setSync('error'));
    return () => {
      alive = false;
    };
  }, [user]);

  // Depois de carregado, cada mudança no perfil vai para a conta (agrupadas)
  useEffect(() => {
    const uid = syncedUid.current;
    if (!uid || !user || user.uid !== uid) return;
    const t = setTimeout(() => {
      saveCloudProgress(uid, profile)
        .then((merged) => {
          setSync('synced');
          // outro aparelho avançou mais: traz esse avanço para cá
          const cur = latest.current;
          if (merged.xp > cur.xp || merged.streak.best > cur.streak.best || merged.streak.lastDay > cur.streak.lastDay) {
            const next = { ...cur, xp: merged.xp, streak: merged.streak, stats: merged.stats };
            latest.current = next;
            setProfile(next);
          }
        })
        .catch(() => setSync('error'));
    }, 1200);
    return () => clearTimeout(t);
  }, [profile, user]);

  const update = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), []);

  const recordResult = useCallback((r: RaceResult) => {
    const p = latest.current;
    const newBest = r.finished && r.wpm > p.stats.bestWpm;
    const played = r.chars > 0;
    const { streak, firstToday } = played ? advanceStreak(p.streak) : { streak: p.streak, firstToday: false };
    const xpLines = raceXp(r, firstToday, streak.count);
    const xpGained = xpLines.reduce((a, l) => a + l.xp, 0);
    const xpTotal = p.xp + xpGained;
    const levelBefore = levelInfo(p.xp).level;
    const levelAfter = levelInfo(xpTotal).level;
    const reward: RaceReward = {
      xpLines,
      xpGained,
      xpTotal,
      levelBefore,
      levelAfter,
      streak: streak.count,
      firstToday,
      unlocked: newlyUnlocked(levelBefore, levelAfter, p.streak.best, streak.best),
    };
    const next: Profile = {
      ...p,
      xp: xpTotal,
      streak,
      stats: {
        races: p.stats.races + 1,
        wins: p.stats.wins + (r.position === 1 ? 1 : 0),
        podiums: p.stats.podiums + (r.position <= 3 ? 1 : 0),
        bestWpm: r.finished ? Math.max(p.stats.bestWpm, r.wpm) : p.stats.bestWpm,
        bestAccuracy: r.finished ? Math.max(p.stats.bestAccuracy, r.accuracy) : p.stats.bestAccuracy,
      },
    };
    latest.current = next;
    setProfile(next);
    return { newBest, reward };
  }, []);

  const value = useMemo(() => ({ profile, update, recordResult, user, sync }), [profile, update, recordResult, user, sync]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile fora do ProfileProvider');
  return ctx;
}
