import type { CarModelId, DifficultyId } from '../types';

export interface Difficulty {
  id: DifficultyId;
  name: string;
  description: string;
  /** PPM base de cada adversário */
  botWpm: [number, number, number];
}

export const DIFFICULTIES: Difficulty[] = [
  { id: 'facil', name: 'Novato', description: 'Rivais entre 20 e 35 PPM', botWpm: [22, 28, 34] },
  { id: 'medio', name: 'Profissional', description: 'Rivais entre 38 e 55 PPM', botWpm: [38, 46, 54] },
  { id: 'dificil', name: 'Elite', description: 'Rivais entre 58 e 78 PPM', botWpm: [58, 67, 77] },
  { id: 'lendario', name: 'Lenda', description: 'Rivais acima de 85 PPM', botWpm: [86, 96, 110] },
];

export function getDifficulty(id: DifficultyId): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

export const BOT_ROSTER: { name: string; color: string; car: CarModelId }[] = [
  { name: 'RAZOR', color: '#e0142d', car: 'rosso' },
  { name: 'DRIFTA', color: '#ffc400', car: 'raptor' },
  { name: 'KAIZEN', color: '#1f4bff', car: 'kaze' },
  { name: 'TORO', color: '#ff7a00', car: 'blaze' },
  { name: 'BLITZ', color: '#e9eef7', car: 'ronin' },
  { name: 'VEGA', color: '#7a3cff', car: 'spectra' },
  { name: 'NOVA', color: '#7dff3a', car: 'blaze' },
  { name: 'ONYX', color: '#2a2f3a', car: 'ronin' },
];
