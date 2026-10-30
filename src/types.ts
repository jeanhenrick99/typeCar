export type Screen = 'menu' | 'race' | 'garage' | 'ranking' | 'course';

export type DifficultyId = 'facil' | 'medio' | 'dificil' | 'lendario';

export type CarModelId = 'raptor' | 'kaze' | 'rosso' | 'blaze' | 'ronin' | 'spectra';

export interface CarModel {
  id: CarModelId;
  name: string;
  tagline: string;
  /** Cor de vitrine usada na lista da garagem */
  signature: string;
}

export interface TrackTheme {
  id: string;
  name: string;
  location: string;
  description: string;
  features: string[];
  /** Conjunto de cenário desenhado pelo renderizador */
  scenery: 'city' | 'coast' | 'desert' | 'arctic';
  weather: 'none' | 'rain' | 'snow' | 'dust';
  /** Céu estrelado */
  stars: boolean;
  locked: boolean;
  sky: [string, string];
  asphalt: string;
  asphaltLine: string;
  grass: string;
  neon: string;
  neon2: string;
  curbA: string;
  curbB: string;
  /** Faróis acesos */
  night: boolean;
}

export interface RaceResult {
  position: number;
  totalRacers: number;
  finished: boolean;
  timeMs: number;
  wpm: number;
  accuracy: number;
  errors: number;
  chars: number;
  wpmSamples: number[];
  difficulty: DifficultyId;
  trackId: string;
  carId: CarModelId;
  maxStreak: number;
}

export interface ScoreEntry {
  id?: string;
  player: string;
  wpm: number;
  accuracy: number;
  time_ms: number;
  position: number;
  difficulty: DifficultyId;
  car: CarModelId;
  created_at: string;
}
