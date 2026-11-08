import type { CarModelId } from '../types';
import { ENGINE_WORKLET } from './engineWorklet';

/**
 * Motor simulado: um AudioWorklet gera os pulsos de cada cilindro passando
 * pelo escapamento (veja engineWorklet.ts). Aqui ficam giro, marchas,
 * acelerador, turbo e o volume, calibrados para ouvir a corrida inteira
 * sem cansar: timbre grave, sem apito agudo e volume contido.
 */

export interface EngineProfile {
  label: string;
  cylinders: number;
  idle: number;
  redline: number;
  /** Ângulo de disparo de cada cilindro, 0..1 do ciclo de 720° */
  offsets: number[];
  /** Força relativa de cada cilindro */
  amps: number[];
  /** Duração do pulso de cada explosão (s): maior = mais encorpado */
  tau: number;
  /** Abertura do timbre (0..1) */
  bright: number;
  /** Saturação suave */
  drive: number;
  /** Ressonância do escapamento (0..0.9) */
  feedback: number;
  /** Irregularidade de cada explosão (0..0.4) */
  jitter: number;
  /** Comprimento dos dois tubos do escapamento (s) */
  pipes: [number, number];
  /** Sopro do turbo (0 = aspirado) */
  turbo: number;
  /** Volume relativo */
  level: number;
}

const even = (n: number) => Array.from({ length: n }, (_, i) => i / n);

/** V8 virabrequim cruzado: intervalos e bancadas desiguais dão o ronco irregular */
const CROSS_V8 = {
  offsets: [0, 0.118, 0.25, 0.382, 0.5, 0.632, 0.75, 0.868],
  amps: [1, 0.72, 0.95, 0.8, 0.88, 1, 0.76, 0.9],
};

export const ENGINES: Record<CarModelId, EngineProfile> = {
  // V12: liso e cheio, sobe de giro sem rasgar
  raptor: {
    label: 'V12 aspirado', cylinders: 12, idle: 1000, redline: 9000,
    offsets: even(12), amps: [1, 0.94, 0.98, 0.92, 1, 0.95, 0.97, 0.93, 1, 0.94, 0.98, 0.92],
    tau: 0.0028, bright: 0.55, drive: 1.6, feedback: 0.55, jitter: 0.08, pipes: [0.0042, 0.0031], turbo: 0, level: 0.9,
  },
  // 6 em linha: suave e "redondo", com sopro de turbo
  kaze: {
    label: '6 em linha biturbo', cylinders: 6, idle: 900, redline: 7800,
    offsets: even(6), amps: [1, 0.93, 0.97, 0.95, 0.99, 0.92],
    tau: 0.0034, bright: 0.45, drive: 1.8, feedback: 0.6, jitter: 0.1, pipes: [0.0051, 0.0037], turbo: 0.8, level: 1,
  },
  // V8 virabrequim plano: mais agudo e liso que o V8 americano
  rosso: {
    label: 'V8 biturbo', cylinders: 8, idle: 1000, redline: 8200,
    offsets: even(8), amps: [1, 0.86, 0.97, 0.84, 1, 0.88, 0.95, 0.85],
    tau: 0.003, bright: 0.5, drive: 1.7, feedback: 0.58, jitter: 0.1, pipes: [0.0046, 0.0034], turbo: 0.4, level: 0.95,
  },
  // V8 cruzado: o ronco grave e irregular
  blaze: {
    label: 'V8 biturbo', cylinders: 8, idle: 950, redline: 8000,
    ...CROSS_V8,
    tau: 0.0038, bright: 0.4, drive: 2.1, feedback: 0.62, jitter: 0.16, pipes: [0.0058, 0.0043], turbo: 0.5, level: 1,
  },
  // V6: áspero e grave, turbo bem presente
  ronin: {
    label: 'V6 biturbo', cylinders: 6, idle: 850, redline: 7100,
    offsets: [0, 0.165, 0.333, 0.5, 0.665, 0.833], amps: [1, 0.82, 0.95, 0.86, 0.98, 0.8],
    tau: 0.0036, bright: 0.4, drive: 2.2, feedback: 0.6, jitter: 0.14, pipes: [0.0055, 0.004], turbo: 0.9, level: 1,
  },
  spectra: {
    label: 'V8 biturbo', cylinders: 8, idle: 950, redline: 8300,
    ...CROSS_V8,
    tau: 0.0034, bright: 0.48, drive: 1.9, feedback: 0.6, jitter: 0.13, pipes: [0.005, 0.0039], turbo: 0.55, level: 0.95,
  },
};

/** Velocidade máxima (km/h) de cada marcha */
const GEARS = [58, 105, 155, 210, 272, 340, 420];
/** Faixa de giro usada em cada marcha: evita ficar gritando no limite */
const RPM_LOW = 0.42;
const RPM_HIGH = 0.8;
/** Volume geral do motor */
const BASE_GAIN = 0.11;

const workletReady = new WeakMap<BaseAudioContext, Promise<void>>();

/** Carrega o processador do motor (uma vez por contexto de áudio) */
export function loadEngineWorklet(ctx: BaseAudioContext): Promise<void> {
  let p = workletReady.get(ctx);
  if (!p) {
    if (!ctx.audioWorklet) return Promise.reject(new Error('AudioWorklet indisponível'));
    const url = URL.createObjectURL(new Blob([ENGINE_WORKLET], { type: 'application/javascript' }));
    p = ctx.audioWorklet.addModule(url);
    workletReady.set(ctx, p);
  }
  return p;
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export class EngineSound {
  private ctx: AudioContext;
  private p: EngineProfile;
  private node: AudioWorkletNode | null = null;
  private out: GainNode;
  private shiftGain: GainNode;
  private turboGain: GainNode;
  private turboFilter: BiquadFilterNode;
  private turboSrc: AudioBufferSourceNode;
  private noise: AudioBuffer;
  private extra: AudioNode[] = [];

  private rpm: number;
  private throttle = 0.2;
  private lastSpeed = 0;
  private gear = 0;
  private boost = 0;
  private lastPop = 0;
  private stopped = false;

  constructor(ctx: AudioContext, destination: AudioNode, profile: EngineProfile) {
    this.ctx = ctx;
    this.p = profile;
    // partida: o giro começa alto e assenta na marcha lenta
    this.rpm = profile.idle * 1.9;
    this.noise = noiseBuffer(ctx, 2);
    const t = ctx.currentTime;

    this.shiftGain = ctx.createGain();
    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.2;
    this.shiftGain.connect(this.out).connect(comp).connect(destination);
    this.extra.push(this.shiftGain, this.out, comp);

    // sopro do turbo: ruído filtrado, nunca um apito
    this.turboSrc = ctx.createBufferSource();
    this.turboSrc.buffer = this.noise;
    this.turboSrc.loop = true;
    this.turboFilter = ctx.createBiquadFilter();
    this.turboFilter.type = 'bandpass';
    this.turboFilter.Q.value = 1.4;
    this.turboFilter.frequency.value = 1400;
    this.turboGain = ctx.createGain();
    this.turboGain.gain.value = 0;
    this.turboSrc.connect(this.turboFilter).connect(this.turboGain).connect(this.out);
    this.turboSrc.start(t);
    this.extra.push(this.turboFilter, this.turboGain);

    this.out.gain.setTargetAtTime(BASE_GAIN * profile.level * 0.8, t, 0.12);

    loadEngineWorklet(ctx)
      .then(() => {
        if (this.stopped) return;
        this.node = new AudioWorkletNode(ctx, 'typecar-engine', {
          numberOfInputs: 0,
          outputChannelCount: [1],
          processorOptions: {
            offsets: profile.offsets,
            amps: profile.amps,
            tau: profile.tau,
            bright: profile.bright,
            drive: profile.drive,
            feedback: profile.feedback,
            jitter: profile.jitter,
            pipeA: profile.pipes[0],
            pipeB: profile.pipes[1],
          },
        });
        this.node.connect(this.shiftGain);
        this.apply(ctx.currentTime, 0.001);
      })
      .catch(() => {
        /* navegador sem AudioWorklet: segue sem som de motor */
      });
  }

  private apply(t: number, tc: number) {
    const n = Math.max(0, (this.rpm - this.p.idle) / (this.p.redline - this.p.idle));
    if (this.node) {
      this.node.parameters.get('rpm')!.setTargetAtTime(this.rpm, t, tc);
      this.node.parameters.get('throttle')!.setTargetAtTime(this.throttle, t, tc);
    }
    // um pouco mais alto com o pé no fundo, sem saltos
    this.out.gain.setTargetAtTime(BASE_GAIN * this.p.level * (0.7 + this.throttle * 0.25 + n * 0.12), t, 0.08);
    if (this.p.turbo) {
      this.turboFilter.frequency.setTargetAtTime(900 + this.boost * 1600, t, tc);
      this.turboGain.gain.setTargetAtTime(this.p.turbo * this.boost * 0.05, t, tc * 2);
    }
  }

  /** Atualiza com a velocidade atual (km/h). Chamar a cada quadro. */
  update(speed: number, dt: number) {
    if (this.stopped || dt <= 0) return;
    const t = this.ctx.currentTime;
    const accel = (speed - this.lastSpeed) / dt;
    this.lastSpeed = speed;

    let gear = GEARS.findIndex((top) => speed < top * 0.97);
    if (gear < 0) gear = GEARS.length - 1;
    const low = gear === 0 ? 0 : GEARS[gear - 1];
    const inGear = Math.min(1, Math.max(0, (speed - low) / (GEARS[gear] - low)));
    const span = this.p.redline - this.p.idle;
    const target =
      speed < 2 ? this.p.idle : this.p.idle + span * (gear === 0 ? inGear * RPM_HIGH : RPM_LOW + (RPM_HIGH - RPM_LOW) * inGear);
    const upshift = gear > this.gear;
    const downshift = gear < this.gear;
    this.gear = gear;

    const thTarget = speed < 2 ? 0.1 : Math.max(0.08, Math.min(1, 0.35 + accel / 80));
    this.throttle += (thTarget - this.throttle) * Math.min(1, dt * 5);
    this.boost += ((this.throttle > 0.45 ? (this.rpm / this.p.redline) * this.throttle : 0) - this.boost) * Math.min(1, dt * 2.5);

    const idleWobble = speed < 2 ? Math.sin(t * 7) * 18 : 0;
    this.rpm += (target + idleWobble - this.rpm) * Math.min(1, dt * (upshift ? 14 : 4.5));

    if (upshift) this.shift();
    if (downshift) this.rpm = Math.min(this.p.redline * RPM_HIGH, this.rpm * 1.1);
    // estalos raros e graves ao aliviar em giro alto
    if (this.throttle < 0.18 && this.rpm > this.p.redline * 0.5 && t - this.lastPop > 0.25 + Math.random() * 0.5) {
      this.lastPop = t;
      this.burst(0.06, 260 + Math.random() * 160, 'lowpass', 0.05);
    }
    this.apply(t, 0.04);
  }

  /** Troca de marcha: corte rápido do giro e alívio do turbo */
  private shift() {
    const t = this.ctx.currentTime;
    const g = this.shiftGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(0.45, t + 0.05);
    g.linearRampToValueAtTime(1, t + 0.2);
    if (this.p.turbo && this.boost > 0.25) this.burst(0.3, 1800, 'bandpass', 0.03 * this.p.turbo);
  }

  private burst(dur: number, freq: number, type: BiquadFilterType, gain: number) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(0.0001, t, 0.18);
    this.node?.parameters.get('rpm')!.setTargetAtTime(this.p.idle * 0.6, t, 0.3);
    setTimeout(() => {
      try {
        this.turboSrc.stop();
      } catch {
        /* já parado */
      }
      this.node?.disconnect();
      this.turboSrc.disconnect();
      for (const n of this.extra) n.disconnect();
    }, 900);
  }
}
