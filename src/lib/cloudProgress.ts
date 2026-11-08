import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Profile } from '../state/ProfileContext';

/** Campos do perfil guardados na conta (volume e sons ficam por aparelho) */
const SYNCED = ['nickname', 'carId', 'color', 'trackId', 'difficulty', 'duration', 'stats', 'xp', 'streak', 'wheel', 'neon', 'smoke'] as const;
type SyncedKey = (typeof SYNCED)[number];
export type CloudProgress = Pick<Profile, SyncedKey>;

function pick(p: Profile): CloudProgress {
  const out = {} as Record<string, unknown>;
  for (const k of SYNCED) out[k] = p[k];
  return out as CloudProgress;
}

/** Progresso salvo na conta, ou null se ainda não existe (ou se estiver offline) */
export async function loadCloudProgress(uid: string): Promise<Partial<CloudProgress> | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'progress', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<CloudProgress> & { updated_at?: unknown };
  delete data.updated_at;
  return data;
}

/**
 * Grava o perfil na conta sem apagar avanços feitos em outro aparelho:
 * lê o que está salvo, mantém os maiores números e devolve o resultado.
 */
export async function saveCloudProgress(uid: string, p: Profile): Promise<Profile> {
  if (!db) return p;
  const cloud = await loadCloudProgress(uid);
  const merged = cloud ? mergeProgress(p, cloud, 'local') : p;
  await setDoc(doc(db, 'progress', uid), { ...pick(merged), updated_at: serverTimestamp() });
  return merged;
}

/**
 * Junta o progresso do aparelho com o da conta sem perder nada: fica o maior
 * XP, a sequência mais recente e os melhores números. Escolhas visuais e
 * preferências vêm da conta (ao entrar) ou do aparelho (ao salvar).
 */
export function mergeProgress(local: Profile, cloud: Partial<CloudProgress>, prefs: 'cloud' | 'local' = 'cloud'): Profile {
  const ls = local.streak;
  const cs = { ...ls, ...cloud.streak };
  const streak =
    cs.lastDay > ls.lastDay
      ? { ...cs, best: Math.max(cs.best, ls.best) }
      : cs.lastDay < ls.lastDay
        ? { ...ls, best: Math.max(cs.best, ls.best) }
        : { lastDay: ls.lastDay, count: Math.max(cs.count, ls.count), best: Math.max(cs.best, ls.best) };
  const st = { ...local.stats, ...cloud.stats };
  return {
    ...local,
    ...(prefs === 'cloud' ? cloud : {}),
    xp: Math.max(local.xp, cloud.xp ?? 0),
    streak,
    stats: {
      races: Math.max(local.stats.races, st.races),
      wins: Math.max(local.stats.wins, st.wins),
      podiums: Math.max(local.stats.podiums, st.podiums),
      bestWpm: Math.max(local.stats.bestWpm, st.bestWpm),
      bestAccuracy: Math.max(local.stats.bestAccuracy, st.bestAccuracy),
    },
  };
}
