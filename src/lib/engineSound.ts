import type { CarModelId } from '../types';

/**
 * Motor sintetizado com Web Audio. A frequência base é a de ignição
 * (RPM / 60 × cilindros / 2), com harmônicos saturados, ruído de admissão
 * e escape, troca de marchas, pipocos ao aliviar e turbo opcional.
 */

export interface EngineProfile {
  label: string;
  cylinders: number;
  idle: number;
  redline: number;
  /** Saturação (0–1): quanto mais alto, mais "rasgado" */
  grit: number;
  /** Brilho do timbre (0–1): V12 é mais agudo, V8 mais grave */
  brightness: number;
  /** Ronco irregular em baixa (0–1), típico de V8 */
  burble: number;
  /** Intensidade do turbo (0 = aspirado) */
  turbo: number;
}

export const ENGINES: Record<CarModelId, EngineProfile> = {
  raptor: { label: 'V12 aspirado', cylinders: 12, idle: 1000, redline: 9500, grit: 0.35, brightness: 0.85, burble: 0.15, turbo: 0 },
  kaze: { label: '6 em linha biturbo', cylinders: 6, idle: 900, redline: 8000, grit: 0.55, brightness: 0.55, burble: 0.2, turbo: 1 },
  rosso: { label: 'V8 híbrido biturbo', cylinders: 8, idle: 1000, redline: 8500, grit: 0.45, brightness: 0.65, burble: 0.45, turbo: 0.45 },
  blaze: { label: 'V8 biturbo', cylinders: 8, idle: 950, redline: 8200, grit: 0.6, brightness: 0.5, burble: 0.6, turbo: 0.7 },
  ronin: { label: 'V6 biturbo', cylinders: 6, idle: 850, redline: 7100, grit: 0.65, brightness: 0.45, burble: 0.35, turbo: 0.9 },
  spectra: { label: 'V8 biturbo', cylinders: 8, idle: 950, redline: 8300, grit: 0.5, brightness: 0.6, burble: 0.5, turbo: 0.6 },
};

/** Velocidade máxima (km/h) de cada marcha */
const GEARS = [58, 105, 155, 210, 272, 340, 420];

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function shaperCurve(amount: number): Float32Array {
  const k = 1 + amount * 6;
  const n = 1024;
  const curve = new Float32Array(n);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / norm;
  }
  return curve;
}

export class EngineSound {
  private ctx: AudioContext;
  private p: EngineProfile;
  private nodes: AudioNode[] = [];
  private sources: AudioScheduledSourceNode[] = [];

  private fire: OscillatorNode;
  private sub: OscillatorNode;
  private harm: OscillatorNode;
  private harmGain: GainNode;
  private noiseFilter: BiquadFilterNode;
  private noiseGain: GainNode;
  private tone: BiquadFilterNode;
  private lfo: OscillatorNode;
  private lfoDepth: GainNode;
  private turboOsc: OscillatorNode;
  private turboGain: GainNode;
  private out: GainNode;
  /** Estágio separado para o corte de giro na troca de marcha */
  private shiftGain: GainNode;
  private noise: AudioBuffer;

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
    this.rpm = profile.idle;
    this.noise = noiseBuffer(ctx, 2);
    const t = ctx.currentTime;

    const mix = this.node(ctx.createGain());
    const shaper = this.node(ctx.createWaveShaper());
    shaper.curve = shaperCurve(profile.grit);
    shaper.oversample = '2x';
    this.tone = this.node(ctx.createBiquadFilter());
    this.tone.type = 'lowpass';
    this.tone.Q.value = 0.9;
    const hp = this.node(ctx.createBiquadFilter());
    hp.type = 'highpass';
    hp.frequency.value = 38;
    const am = this.node(ctx.createGain());
    am.gain.value = 1;
    this.out = this.node(ctx.createGain());
    this.out.gain.value = 0.0001;
    this.shiftGain = this.node(ctx.createGain());
    this.shiftGain.gain.value = 1;
    const comp = this.node(ctx.createDynamicsCompressor());
    comp.threshold.value = -18;
    comp.ratio.value = 4;

    // tom de ignição (dente de serra) + sub grave + harmônico
    this.fire = this.osc('sawtooth', mix, 0.55);
    this.sub = this.osc('triangle', mix, 0.7);
    this.harmGain = this.node(ctx.createGain());
    this.harmGain.gain.value = 0.12 + profile.brightness * 0.25;
    this.harm = ctx.createOscillator();
    this.harm.type = 'sine';
    this.harm.connect(this.harmGain).connect(mix);
    this.sources.push(this.harm);

    // admissão/escape: ruído filtrado que abre com o acelerador
    const nsrc = ctx.createBufferSource();
    nsrc.buffer = this.noise;
    nsrc.loop = true;
    this.noiseFilter = this.node(ctx.createBiquadFilter());
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.Q.value = 0.7;
    this.noiseGain = this.node(ctx.createGain());
    this.noiseGain.gain.value = 0.05;
    nsrc.connect(this.noiseFilter).connect(this.noiseGain).connect(mix);
    this.sources.push(nsrc);

    mix.connect(shaper).connect(this.tone).connect(hp).connect(am).connect(this.shiftGain).connect(this.out).connect(comp).connect(destination);

    // pulsação irregular (burble) modulando o volume
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfoDepth = this.node(ctx.createGain());
    this.lfoDepth.gain.value = 0;
    this.lfo.connect(this.lfoDepth).connect(am.gain);
    this.sources.push(this.lfo);

    // assobio do turbo
    this.turboOsc = ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboGain = this.node(ctx.createGain());
    this.turboGain.gain.value = 0;
    this.turboOsc.connect(this.turboGain).connect(this.out);
    this.sources.push(this.turboOsc);

    this.applyRpm(t, 0.001);
    for (const s of this.sources) s.start(t);
    // partida: giro sobe rápido e assenta na marcha lenta
    this.out.gain.setTargetAtTime(0.11, t, 0.08);
    this.fire.frequency.setValueAtTime(this.fireHz(this.p.idle * 2.2), t + 0.05);
    this.fire.frequency.setTargetAtTime(this.fireHz(this.p.idle), t + 0.25, 0.25);
  }

  private node<T extends AudioNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }

  private osc(type: OscillatorType, dest: AudioNode, gain: number): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    const g = this.node(this.ctx.createGain());
    g.gain.value = gain;
    o.connect(g).connect(dest);
    this.sources.push(o);
    return o;
  }

  private fireHz(rpm: number) {
    return (rpm / 60) * (this.p.cylinders / 2);
  }

  private applyRpm(t: number, tc: number) {
    const f = this.fireHz(this.rpm);
    const n = (this.rpm - this.p.idle) / (this.p.redline - this.p.idle);
    const th = this.throttle;
    this.fire.frequency.setTargetAtTime(f, t, tc);
    this.sub.frequency.setTargetAtTime(f / 2, t, tc);
    this.harm.frequency.setTargetAtTime(f * 2, t, tc);
    this.tone.frequency.setTargetAtTime(180 + f * (1.6 + this.p.brightness * 2.2) + th * 1400, t, tc);
    this.noiseFilter.frequency.setTargetAtTime(f * 2.5 + 300, t, tc);
    this.noiseGain.gain.setTargetAtTime(0.03 + th * 0.22, t, tc);
    this.lfo.frequency.setTargetAtTime(Math.max(4, f / 4), t, tc);
    this.lfoDepth.gain.setTargetAtTime(this.p.burble * (0.35 - n * 0.3) * (1.2 - th), t, tc);
    this.out.gain.setTargetAtTime(0.06 + th * 0.07 + n * 0.03, t, tc * 3);
    if (this.p.turbo) {
      this.turboOsc.frequency.setTargetAtTime(1800 + this.boost * 4200, t, tc);
      this.turboGain.gain.setTargetAtTime(this.p.turbo * this.boost * 0.012, t, tc);
    }
  }

  /** Atualiza com a velocidade atual (km/h). Chamar a cada quadro. */
  update(speed: number, dt: number) {
    if (this.stopped || dt <= 0) return;
    const t = this.ctx.currentTime;
    const accel = (speed - this.lastSpeed) / dt;
    this.lastSpeed = speed;

    // marcha e giro alvo
    let gear = GEARS.findIndex((top) => speed < top * 0.97);
    if (gear < 0) gear = GEARS.length - 1;
    const target = Math.max(this.p.idle, this.p.redline * Math.min(1, speed / GEARS[gear]));
    const upshift = gear > this.gear;
    const downshift = gear < this.gear;
    this.gear = gear;

    // acelerador estimado pela aceleração do carro
    const thTarget = speed < 3 ? 0.12 : Math.max(0.05, Math.min(1, 0.3 + accel / 70));
    this.throttle += (thTarget - this.throttle) * Math.min(1, dt * 6);
    this.boost += ((this.throttle > 0.4 ? (this.rpm / this.p.redline) * this.throttle : 0) - this.boost) * Math.min(1, dt * 3);

    const idleWobble = speed < 3 ? Math.sin(t * 9) * 25 : 0;
    this.rpm += (target + idleWobble - this.rpm) * Math.min(1, dt * (upshift ? 18 : 7));

    if (upshift) this.shift();
    if (downshift) this.blip();
    // pipocos no escape ao aliviar em giro alto
    if (this.throttle < 0.2 && this.rpm > this.p.redline * 0.45 && t - this.lastPop > 0.06 + Math.random() * 0.18) {
      this.lastPop = t;
      this.pop(0.5 + Math.random() * 0.5);
    }
    this.applyRpm(t, 0.03);
  }

  /** Corte de giro na troca de marcha (+ alívio do turbo) */
  private shift() {
    const t = this.ctx.currentTime;
    const g = this.shiftGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(1, t);
    g.linearRampToValueAtTime(0.35, t + 0.04);
    g.linearRampToValueAtTime(1, t + 0.16);
    if (this.p.turbo && this.boost > 0.2) this.burst(0.28, 2600, 'highpass', 0.05 * this.p.turbo);
    this.pop(0.8);
  }

  /** Reduzida: pequena acelerada em vazio */
  private blip() {
    this.rpm = Math.min(this.p.redline, this.rpm * 1.15);
  }

  private pop(strength: number) {
    this.burst(0.05 + Math.random() * 0.04, 500 + Math.random() * 500, 'lowpass', 0.09 * strength);
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
    this.fire.frequency.setTargetAtTime(this.fireHz(this.p.idle * 0.6), t, 0.3);
    setTimeout(() => {
      for (const s of this.sources) {
        try {
          s.stop();
        } catch {
          /* já parado */
        }
      }
      for (const n of this.nodes) n.disconnect();
    }, 900);
  }
}
