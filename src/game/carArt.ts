import type { CarModelId } from '../types';

/**
 * Arte dos carros: imagens recortadas (fundo transparente) em public/cars.
 * Cada carro tem as rodas mapeadas para girarem no jogo, e a pintura pode
 * ser trocada por troca de matiz apenas nos pixels da cor original.
 */

interface Paint {
  /** 'hue': pintura colorida (troca a matiz); 'white': pintura branca (tinge os tons claros) */
  mode: 'hue' | 'white';
  hue?: number;
  range?: number;
}

export interface CarArtMeta {
  src: string;
  w: number;
  h: number;
  /**
   * Rodas em pixels da imagem: [cuboX, cuboY, pneuX, pneuY, raioX, raioY].
   * O pneu é uma elipse (perspectiva); o aro gira em torno do cubo.
   */
  wheels: [number, number, number, number, number, number][];
  paint: Paint;
}

export const CAR_ART: Record<CarModelId, CarArtMeta> = {
  // carroceria preta: a troca de cor muda os detalhes amarelos
  raptor: { src: '/cars/raptor.webp', w: 864, h: 236, wheels: [[91, 148, 91, 147, 58.5, 65], [502, 166, 504, 164, 63, 67]], paint: { mode: 'hue', hue: 44, range: 18 } },
  kaze: { src: '/cars/kaze.webp', w: 850, h: 247, wheels: [[115, 173, 112, 170, 59, 60], [532, 183, 524, 181, 58, 64]], paint: { mode: 'hue', hue: 228, range: 24 } },
  rosso: { src: '/cars/rosso.webp', w: 829, h: 226, wheels: [[89, 150, 84, 148, 56, 61], [500, 160, 500, 158, 60.6, 64]], paint: { mode: 'hue', hue: 355, range: 22 } },
  blaze: { src: '/cars/blaze.webp', w: 836, h: 233, wheels: [[93, 146, 85, 142, 55, 66.6], [515, 163, 512, 161, 59.6, 68]], paint: { mode: 'hue', hue: 26, range: 16 } },
  ronin: { src: '/cars/ronin.webp', w: 927, h: 266, wheels: [[142, 186, 134.5, 189, 53.6, 57], [615, 195, 610.5, 193, 65.5, 66.6]], paint: { mode: 'white' } },
  spectra: { src: '/cars/spectra.webp', w: 938, h: 271, wheels: [[106, 171, 97, 171, 59, 71], [607, 192, 601, 190, 74, 77]], paint: { mode: 'hue', hue: 272, range: 30 } },
};

/** Fração da altura da imagem onde os pneus tocam o chão */
export function groundRatio(model: CarModelId): number {
  const m = CAR_ART[model];
  return Math.max(...m.wheels.map(([, , , ty, , ry]) => ty + ry)) / m.h;
}

// ───────────── carregamento e pintura ─────────────

const images = new Map<string, Promise<HTMLImageElement>>();
const painted = new Map<string, HTMLCanvasElement>();
const pending = new Map<string, Promise<HTMLCanvasElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  let p = images.get(src);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgbToHsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** Repinta a imagem trocando apenas os pixels da pintura original */
function repaint(img: HTMLImageElement, meta: CarArtMeta, color: string | null): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  if (!color) return c;

  const [th, ts, tl] = hexToHsl(color);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  const { paint } = meta;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    let weight = 0;
    let nh = th;
    let ns = s;
    let nl = l;
    if (paint.mode === 'hue') {
      if (s < 0.28 || l < 0.08) continue;
      // diferença circular de matiz (vermelho fica dos dois lados do 0°)
      const delta = ((h - paint.hue! + 540) % 360) - 180;
      const dist = Math.abs(delta);
      if (dist > paint.range!) continue;
      weight = Math.min(1, (paint.range! - dist) / 6) * Math.min(1, (s - 0.28) / 0.15);
      nh = th + delta * 0.4;
      ns = clamp(s * Math.max(ts, 0.04) * 1.05);
      nl = clamp(l * (0.35 + tl * 1.3));
    } else {
      // pintura branca: tinge os tons claros e pouco saturados
      if (s > 0.2 || l < 0.42) continue;
      weight = Math.min(1, (l - 0.42) / 0.12) * Math.min(1, (0.2 - s) / 0.08);
      ns = clamp(ts * 0.95);
      nl = clamp(l * (0.25 + tl * 0.85));
    }
    const [r, g, b] = hslToRgb(nh, ns, nl);
    d[i] = Math.round(d[i] + (r - d[i]) * weight);
    d[i + 1] = Math.round(d[i + 1] + (g - d[i + 1]) * weight);
    d[i + 2] = Math.round(d[i + 2] + (b - d[i + 2]) * weight);
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Arte do carro já pintada. `color` igual à cor original (signature) ou null
 * mantém a pintura da imagem.
 */
export function loadCarArt(model: CarModelId, color: string | null): Promise<HTMLCanvasElement> {
  const key = `${model}|${color ?? 'orig'}`;
  const done = painted.get(key);
  if (done) return Promise.resolve(done);
  let p = pending.get(key);
  if (!p) {
    const meta = CAR_ART[model];
    p = loadImage(meta.src).then((img) => {
      const canvas = repaint(img, meta, color);
      painted.set(key, canvas);
      pending.delete(key);
      return canvas;
    });
    pending.set(key, p);
  }
  return p;
}

/** Versão síncrona para o loop do jogo: null enquanto carrega */
export function getCarArt(model: CarModelId, color: string | null): HTMLCanvasElement | null {
  const key = `${model}|${color ?? 'orig'}`;
  const done = painted.get(key);
  if (!done) void loadCarArt(model, color);
  return done ?? null;
}

/** Fração do raio do pneu ocupada pelo aro (o resto é a borracha com as inscrições) */
const RIM_RATIO = 0.8;
/** Supersample das camadas da roda */
const Q = 2;

let scratch: HTMLCanvasElement | null = null;

/**
 * Desenha uma camada da roda girando em perspectiva: a elipse é convertida
 * em círculo, girada e achatada de volta. A máscara elíptica tem borda suave
 * para não deixar costura com a imagem parada por baixo.
 */
function drawWheelLayer(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  left: number,
  top: number,
  k: number,
  cx: number,
  cy: number,
  maskRx: number,
  maskRy: number,
  f: number,
  angle: number,
  blur: number,
  fadeTop: boolean,
) {
  const W = Math.ceil((maskRx * 2 + 8) * k * Q);
  const H = Math.ceil((maskRy * 2 + 8) * k * Q);
  if (W < 2 || H < 2) return;
  if (!scratch) scratch = document.createElement('canvas');
  scratch.width = W;
  scratch.height = H;
  const o = scratch.getContext('2d')!;

  // rotação com rastro de movimento em alta velocidade
  const passes: [number, number][] = blur > 0.05 ? [[0, 1], [0.16 * blur, 0.45 * blur], [-0.16 * blur, 0.45 * blur]] : [[0, 1]];
  for (const [off, alpha] of passes) {
    o.save();
    o.globalAlpha = alpha;
    o.translate(W / 2, H / 2);
    o.scale(f, 1);
    o.rotate(angle + off);
    o.scale(1 / f, 1);
    o.scale(k * Q, k * Q);
    o.drawImage(art, -cx, -cy);
    o.restore();
  }

  // máscara elíptica com borda suave
  o.globalCompositeOperation = 'destination-in';
  o.save();
  o.translate(W / 2, H / 2);
  o.scale(maskRx / maskRy, 1);
  const R = maskRy * k * Q;
  const feather = Math.min(0.25, 3 / maskRy);
  const g = o.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, '#000');
  g.addColorStop(1 - feather, '#000');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = g;
  o.fillRect(-R * 2, -R, R * 4, R * 2);
  o.restore();

  // o topo do pneu pode ficar sob o para-lama: some suavemente ali
  if (fadeTop) {
    const lg = o.createLinearGradient(0, H / 2 - R, 0, H / 2 - R * 0.8);
    lg.addColorStop(0, 'rgba(0,0,0,0)');
    lg.addColorStop(1, '#000');
    o.fillStyle = lg;
    o.fillRect(0, 0, W, H);
  }
  o.globalCompositeOperation = 'source-over';

  ctx.drawImage(scratch, left + cx * k - W / (2 * Q), top + cy * k - H / (2 * Q), W / Q, H / Q);
}

/**
 * Desenha o carro com as rodas girando. `width` é a largura total da imagem
 * na tela; `blur` (0..1) adiciona rastro de movimento nas rodas.
 */
export function drawCarArt(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  model: CarModelId,
  left: number,
  top: number,
  width: number,
  angle: number,
  blur = 0,
) {
  const meta = CAR_ART[model];
  const k = width / meta.w;
  ctx.drawImage(art, left, top, width, meta.h * k);
  if (angle === 0 && blur === 0) return;
  for (const [hx, hy, tx, ty, rx, ry] of meta.wheels) {
    const f = rx / ry;
    // pneu inteiro gira em torno do próprio centro…
    drawWheelLayer(ctx, art, left, top, k, tx, ty, rx, ry, f, angle, blur, true);
    // …e o aro gira por cima, em torno do cubo
    drawWheelLayer(ctx, art, left, top, k, hx, hy, rx * RIM_RATIO, ry * RIM_RATIO, f, angle, blur, false);
  }
}
