import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
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

  if (db) {
    try {
      // created_at precisa ser a hora do servidor (exigido pelas regras do Firestore)
      const uid = auth?.currentUser?.uid;
      await addDoc(collection(db, 'scores'), { ...entry, created_at: serverTimestamp(), ...(uid ? { uid } : {}) });
    } catch (e) {
      console.warn('[TypeCar] Falha ao enviar pontuação:', (e as Error).message);
    }
  }
}

export async function fetchScores(scope: 'global' | 'local', difficulty: DifficultyId | 'all'): Promise<ScoreEntry[]> {
  if (scope === 'global' && db) {
    // filtra o nível no cliente para não exigir índice composto no Firestore
    const snap = await getDocs(query(collection(db, 'scores'), orderBy('wpm', 'desc'), limit(300)));
    return snap.docs
      .map((d) => {
        const data = d.data();
        const ts = data.created_at as Timestamp | null;
        return { ...data, id: d.id, created_at: ts ? ts.toDate().toISOString() : new Date().toISOString() } as ScoreEntry;
      })
      .filter((s) => difficulty === 'all' || s.difficulty === difficulty)
      .slice(0, 50);
  }
  const local = loadArray<ScoreEntry>(LOCAL_KEY);
  return local.filter((s) => difficulty === 'all' || s.difficulty === difficulty).slice(0, 50);
}
