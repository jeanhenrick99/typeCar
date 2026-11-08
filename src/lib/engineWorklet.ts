/**
 * Processador de áudio (AudioWorklet) que simula o motor amostra a amostra:
 * cada cilindro dispara um pulso de pressão no seu ângulo do virabrequim,
 * os pulsos passam por dois tubos de escapamento (linhas de atraso com
 * realimentação, que dão o "corpo" do ronco) e por um abafador passa-baixa.
 * Fica como texto para ser carregado por Blob URL, sem arquivo extra.
 */
export const ENGINE_WORKLET = /* js */ `
class TypeCarEngine extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rpm', defaultValue: 900, minValue: 0, maxValue: 12000, automationRate: 'k-rate' },
      { name: 'throttle', defaultValue: 0.2, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor(options) {
    super();
    const o = options.processorOptions;
    this.offsets = o.offsets;      // ângulo de disparo de cada cilindro (0..1 do ciclo de 720°)
    this.amps = o.amps;            // força de cada cilindro (bancadas diferentes soam diferente)
    this.tau = o.tau;              // duração do pulso em segundos
    this.bright = o.bright;        // abertura do abafador (0..1)
    this.drive = o.drive;          // saturação suave
    this.fb = o.feedback;          // ressonância dos tubos
    this.jit = o.jitter;           // irregularidade natural da combustão
    this.phase = 0;
    this.exc = 0;
    this.thump = 0;
    const sr = sampleRate;
    this.lenA = Math.max(8, Math.round(o.pipeA * sr));
    this.lenB = Math.max(8, Math.round(o.pipeB * sr));
    this.bufA = new Float32Array(this.lenA);
    this.bufB = new Float32Array(this.lenB);
    this.iA = 0;
    this.iB = 0;
    this.lpA = 0;
    this.lpB = 0;
    this.lp1 = 0;
    this.lp2 = 0;
    this.dcX = 0;
    this.dcY = 0;
    this.intake = 0;
    this.gainCyl = new Float32Array(this.offsets.length).fill(1);
  }

  process(_inputs, outputs, params) {
    const out = outputs[0][0];
    if (!out) return true;
    const sr = sampleRate;
    const rpm = Math.max(200, params.rpm[0]);
    const th = params.throttle[0];
    const cycleHz = rpm / 120;              // um ciclo = 2 voltas do virabrequim
    const step = cycleHz / sr;
    const fireHz = cycleHz * this.offsets.length;
    // pulso mais curto em giro alto para não embolar
    const tau = Math.min(this.tau, 0.55 / fireHz);
    const decay = Math.exp(-1 / (tau * sr));
    const thumpDecay = Math.exp(-1 / (tau * 2.2 * sr));
    // abafador: mais aberto com o pé no fundo, sempre abaixo de ~2,4 kHz
    const cut = Math.min(2400, 260 + fireHz * (1.4 + this.bright * 1.6) + th * 700 * this.bright);
    const a1 = 1 - Math.exp((-2 * Math.PI * cut) / sr);
    const loopCut = 1 - Math.exp((-2 * Math.PI * (900 + this.bright * 900)) / sr);
    const fb = this.fb * (0.85 + th * 0.15);
    const level = 0.55 + th * 0.45;
    const n = this.offsets.length;

    for (let s = 0; s < out.length; s++) {
      const prev = this.phase;
      this.phase += step;
      if (this.phase >= 1) this.phase -= 1;
      for (let c = 0; c < n; c++) {
        const off = this.offsets[c];
        const crossed = prev <= this.phase ? prev < off && this.phase >= off : prev < off || this.phase >= off;
        if (crossed) {
          // cada explosão varia um pouco, como num motor real
          this.gainCyl[c] = 1 + (Math.random() * 2 - 1) * this.jit;
          const hit = this.amps[c] * this.gainCyl[c] * level;
          this.exc += hit;
          this.thump += hit * 0.8;
        }
      }
      this.exc *= decay;
      this.thump *= thumpDecay;
      const noise = Math.random() * 2 - 1;
      // pressão do pulso: grave e arredondada, com um pouco de textura
      const src = this.thump * 0.9 + this.exc * (0.35 + 0.65 * noise) * 0.45;

      // dois tubos de escapamento ressonantes
      const dA = this.bufA[this.iA];
      const dB = this.bufB[this.iB];
      this.lpA += (dA - this.lpA) * loopCut;
      this.lpB += (dB - this.lpB) * loopCut;
      const yA = src - this.lpA * fb;
      const yB = src - this.lpB * fb;
      this.bufA[this.iA] = yA;
      this.bufB[this.iB] = yB;
      this.iA = (this.iA + 1) % this.lenA;
      this.iB = (this.iB + 1) % this.lenB;
      let y = (yA + yB) * 0.5;

      // ruído de admissão que acompanha os pulsos, bem discreto
      this.intake += (noise * this.exc - this.intake) * 0.08;
      y += this.intake * th * 0.25;

      // abafador (passa-baixa de 2 polos)
      this.lp1 += (y - this.lp1) * a1;
      this.lp2 += (this.lp1 - this.lp2) * a1;
      // tira o deslocamento DC
      const dc = this.lp2 - this.dcX + 0.995 * this.dcY;
      this.dcX = this.lp2;
      this.dcY = dc;
      // saturação suave
      const d = dc * this.drive;
      out[s] = Math.tanh(d) / Math.tanh(this.drive);
    }
    for (let ch = 1; ch < outputs[0].length; ch++) outputs[0][ch].set(out);
    return true;
  }
}
registerProcessor('typecar-engine', TypeCarEngine);
`;
