import { getDifficulty } from './difficulties';
import type { DifficultyId } from '../types';

export interface RaceDuration {
  /** duração média alvo, em segundos */
  seconds: number;
  name: string;
  label: string;
}

export const DURATIONS: RaceDuration[] = [
  { seconds: 30, name: 'Sprint', label: '30s' },
  { seconds: 60, name: 'Padrão', label: '1 min' },
  { seconds: 120, name: 'Resistência', label: '2 min' },
  { seconds: 180, name: 'Maratona', label: '3 min' },
];

export function getDuration(seconds: number): RaceDuration {
  return DURATIONS.find((d) => d.seconds === seconds) ?? DURATIONS[1];
}

/**
 * Tamanho do texto para que a corrida dure em média `seconds`.
 * Usa o ritmo do rival mais rápido da dificuldade: a corrida acaba quando
 * o primeiro carro cruza a chegada (5 caracteres = 1 palavra).
 */
export function targetCharsFor(seconds: number, difficulty: DifficultyId): number {
  const wpm = getDifficulty(difficulty).botWpm[2];
  return (wpm * 5 * seconds) / 60;
}
