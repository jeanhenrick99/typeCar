import { TypingEngine, type InputResult } from './TypingEngine';
import { BOT_ROSTER, getDifficulty } from '../data/difficulties';
import type { CarModelId, DifficultyId, RaceResult } from '../types';

export type RacePhase = 'countdown' | 'racing' | 'finished';

export interface Racer {
  id: string;
  name: string;
  color: string;
  car: CarModelId;
  isPlayer: boolean;
  lane: number;
  /** Progresso real 0..1 */
  progress: number;
  /** Progresso suavizado para a animação */
  visualProgress: number;
  /** Velocidade instantânea em km/h (visual) */
  speed: number;
  finishTimeMs: number | null;
  // parâmetros de IA
  baseWpm: number;
  reaction: number;
  wobblePhase: number;
  wobbleFreq: number;
  surge: number;
}

export interface RaceConfig {
  text: string;
  difficulty: DifficultyId;
  playerName: string;
  playerColor: string;
  playerCar: CarModelId;
  trackId: string;
}

export interface RaceEvents {
  onCountdownTick?: (n: number) => void;
  onGo?: () => void;
  onKey?: (correct: boolean) => void;
  onWord?: (streak: number) => void;
  onOvertake?: (gained: boolean) => void;
  onFinish?: (result: RaceResult) => void;
}

/** Distância entre duas cores hex, para os rivais não repetirem a cor do jogador */
function colorDistance(a: string, b: string): number {
  const rgb = (h: string) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

const COUNTDOWN_SECONDS = 3;
const SPEED_WINDOW_MS = 2500;
/** km/h por PPM — 100 PPM ≈ 300 km/h */
const KMH_PER_WPM = 3;

export class RaceController {
  readonly config: RaceConfig;
  readonly typing: TypingEngine;
  readonly racers: Racer[];
  readonly player: Racer;

  phase: RacePhase = 'countdown';
  /** Segundos restantes da contagem (3..0); 0 = GO */
  countdown = COUNTDOWN_SECONDS;
  elapsedMs = 0;
  /** Momento em que a corrida terminou (ms desde o GO) */
  endMs: number | null = null;
  result: RaceResult | null = null;
  /** Tempo de exibição do "GO" após a largada */
  goFlash = 0;

  private countdownAcc = 0;
  private samples: { t: number; chars: number }[] = [];
  private wpmSamples: number[] = [];
  private sampleAcc = 0;
  private lastPosition = 0;
  private events: RaceEvents;

  constructor(config: RaceConfig, events: RaceEvents = {}) {
    this.config = config;
    this.events = events;
    this.typing = new TypingEngine(config.text);

    const diff = getDifficulty(config.difficulty);
    const roster = [...BOT_ROSTER]
      .filter((b) => colorDistance(b.color, config.playerColor) > 90)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // Pista: 4 faixas; o jogador fica na faixa 1 (segunda de cima)
    const lanes = [0, 2, 3];
    const bots: Racer[] = roster.map((b, i) => ({
      id: `bot-${i}`,
      name: b.name,
      color: b.color,
      car: b.car,
      isPlayer: false,
      lane: lanes[i],
      progress: 0,
      visualProgress: 0,
      speed: 0,
      finishTimeMs: null,
      baseWpm: diff.botWpm[i] * (0.92 + Math.random() * 0.16),
      reaction: 0.25 + Math.random() * 0.6,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleFreq: 0.25 + Math.random() * 0.35,
      surge: 0,
    }));

    this.player = {
      id: 'player',
      name: config.playerName,
      color: config.playerColor,
      car: config.playerCar,
      isPlayer: true,
      lane: 1,
      progress: 0,
      visualProgress: 0,
      speed: 0,
      finishTimeMs: null,
      baseWpm: 0,
      reaction: 0,
      wobblePhase: 0,
      wobbleFreq: 0,
      surge: 0,
    };

    this.racers = [this.player, ...bots];
    this.lastPosition = this.racers.length;
  }

  setEvents(events: RaceEvents) {
    this.events = events;
  }

  /** Comprimento nominal da pista em metros */
  get trackMeters(): number {
    return Math.round((this.typing.totalChars * 8) / 100) * 100;
  }

  get canType(): boolean {
    return this.phase === 'racing';
  }

  /** PPM médio desde a largada (5 caracteres = 1 palavra) */
  get wpm(): number {
    const minutes = this.elapsedMs / 60000;
    if (minutes < 1 / 60) return 0;
    return this.typing.progressChars / 5 / minutes;
  }

  /** PPM nos últimos segundos, usado para a velocidade do carro */
  get instantWpm(): number {
    if (this.samples.length < 2) return 0;
    const last = this.samples[this.samples.length - 1];
    const first = this.samples[0];
    const dt = Math.max(last.t - first.t, 600);
    return ((last.chars - first.chars) / 5) / (dt / 60000);
  }

  /** Posição atual (1 = líder) */
  get position(): number {
    const sorted = this.standings();
    return sorted.indexOf(this.player) + 1;
  }

  standings(): Racer[] {
    return [...this.racers].sort((a, b) => {
      if (a.finishTimeMs !== null && b.finishTimeMs !== null) return a.finishTimeMs - b.finishTimeMs;
      if (a.finishTimeMs !== null) return -1;
      if (b.finishTimeMs !== null) return 1;
      if (b.progress !== a.progress) return b.progress - a.progress;
      return a.isPlayer ? -1 : 1;
    });
  }

  handleInput(value: string): InputResult | null {
    if (!this.canType) return null;
    const res = this.typing.setInput(value);
    if (res.correct > 0 || res.wrong > 0) this.events.onKey?.(res.wrong === 0);
    if (res.committedWord) this.events.onWord?.(this.typing.streak);
    this.player.progress = this.typing.progress;
    if (res.finished && this.player.finishTimeMs === null) {
      this.player.progress = 1;
      this.player.finishTimeMs = this.elapsedMs;
      this.endRace();
    }
    return res;
  }

  update(dtMs: number) {
    const dt = Math.min(dtMs, 100) / 1000;

    if (this.phase === 'countdown') {
      this.countdownAcc += dt;
      if (this.countdownAcc >= 1) {
        this.countdownAcc -= 1;
        this.countdown--;
        if (this.countdown > 0) this.events.onCountdownTick?.(this.countdown);
        else {
          this.phase = 'racing';
          this.goFlash = 1;
          this.events.onGo?.();
        }
      }
    } else if (this.phase === 'racing') {
      this.elapsedMs += dt * 1000;
      this.goFlash = Math.max(0, this.goFlash - dt);
      this.updateBots(dt);
      this.recordSamples(dt);
      this.checkOvertakes();
    } else {
      this.goFlash = 0;
    }

    this.updateVisuals(dt);
  }

  private updateBots(dt: number) {
    const t = this.elapsedMs / 1000;
    const total = this.typing.totalChars;
    for (const bot of this.racers) {
      if (bot.isPlayer || bot.finishTimeMs !== null) continue;
      if (t < bot.reaction) continue;
      // Ritmo varia: ondas suaves + rajadas aleatórias + pequenas hesitações
      if (Math.random() < dt * 0.5) bot.surge = (Math.random() - 0.4) * 0.35;
      bot.surge *= 1 - dt * 0.6;
      const wobble = Math.sin(t * bot.wobbleFreq * Math.PI * 2 + bot.wobblePhase) * 0.12;
      const warmup = Math.min(1, (t - bot.reaction) / 1.5);
      const wpm = Math.max(0, bot.baseWpm * (1 + wobble + bot.surge) * warmup);
      const charsPerSec = (wpm * 5) / 60;
      bot.progress = Math.min(1, bot.progress + (charsPerSec * dt) / total);
      bot.speed = wpm * KMH_PER_WPM;
      if (bot.progress >= 1) {
        bot.finishTimeMs = this.elapsedMs;
        this.endRace();
        return;
      }
    }
  }

  private recordSamples(dt: number) {
    const now = this.elapsedMs;
    this.samples.push({ t: now, chars: this.typing.progressChars });
    while (this.samples.length > 2 && now - this.samples[0].t > SPEED_WINDOW_MS) this.samples.shift();

    this.sampleAcc += dt;
    if (this.sampleAcc >= 1) {
      this.sampleAcc -= 1;
      this.wpmSamples.push(Math.round(this.instantWpm));
    }
  }

  private checkOvertakes() {
    const pos = this.position;
    if (pos !== this.lastPosition && this.elapsedMs > 1500) {
      this.events.onOvertake?.(pos < this.lastPosition);
    }
    this.lastPosition = pos;
  }

  private updateVisuals(dt: number) {
    const target = Math.min(400, this.instantWpm * KMH_PER_WPM);
    const rate = target > this.player.speed ? 3 : 1.6;
    this.player.speed += (target - this.player.speed) * Math.min(1, dt * rate);
    if (this.phase !== 'racing') this.player.speed *= 1 - Math.min(1, dt * 1.5);

    for (const r of this.racers) {
      const k = r.isPlayer ? 7 : 5;
      r.visualProgress += (r.progress - r.visualProgress) * Math.min(1, dt * k);
      if (Math.abs(r.progress - r.visualProgress) < 0.00005) r.visualProgress = r.progress;
      if (this.phase === 'finished' && !r.isPlayer) r.speed *= 1 - Math.min(1, dt * 1.2);
    }
  }

  private endRace() {
    if (this.phase === 'finished') return;
    this.phase = 'finished';
    this.endMs = this.elapsedMs;
    this.wpmSamples.push(Math.round(this.instantWpm));

    const position = this.position;
    const result: RaceResult = {
      position,
      totalRacers: this.racers.length,
      finished: this.player.finishTimeMs !== null,
      timeMs: this.elapsedMs,
      wpm: Math.round(this.wpm),
      accuracy: Math.round(this.typing.accuracy * 10) / 10,
      errors: this.typing.errors,
      chars: this.typing.progressChars,
      wpmSamples: this.wpmSamples.slice(),
      difficulty: this.config.difficulty,
      trackId: this.config.trackId,
      carId: this.config.playerCar,
      maxStreak: this.typing.maxStreak,
    };
    this.result = result;
    this.events.onFinish?.(result);
  }
}
