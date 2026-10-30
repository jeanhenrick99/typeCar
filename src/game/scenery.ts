import { withAlpha } from './colors';
import type { TrackTheme } from '../types';

/**
 * Cenários específicos de cada pista: fundo (atrás da pista), detalhes do
 * asfalto, primeiro plano e clima. Tudo procedural e determinístico pela
 * posição da câmera, sem imagens externas.
 */

export interface Scene {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  skyH: number;
  trackTop: number;
  trackBottom: number;
  camX: number;
  time: number;
  scale: number;
  theme: TrackTheme;
}

export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Itera elementos repetidos de uma camada com parallax */
function layer(s: Scene, parallax: number, spacing: number, cb: (x: number, i: number) => void) {
  const off = s.camX * parallax;
  const first = Math.floor(off / spacing) - 2;
  const n = Math.ceil(s.w / spacing) + 4;
  for (let i = first; i < first + n; i++) cb(i * spacing - off, i);
}

// ───────────────────────── Sunset Coast ─────────────────────────

function drawPalm(ctx: CanvasRenderingContext2D, x: number, base: number, hgt: number, lean: number, color: string, sway: number) {
  const topX = x + lean * hgt * 0.35 + sway;
  const topY = base - hgt;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, hgt * 0.045);
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + lean * hgt * 0.05, base - hgt * 0.6, topX, topY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, hgt * 0.03);
  for (let f = 0; f < 7; f++) {
    const a = -Math.PI + (f / 6) * Math.PI + (f % 2 ? 0.15 : -0.1);
    const len = hgt * (0.38 + (f % 3) * 0.05);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.45 + len * 0.35;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY + Math.sin(a) * len * 0.5 - len * 0.12, ex, ey);
    ctx.stroke();
  }
}

function drawCoastBackdrop(s: Scene) {
  const { ctx, w, skyH, time } = s;
  const horizon = skyH * 0.62;

  // Sol retrô com faixas
  const sx = w * 0.64 - (s.camX * 0.004) % 40;
  const R = skyH * 0.42;
  const glow = ctx.createRadialGradient(sx, horizon, R * 0.5, sx, horizon, R * 2.4);
  glow.addColorStop(0, 'rgba(255,140,80,0.45)');
  glow.addColorStop(1, 'rgba(255,60,120,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, horizon);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, horizon);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(sx, horizon, R, 0, Math.PI * 2);
  for (let k = 0; k < 6; k++) {
    const by = horizon - R * 0.08 - k * R * 0.13;
    const bh = R * 0.07 * (1 - k * 0.14);
    ctx.rect(sx - R - 2, by - bh, R * 2 + 4, bh);
  }
  const sun = ctx.createLinearGradient(0, horizon - R, 0, horizon);
  sun.addColorStop(0, '#fff3a0');
  sun.addColorStop(0.45, '#ffb14a');
  sun.addColorStop(1, '#ff3d7f');
  ctx.fillStyle = sun;
  ctx.fill('evenodd');
  ctx.restore();

  // Ilhas no horizonte
  ctx.fillStyle = '#3b1446';
  layer(s, 0.03, 420, (x, i) => {
    if (hash(i * 5.1) < 0.4) return;
    const iw = 140 + hash(i) * 200;
    const ih = skyH * (0.05 + hash(i + 2) * 0.09);
    ctx.beginPath();
    ctx.moveTo(x, horizon);
    ctx.quadraticCurveTo(x + iw * 0.3, horizon - ih * 1.6, x + iw * 0.55, horizon - ih);
    ctx.quadraticCurveTo(x + iw * 0.8, horizon - ih * 0.5, x + iw, horizon);
    ctx.fill();
  });

  // Mar
  const sea = ctx.createLinearGradient(0, horizon, 0, skyH);
  sea.addColorStop(0, '#5a2068');
  sea.addColorStop(1, '#170a2c');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, w, skyH - horizon);

  // Reflexo do sol tremulando
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let y = horizon + 2; y < skyH - 4; y += 3) {
    const p = (y - horizon) / (skyH - horizon);
    const jitter = hash(y * 3.3 + Math.floor(time * 7)) - 0.5;
    const half = R * (0.85 - p * 0.45) * (0.7 + 0.3 * Math.sin(time * 2 + y * 0.4));
    ctx.fillStyle = `rgba(255,${Math.round(190 - p * 80)},110,${0.38 * (1 - p)})`;
    ctx.fillRect(sx - half + jitter * 18, y, half * 2, 1.4);
  }
  // cristas de ondas
  layer(s, 0.08, 38, (x, i) => {
    const y = horizon + 6 + hash(i * 1.7) * (skyH - horizon - 18);
    const a = 0.12 + 0.12 * Math.sin(time * 2 + i);
    ctx.fillStyle = `rgba(255,200,230,${a})`;
    ctx.fillRect(x, y, 8 + hash(i) * 18, 1);
  });
  ctx.restore();

  // Faixa de praia e palmeiras distantes
  const beach = skyH - skyH * 0.12;
  ctx.fillStyle = '#2a0f2c';
  ctx.fillRect(0, beach, w, skyH - beach);
  layer(s, 0.45, 150, (x, i) => {
    if (hash(i * 2.3) < 0.35) return;
    const hgt = skyH * (0.38 + hash(i + 7) * 0.25);
    drawPalm(ctx, x, beach + 4, hgt, hash(i) > 0.5 ? 1 : -1, '#16061b', Math.sin(time * 1.2 + i) * 2);
  });

  // Guard-rail com refletores
  const ry = skyH - 11;
  ctx.fillStyle = '#9aa3b8';
  ctx.fillRect(0, ry, w, 3);
  ctx.fillRect(0, ry + 5, w, 2);
  layer(s, 1, 70, (x, i) => {
    ctx.fillStyle = '#4b5164';
    ctx.fillRect(x, ry - 2, 3, 13);
    if (i % 2 === 0) {
      ctx.fillStyle = '#ff8a33';
      ctx.fillRect(x + 20, ry, 6, 3);
    }
  });
}

// ───────────────────────── Solar Desert ─────────────────────────

function drawSaguaro(ctx: CanvasRenderingContext2D, x: number, base: number, hgt: number, color: string) {
  const tw = hgt * 0.16;
  ctx.fillStyle = color;
  const rr = (rx: number, ry: number, rw: number, rh: number) => {
    const r = Math.min(rw, rh) / 2;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, r);
    ctx.fill();
  };
  rr(x - tw / 2, base - hgt, tw, hgt);
  // braços
  rr(x - tw * 2.1, base - hgt * 0.62, tw * 0.8, hgt * 0.32);
  rr(x - tw * 2.1, base - hgt * 0.36, tw * 1.8, tw * 0.75);
  rr(x + tw * 1.3, base - hgt * 0.78, tw * 0.8, hgt * 0.36);
  rr(x + tw * 0.2, base - hgt * 0.48, tw * 1.9, tw * 0.75);
}

function drawDesertBackdrop(s: Scene) {
  const { ctx, w, skyH, time } = s;
  const horizon = skyH * 0.74;

  // Sol a pino com halo
  const sx = w * 0.84;
  const sy = skyH * 0.22;
  const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, skyH * 0.9);
  halo.addColorStop(0, 'rgba(255,255,240,1)');
  halo.addColorStop(0.08, 'rgba(255,250,220,0.9)');
  halo.addColorStop(0.25, 'rgba(255,230,170,0.35)');
  halo.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, skyH);

  // Mesas (planaltos) de rocha vermelha
  layer(s, 0.04, 300, (x, i) => {
    if (hash(i * 3.9) < 0.3) return;
    const mw = 120 + hash(i) * 200;
    const mh = skyH * (0.16 + hash(i + 4) * 0.26);
    const top = horizon - mh;
    const slope = mw * 0.14;
    ctx.fillStyle = '#b4573a';
    ctx.beginPath();
    ctx.moveTo(x, horizon);
    ctx.lineTo(x + slope, top + mh * 0.18);
    ctx.lineTo(x + slope * 1.4, top);
    ctx.lineTo(x + mw - slope * 1.4, top);
    ctx.lineTo(x + mw - slope, top + mh * 0.22);
    ctx.lineTo(x + mw, horizon);
    ctx.closePath();
    ctx.fill();
    // estratos
    ctx.fillStyle = 'rgba(80,25,15,0.25)';
    for (let k = 1; k < 4; k++) ctx.fillRect(x + slope * 0.8, top + (mh * k) / 4, mw - slope * 1.6, mh * 0.04);
    ctx.fillStyle = '#e08a5e';
    ctx.fillRect(x + slope * 1.4, top, mw - slope * 2.8, mh * 0.06);
  });
  // névoa de calor sobre o horizonte
  const haze = ctx.createLinearGradient(0, horizon - skyH * 0.25, 0, horizon);
  haze.addColorStop(0, 'rgba(248,220,170,0)');
  haze.addColorStop(1, 'rgba(248,220,170,0.55)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - skyH * 0.25, w, skyH * 0.25);

  // Dunas em duas camadas
  const dune = (par: number, base: number, amp: number, color: string, freq: number) => {
    const off = s.camX * par;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, skyH);
    for (let x = 0; x <= w + 8; x += 8) {
      const wx = x + off;
      ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(wx * freq)) - amp * 0.4 * Math.sin(wx * freq * 2.7 + 1));
    }
    ctx.lineTo(w, skyH);
    ctx.closePath();
    ctx.fill();
  };
  dune(0.12, horizon + skyH * 0.08, skyH * 0.08, '#e7b06b', 0.006);
  dune(0.25, horizon + skyH * 0.2, skyH * 0.07, '#d49650', 0.009);

  // Cactos e pedras
  layer(s, 0.5, 130, (x, i) => {
    const hv = hash(i * 4.4);
    if (hv < 0.45) return;
    const base = skyH - 4;
    if (hv > 0.75) drawSaguaro(ctx, x, base, skyH * (0.22 + hash(i) * 0.14), '#4a6b34');
    else {
      ctx.fillStyle = '#9a6a45';
      ctx.beginPath();
      ctx.ellipse(x, base, 12 + hash(i) * 14, 6 + hash(i + 1) * 6, 0, Math.PI, 0);
      ctx.fill();
    }
  });

  // Barreira de pneus
  const ty = skyH - 9;
  layer(s, 1, 16, (x, i) => {
    ctx.fillStyle = '#16161a';
    ctx.beginPath();
    ctx.arc(x + 8, ty, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = Math.floor(i / 3) % 2 ? '#d6382c' : '#f2f2f2';
    ctx.fillRect(x + 2, ty - 1.5, 12, 3);
  });

  // Ondulação do calor
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let k = 0; k < 4; k++) {
    const y = horizon - 4 + k * 5 + Math.sin(time * 3 + k) * 2;
    ctx.fillRect(0, y, w, 1.5);
  }
}

// ───────────────────────── Arctic Ring ─────────────────────────

let auroraGrad: { key: string; g: CanvasGradient[] } | null = null;

function drawAurora(s: Scene) {
  const { ctx, w, skyH, time, theme } = s;
  const maxH = skyH * 0.5;
  const key = `${maxH}|${theme.neon}|${theme.neon2}`;
  if (!auroraGrad || auroraGrad.key !== key) {
    const mk = (a: string, b: string) => {
      const g = ctx.createLinearGradient(0, 0, 0, maxH);
      g.addColorStop(0, withAlpha(b, 0));
      g.addColorStop(0.6, withAlpha(b, 0.2));
      g.addColorStop(0.92, withAlpha(a, 0.6));
      g.addColorStop(1, withAlpha(a, 0));
      return g;
    };
    auroraGrad = { key, g: [mk(theme.neon, theme.neon2), mk(theme.neon2, theme.neon), mk(theme.neon, '#ffffff')] };
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const off = s.camX * 0.02;
  for (let b = 0; b < 3; b++) {
    ctx.fillStyle = auroraGrad.g[b];
    for (let x = 0; x < w; x += 5) {
      const wx = x + off;
      const base =
        skyH * (0.32 + b * 0.07) +
        Math.sin(wx * 0.006 + time * 0.5 + b * 2) * skyH * 0.08 +
        Math.sin(wx * 0.017 - time * 0.8 + b) * skyH * 0.03;
      const hgt = maxH * (0.55 + 0.45 * Math.sin(wx * 0.011 + time * 0.7 + b * 1.3));
      ctx.translate(x, base - maxH);
      ctx.fillRect(0, maxH - hgt, 5, hgt);
      ctx.translate(-x, -(base - maxH));
    }
  }
  ctx.restore();
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, base: number, hgt: number, color: string, snow: string) {
  const tiers = 3;
  for (let t = 0; t < tiers; t++) {
    const ty = base - hgt * 0.15 - t * hgt * 0.26;
    const tw = hgt * (0.42 - t * 0.1);
    const th = hgt * 0.42;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - tw, ty);
    ctx.lineTo(x, ty - th);
    ctx.lineTo(x + tw, ty);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = snow;
    ctx.beginPath();
    ctx.moveTo(x - tw, ty);
    ctx.lineTo(x, ty - th);
    ctx.lineTo(x - tw * 0.2, ty - th * 0.35);
    ctx.lineTo(x - tw * 0.55, ty - th * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#1b1410';
  ctx.fillRect(x - hgt * 0.03, base - hgt * 0.16, hgt * 0.06, hgt * 0.16);
}

function drawArcticBackdrop(s: Scene) {
  const { ctx, w, skyH } = s;
  drawAurora(s);

  // Montanhas com picos nevados
  const base = skyH * 0.82;
  const step = 70;
  const off = s.camX * 0.04;
  const first = Math.floor(off / step) - 1;
  const pts: [number, number][] = [];
  for (let i = first; i < first + Math.ceil(w / step) + 3; i++) {
    const peak = hash(i * 2.7);
    pts.push([i * step - off, base - skyH * (0.12 + peak * 0.42)]);
  }
  ctx.fillStyle = '#0e2038';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], skyH);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(pts[pts.length - 1][0], skyH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(225,240,255,0.85)';
  for (let k = 1; k < pts.length - 1; k++) {
    const [x, y] = pts[k];
    if (y < pts[k - 1][1] && y < pts[k + 1][1]) {
      const d = Math.min(pts[k - 1][1], pts[k + 1][1]) - y;
      const cap = Math.min(d * 0.45, skyH * 0.1);
      const lx = x + (pts[k - 1][0] - x) * (cap / (pts[k - 1][1] - y));
      const rx = x + (pts[k + 1][0] - x) * (cap / (pts[k + 1][1] - y));
      ctx.beginPath();
      ctx.moveTo(lx, y + cap);
      ctx.lineTo(x, y);
      ctx.lineTo(rx, y + cap);
      ctx.lineTo((x + rx) / 2, y + cap * 0.7);
      ctx.lineTo(x, y + cap * 1.1);
      ctx.lineTo((x + lx) / 2, y + cap * 0.75);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Campo de neve e duas linhas de pinheiros
  const field = ctx.createLinearGradient(0, base, 0, skyH);
  field.addColorStop(0, '#5d7896');
  field.addColorStop(1, '#a9c4de');
  ctx.fillStyle = field;
  ctx.fillRect(0, base, w, skyH - base);
  layer(s, 0.2, 46, (x, i) => {
    if (hash(i * 6.1) < 0.3) return;
    drawPine(ctx, x, base + skyH * 0.06, skyH * (0.16 + hash(i) * 0.1), '#122638', 'rgba(220,235,250,0.85)');
  });
  layer(s, 0.45, 90, (x, i) => {
    if (hash(i * 3.3) < 0.4) return;
    drawPine(ctx, x, skyH - 6, skyH * (0.3 + hash(i + 1) * 0.16), '#0b1a28', 'rgba(240,248,255,0.95)');
  });

  // Barreira de neve com balizas iluminadas
  ctx.fillStyle = '#e8f3ff';
  layer(s, 1, 34, (x, i) => {
    ctx.beginPath();
    ctx.ellipse(x + 17, skyH - 3, 22, 8 + hash(i) * 4, 0, Math.PI, 0);
    ctx.fill();
  });
  layer(s, 1, 210, (x) => {
    ctx.fillStyle = '#2d7dff';
    ctx.fillRect(x, skyH - 26, 3, 24);
    const g = ctx.createRadialGradient(x + 1.5, skyH - 27, 0, x + 1.5, skyH - 27, 16);
    g.addColorStop(0, 'rgba(120,200,255,0.9)');
    g.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 15, skyH - 43, 32, 32);
  });
}

// ───────────────────────── API ─────────────────────────

/** Fundo atrás da pista para cenários que não são a cidade */
export function drawBackdrop(s: Scene) {
  switch (s.theme.scenery) {
    case 'coast':
      return drawCoastBackdrop(s);
    case 'desert':
      return drawDesertBackdrop(s);
    case 'arctic':
      return drawArcticBackdrop(s);
  }
}

/** Detalhes pintados sobre o asfalto */
export function drawTrackDetails(s: Scene) {
  const { ctx, trackTop, trackBottom, theme, time } = s;
  const th = trackBottom - trackTop;
  ctx.save();
  switch (theme.scenery) {
    case 'city': {
      // asfalto molhado refletindo o neon
      ctx.globalCompositeOperation = 'lighter';
      layer(s, 1, 190, (x, i) => {
        const c = i % 2 ? theme.neon : theme.neon2;
        const g = ctx.createLinearGradient(0, trackTop, 0, trackBottom);
        g.addColorStop(0, withAlpha(c, 0.12));
        g.addColorStop(1, withAlpha(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x + hash(i) * 60, trackTop, 10 + hash(i + 3) * 26, th);
      });
      // poças
      layer(s, 1, 260, (x, i) => {
        if (hash(i * 7.7) < 0.5) return;
        ctx.fillStyle = 'rgba(140,170,255,0.06)';
        ctx.beginPath();
        ctx.ellipse(x, trackTop + hash(i) * th, 40 + hash(i + 2) * 50, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'coast': {
      // faixa central amarela dupla e areia trazida pelo vento
      ctx.fillStyle = 'rgba(255,211,107,0.55)';
      ctx.fillRect(0, (trackTop + trackBottom) / 2 - 4, s.w, 2);
      ctx.fillRect(0, (trackTop + trackBottom) / 2 + 2, s.w, 2);
      ctx.fillStyle = 'rgba(255,190,140,0.07)';
      ctx.fillRect(0, trackTop, s.w, th * 0.12);
      break;
    }
    case 'desert': {
      // areia acumulada nas bordas e marcas de pneu
      const g = ctx.createLinearGradient(0, trackTop, 0, trackTop + th * 0.2);
      g.addColorStop(0, 'rgba(214,160,90,0.45)');
      g.addColorStop(1, 'rgba(214,160,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, trackTop, s.w, th * 0.2);
      const g2 = ctx.createLinearGradient(0, trackBottom, 0, trackBottom - th * 0.15);
      g2.addColorStop(0, 'rgba(214,160,90,0.4)');
      g2.addColorStop(1, 'rgba(214,160,90,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, trackBottom - th * 0.15, s.w, th * 0.15);
      layer(s, 1, 140, (x, i) => {
        ctx.fillStyle = 'rgba(214,170,110,0.12)';
        ctx.beginPath();
        ctx.ellipse(x, trackTop + hash(i) * th, 30 + hash(i + 1) * 40, 3 + hash(i + 2) * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'arctic': {
      // placas de gelo com brilho
      layer(s, 1, 170, (x, i) => {
        if (hash(i * 2.2) < 0.3) return;
        const y = trackTop + hash(i) * th;
        const rw = 50 + hash(i + 1) * 90;
        const g = ctx.createLinearGradient(x - rw, 0, x + rw, 0);
        g.addColorStop(0, 'rgba(190,230,255,0)');
        g.addColorStop(0.5, 'rgba(190,230,255,0.16)');
        g.addColorStop(1, 'rgba(190,230,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x, y, rw, 4 + hash(i + 2) * 6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // reflexo da aurora no gelo
      ctx.globalCompositeOperation = 'lighter';
      const a = 0.05 + 0.03 * Math.sin(time * 0.7);
      const g = ctx.createLinearGradient(0, trackTop, 0, trackTop + th * 0.5);
      g.addColorStop(0, withAlpha(theme.neon, a));
      g.addColorStop(1, withAlpha(theme.neon, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, trackTop, s.w, th * 0.5);
      break;
    }
  }
  ctx.restore();
}

/** Objetos no primeiro plano (abaixo da pista). Retorna false para usar o padrão da cidade. */
export function drawForegroundProps(s: Scene): boolean {
  const { ctx, h, trackBottom, time } = s;
  const top = trackBottom + 10;
  const band = h - top;
  switch (s.theme.scenery) {
    case 'coast':
      layer(s, 1.35, 120, (x, i) => {
        const hv = hash(i * 9.1);
        if (hv < 0.35) return;
        if (hv > 0.8) {
          // prancha fincada na areia
          ctx.save();
          ctx.translate(x, h - 2);
          ctx.rotate(-0.15);
          ctx.fillStyle = i % 2 ? '#ff8a33' : '#2bd6ff';
          ctx.beginPath();
          ctx.ellipse(0, -band * 0.45, 5, band * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = '#1e0c22';
          ctx.beginPath();
          ctx.ellipse(x, h, 18 + hv * 20, band * (0.25 + hv * 0.3), 0, Math.PI, 0);
          ctx.fill();
        }
      });
      return true;
    case 'desert':
      layer(s, 1.35, 110, (x, i) => {
        const hv = hash(i * 5.5);
        if (hv < 0.4) return;
        if (hv > 0.82) drawSaguaro(ctx, x, h + 2, band * 1.1, '#3d5a2b');
        else {
          ctx.fillStyle = '#8a5a35';
          ctx.beginPath();
          ctx.ellipse(x, h, 14 + hv * 22, band * 0.4, 0, Math.PI, 0);
          ctx.fill();
        }
      });
      // bola de feno rolando
      {
        const period = 9;
        const t = (time % period) / period;
        const tx = s.w * (1.1 - t * 1.3);
        const ty = top + band * 0.5 - Math.abs(Math.sin(t * 30)) * band * 0.3;
        const r = band * 0.22;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(-time * 6);
        ctx.strokeStyle = 'rgba(150,110,60,0.85)';
        ctx.lineWidth = 1.2;
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, r, r * 0.6, (k * Math.PI) / 5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      return true;
    case 'arctic':
      ctx.fillStyle = '#f2f8ff';
      layer(s, 1.35, 60, (x, i) => {
        ctx.beginPath();
        ctx.ellipse(x, h, 30 + hash(i) * 20, band * (0.3 + hash(i + 1) * 0.3), 0, Math.PI, 0);
        ctx.fill();
      });
      layer(s, 1.35, 180, (x, i) => {
        if (hash(i * 4.1) < 0.5) return;
        drawPine(ctx, x + 40, h + band * 0.3, band * 1.6, '#0b1a28', 'rgba(240,248,255,0.95)');
      });
      return true;
    default:
      return false;
  }
}

/** Cor das partículas que os pneus levantam (poeira, neve, spray) */
export function kickupColor(theme: TrackTheme): string | null {
  switch (theme.scenery) {
    case 'desert':
      return 'rgba(214,170,110,';
    case 'arctic':
      return 'rgba(235,245,255,';
    case 'city':
      return 'rgba(170,190,230,';
    default:
      return null;
  }
}

// ───────────────────────── Clima ─────────────────────────

interface Drop {
  x: number;
  y: number;
  z: number; // profundidade 0.3..1
  r: number;
}

/** Partículas de clima em coordenadas de tela */
export class Weather {
  private drops: Drop[] = [];
  private kind: TrackTheme['weather'];

  constructor(kind: TrackTheme['weather']) {
    this.kind = kind;
    const n = kind === 'rain' ? 140 : kind === 'snow' ? 160 : kind === 'dust' ? 70 : 0;
    for (let i = 0; i < n; i++) this.drops.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, r: Math.random() });
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, camDx: number, time: number) {
    if (this.kind === 'none') return;
    ctx.save();
    for (const d of this.drops) {
      // movimento em pixels convertido para fração da tela
      let vx = 0;
      let vy = 0;
      if (this.kind === 'rain') {
        vx = -160;
        vy = 900;
      } else if (this.kind === 'snow') {
        vx = -25 + Math.sin(time * 1.3 + d.r * 10) * 30;
        vy = 40 + d.r * 50;
      } else {
        vx = -260 - d.r * 200;
        vy = Math.sin(time * 2 + d.r * 20) * 20;
      }
      d.x += ((vx * d.z) * dt - camDx * d.z) / w;
      d.y += (vy * d.z * dt) / h;
      if (d.x < -0.05) d.x += 1.1;
      if (d.x > 1.05) d.x -= 1.1;
      if (d.y > 1.02) {
        d.y -= 1.04;
        d.x = Math.random();
      }
      if (d.y < -0.02) d.y += 1.04;

      const x = d.x * w;
      const y = d.y * h;
      if (this.kind === 'rain') {
        ctx.strokeStyle = `rgba(170,200,255,${0.15 + d.z * 0.25})`;
        ctx.lineWidth = d.z;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3 * d.z, y + 16 * d.z);
        ctx.stroke();
      } else if (this.kind === 'snow') {
        ctx.fillStyle = `rgba(255,255,255,${0.4 + d.z * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + d.z * 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(230,190,130,${0.15 + d.z * 0.3})`;
        ctx.fillRect(x, y, 2 + d.z * 6, 1 + d.z);
      }
    }
    ctx.restore();
  }
}
