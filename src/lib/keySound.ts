/**
 * Som de tecla de switch magnético (Hall Effect): um "thock" grave e macio
 * quando a tecla bate no fundo, com um leve toque de plástico e uma subida
 * discreta. Cada toque varia um pouco para não soar repetitivo; a barra de
 * espaço é mais grave e longa, como uma tecla com estabilizador.
 */

let noise: AudioBuffer | null = null;

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** Ruído filtrado com envelope curto */
function burst(ctx: BaseAudioContext, dest: AudioNode, t: number, freq: number, q: number, gain: number, decay: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(bp).connect(g).connect(dest);
  src.start(t, Math.random() * 0.4);
  src.stop(t + decay + 0.02);
}

/** Tom grave com queda de afinação: o corpo do "thock" */
function body(ctx: BaseAudioContext, dest: AudioNode, t: number, freq: number, type: OscillatorType, gain: number, decay: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq * 1.5, t);
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.012);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.0025);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + decay + 0.02);
}

export function playMagneticKey(ctx: BaseAudioContext, dest: AudioNode, char?: string, at = ctx.currentTime) {
  const t = at;
  const space = char === ' ';
  const vary = 1 + (Math.random() - 0.5) * 0.12;

  // tira os agudos ásperos: o som fica "macio"
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = space ? 2600 : 3800;
  lp.Q.value = 0.5;
  // volume equilibrado com o motor e os demais efeitos
  const level = ctx.createGain();
  level.gain.value = 0.62;
  lp.connect(level).connect(dest);

  const f = (space ? 140 : 235) * vary;
  // fundo da tecla: grave + segundo modo da carcaça
  body(ctx, lp, t, f, 'sine', space ? 0.55 : 0.42, space ? 0.1 : 0.06);
  body(ctx, lp, t, f * 2.35, 'triangle', space ? 0.1 : 0.12, space ? 0.045 : 0.032);
  // toque de plástico (bem curto)
  burst(ctx, lp, t, (space ? 1100 : 1700) * vary, 1.1, space ? 0.28 : 0.32, 0.018);
  // estabilizador da barra de espaço: um leve chacoalhar
  if (space) burst(ctx, lp, t + 0.012, 700, 2, 0.08, 0.04);
  // subida da tecla: um tic discreto ao soltar
  burst(ctx, lp, t + 0.075 + Math.random() * 0.02, 2600 * vary, 2, 0.05, 0.01);
}
