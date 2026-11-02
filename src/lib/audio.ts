import { ENGINES, EngineSound } from './engineSound';
import { playMagneticKey } from './keySound';
import type { CarModelId } from '../types';

/**
 * Efeitos sonoros sintetizados com Web Audio (sem arquivos externos).
 * Tudo passa por um ganho mestre controlado pelo volume das configurações.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: EngineSound | null = null;
  private engineLast = 0;
  private previewTimer: number | null = null;
  private volume = 0.6;
  private enabled = true;
  private engineEnabled = true;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Deve ser chamado num gesto do usuário */
  unlock() {
    this.ensure();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.enabled ? v : 0, this.ctx.currentTime, 0.02);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.setVolume(this.volume);
  }

  setEngineEnabled(on: boolean) {
    this.engineEnabled = on;
    if (!on) this.stopEngine();
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slideTo?: number) {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.enabled) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Toque de tecla com som de switch magnético; `char` deixa o espaço mais grave */
  key(char?: string) {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.enabled) return;
    playMagneticKey(ctx, this.master, char);
  }

  error() {
    this.tone(150, 0.12, 'square', 0.12, 0, 90);
  }

  word() {
    this.tone(880, 0.06, 'triangle', 0.06);
  }

  streak() {
    this.tone(660, 0.08, 'triangle', 0.1);
    this.tone(990, 0.12, 'triangle', 0.1, 0.06);
  }

  countdown() {
    this.tone(440, 0.25, 'square', 0.12);
  }

  go() {
    this.tone(880, 0.5, 'square', 0.14);
    this.tone(1320, 0.5, 'triangle', 0.08);
  }

  overtake(gained: boolean) {
    if (gained) this.tone(520, 0.18, 'sawtooth', 0.06, 0, 1040);
    else this.tone(500, 0.2, 'sawtooth', 0.05, 0, 260);
  }

  click() {
    this.tone(1200, 0.04, 'triangle', 0.06);
  }

  hover() {
    this.tone(1800, 0.02, 'sine', 0.025);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.12, i * 0.12));
    this.tone(1568, 0.8, 'sine', 0.06, 0.5);
  }

  lose() {
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.1, i * 0.18));
  }

  startEngine(car: CarModelId) {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.engineEnabled) return;
    this.stopEngine();
    this.engine = new EngineSound(ctx, this.master, ENGINES[car]);
    this.engineLast = performance.now();
  }

  /** speed em km/h; chamar a cada quadro */
  setEngineSpeed(speed: number) {
    if (!this.engine) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.engineLast) / 1000);
    this.engineLast = now;
    this.engine.update(speed, dt);
  }

  stopEngine() {
    if (this.previewTimer !== null) {
      clearInterval(this.previewTimer);
      this.previewTimer = null;
    }
    this.engine?.stop();
    this.engine = null;
  }

  /** Demonstração na garagem: liga, acelera trocando marchas e alivia */
  previewEngine(car: CarModelId) {
    this.unlock();
    if (!this.enabled) return;
    const wasEnabled = this.engineEnabled;
    this.engineEnabled = true;
    this.startEngine(car);
    this.engineEnabled = wasEnabled;
    const t0 = performance.now();
    this.previewTimer = window.setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      // 0,8 s em marcha lenta, 3,6 s acelerando, 1,6 s aliviando
      const speed = t < 0.8 ? 0 : t < 4.4 ? Math.min(300, 300 * Math.pow((t - 0.8) / 3.6, 0.8)) : Math.max(0, 300 - (t - 4.4) * 190);
      this.setEngineSpeed(speed);
      if (t > 6.2) this.stopEngine();
    }, 30);
  }

  get previewing() {
    return this.previewTimer !== null;
  }
}

export const audio = new AudioEngine();
