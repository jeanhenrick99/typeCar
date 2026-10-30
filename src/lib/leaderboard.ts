import { supabase } from './supabase';
import { loadArray, saveJSON } from './storage';
import type { DifficultyId, ScoreEntry } from '../types';

const LOCAL_KEY = 'typecar:scores';
const MAX_LOCAL = 100;

export async function submitScore(entry: Omit<ScoreEntry, 'created_at' | 'id'>): Promise<void> {
  const full: ScoreEntry = { ...entry, created_at: new Date().toISOString() };

  const local = loadArray<ScoreEntry>(LOCAL_KEY);
  local.push(full);
  local.sort((a, b) => b.wpm - a.wpm);
  saveJSON(LOCAL_KEY, local.slice(0, MAX_LOCAL));

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase.from('scores').insert({ ...full, user_id: data.user?.id ?? null });
    if (error) console.warn('[TypeCar] Falha ao enviar pontuação:', error.message);
  }
}

export async function fetchScores(scope: 'global' | 'local', difficulty: DifficultyId | 'all'): Promise<ScoreEntry[]> {
  if (scope === 'global' && supabase) {
    let q = supabase.from('scores').select('*').order('wpm', { ascending: false }).limit(50);
    if (difficulty !== 'all') q = q.eq('difficulty', difficulty);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as ScoreEntry[];
  }
  const local = loadArray<ScoreEntry>(LOCAL_KEY);
  return local.filter((s) => difficulty === 'all' || s.difficulty === difficulty).slice(0, 50);
}
