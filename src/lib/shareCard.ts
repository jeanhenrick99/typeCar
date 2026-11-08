import type { CarModelId, RaceResult } from '../types';
import { CAR_ART, drawCarArt, drawUnderglow, groundRatio, loadCarArt } from '../game/carArt';
import { getCarModel } from '../data/cars';
import { resolveColor } from './progression';

export type CardFormat = 'story' | 'feed';

export const CARD_SIZES: Record<CardFormat, { w: number; h: number; label: string }> = {
  story: { w: 1080, h: 1920, label: 'Stories / TikTok (9:16)' },
  feed: { w: 1080, h: 1350, label: 'Feed (4:5)' },
};

export const SHARE_URL = 'type-car.vercel.app';

export interface CardData {
  result: RaceResult;
  nickname: string;
  level: number;
  streak: number;
  car: CarModelId;
  color: string;
  rim: string | null;
  neon: string | null;
  trackName: string;
  trackColor: string;
  difficultyName: string;
}

function formatTime(ms: number) {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${(s % 60).toFixed(1).padStart(4, '0')}` : `${s.toFixed(1)}s`;
}

/** Texto com espaçamento entre letras (canvas não tem letter-spacing em todos os navegadores) */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' | 'right' = 'left') {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
}

/** Painel inclinado no estilo do HUD */
function skewPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  const s = h * 0.22;
  ctx.beginPath();
  ctx.moveTo(x + s, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - s, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Monta a imagem de resultado pronta para postar */
export async function renderShareCard(data: CardData, format: CardFormat): Promise<HTMLCanvasElement> {
  const { w: W, h: H } = CARD_SIZES[format];
  const story = format === 'story';
  const r = data.result;
  const win = r.position === 1;
  const accent = win ? '#ff6a00' : r.position <= 3 ? '#00d4ff' : '#ff2b4a';

  await Promise.all([
    document.fonts.load('900 100px Orbitron'),
    document.fonts.load('700 40px Rajdhani'),
    document.fonts.load('700 40px "JetBrains Mono"'),
  ]).catch(() => undefined);
  const paint = data.color.toLowerCase() === getCarModel(data.car).signature.toLowerCase() ? null : data.color;
  const art = await loadCarArt(data.car, paint);

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // fundo: asfalto noturno com brilho da cor do resultado
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#05070d');
  bg.addColorStop(0.55, '#0a0e1a');
  bg.addColorStop(1, '#05070d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 0.7);
  glow.addColorStop(0, `${accent}55`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // linhas de velocidade
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const y = ((i * 97) % 100) / 100 * H;
    const x = ((i * 61) % 100) / 100 * W;
    const len = 120 + ((i * 37) % 100) * 3;
    const g = ctx.createLinearGradient(x, 0, x + len, 0);
    g.addColorStop(0, 'rgba(0,212,255,0)');
    g.addColorStop(1, i % 3 === 0 ? `${accent}66` : 'rgba(0,212,255,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, len, i % 4 === 0 ? 3 : 1.5);
  }
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  const pad = 80;

  // logo
  let y = story ? 170 : 120;
  ctx.font = 'italic 900 64px Orbitron, sans-serif';
  ctx.textAlign = 'left';
  const typeW = ctx.measureText('TYPE').width;
  const carW = ctx.measureText('CAR').width;
  const lx = W / 2 - (typeW + carW) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TYPE', lx, y);
  ctx.fillStyle = '#ff6a00';
  ctx.shadowColor = '#ff6a00';
  ctx.shadowBlur = 24;
  ctx.fillText('CAR', lx + typeW, y);
  ctx.shadowBlur = 0;

  // título do resultado
  y += story ? 150 : 115;
  ctx.textAlign = 'center';
  ctx.font = `italic 900 ${story ? 120 : 100}px Orbitron, sans-serif`;
  ctx.fillStyle = win ? '#ffffff' : accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 50;
  ctx.fillText(win ? 'VITÓRIA!' : `${r.position}º LUGAR`, W / 2, y);
  ctx.shadowBlur = 0;
  y += story ? 64 : 54;
  ctx.font = '700 38px Rajdhani, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  spaced(ctx, `${data.trackName.toUpperCase()} · ${data.difficultyName.toUpperCase()}`, W / 2, y, 6, 'center');

  // carro
  const meta = CAR_ART[data.car];
  const carWpx = W * (story ? 0.94 : 0.86);
  const carH = carWpx * (meta.h / meta.w);
  const carTop = y + (story ? 90 : 40);
  const carLeft = (W - carWpx) / 2;
  const ground = carTop + carH * groundRatio(data.car);
  // palco iluminado
  const stage = ctx.createRadialGradient(W / 2, ground, 0, W / 2, ground, W * 0.6);
  stage.addColorStop(0, `${accent}40`);
  stage.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(0, ground);
  ctx.scale(1, 0.25);
  ctx.fillStyle = stage;
  ctx.fillRect(0, -W, W, W * 2);
  ctx.restore();
  // sombra
  ctx.save();
  ctx.translate(W / 2, ground);
  ctx.scale(1, 0.07);
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, carWpx * 0.5);
  sh.addColorStop(0, 'rgba(0,0,0,0.85)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(-carWpx, -carWpx, carWpx * 2, carWpx * 2);
  ctx.restore();
  const neon = resolveColor(data.neon, 1.2);
  if (neon) drawUnderglow(ctx, W / 2, ground, carWpx * 0.92, neon, 1.2);
  drawCarArt(ctx, art, data.car, carLeft, carTop, carWpx, 0, 0, data.rim);
  // linha do chão
  const gl = ctx.createLinearGradient(pad, 0, W - pad, 0);
  gl.addColorStop(0, 'rgba(0,212,255,0)');
  gl.addColorStop(0.5, 'rgba(0,212,255,0.7)');
  gl.addColorStop(1, 'rgba(0,212,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(pad, ground + 14, W - pad * 2, 2);

  // PPM em destaque
  y = ground + (story ? 290 : 200);
  ctx.textAlign = 'center';
  ctx.font = `italic 900 ${story ? 260 : 190}px Orbitron, sans-serif`;
  ctx.fillStyle = '#00d4ff';
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 60;
  const ppm = String(r.wpm);
  ctx.fillText(ppm, W / 2 - 60, y);
  const ppmW = ctx.measureText(ppm).width;
  ctx.shadowBlur = 0;
  ctx.font = `800 ${story ? 56 : 46}px Orbitron, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'left';
  ctx.fillText('PPM', W / 2 - 60 + ppmW / 2 + 18, y);
  y += story ? 60 : 46;
  ctx.textAlign = 'center';
  ctx.font = '700 34px Rajdhani, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  spaced(ctx, 'PALAVRAS POR MINUTO', W / 2, y, 8, 'center');

  // estatísticas
  y += story ? 70 : 50;
  const stats = [
    { label: 'POSIÇÃO', value: `${r.position}º/${r.totalRacers}` },
    { label: 'PRECISÃO', value: `${r.accuracy.toFixed(1)}%` },
    { label: 'TEMPO', value: formatTime(r.timeMs) },
  ];
  const gap = 22;
  const bw = (W - pad * 2 - gap * 2) / 3;
  const bh = story ? 150 : 128;
  stats.forEach((s, i) => {
    const bx = pad + i * (bw + gap);
    skewPanel(ctx, bx, y, bw, bh, 'rgba(255,255,255,0.07)');
    ctx.fillStyle = i === 0 ? accent : '#00d4ff';
    ctx.fillRect(bx + bh * 0.22, y, bw - bh * 0.22, 4);
    ctx.font = '700 28px Rajdhani, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    spaced(ctx, s.label, bx + bw / 2, y + 46, 5, 'center');
    ctx.font = `900 ${story ? 58 : 50}px Orbitron, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.value, bx + bw / 2, y + bh - 30);
  });

  // piloto
  y += bh + (story ? 150 : 80);
  ctx.font = '900 46px Orbitron, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(data.nickname.toUpperCase(), W / 2, y);
  y += 52;
  ctx.font = '700 36px Rajdhani, sans-serif';
  const parts = [`NÍVEL ${data.level}`, getCarModel(data.car).name.toUpperCase()];
  if (data.streak > 0) parts.push(`${data.streak} ${data.streak === 1 ? 'DIA' : 'DIAS'} SEGUIDOS`);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const line = parts.join('  ·  ');
  spaced(ctx, line, W / 2, y, 3, 'center');

  // chamada final
  const footY = H - (story ? 200 : 90);
  ctx.font = `italic 900 ${story ? 46 : 40}px Orbitron, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('CONSEGUE ME VENCER?', W / 2, footY);
  ctx.font = '700 38px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ff6a00';
  ctx.fillText(SHARE_URL, W / 2, footY + 58);

  // moldura
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.fillStyle = accent;
  ctx.fillRect(24, 24, 160, 6);
  ctx.fillRect(W - 184, H - 30, 160, 6);

  return c;
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/png'));
}
