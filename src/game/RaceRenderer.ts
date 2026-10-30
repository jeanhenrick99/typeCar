import type { RaceController, Racer } from './RaceController';
import { withAlpha } from './colors';
import { CAR_ART, drawCarArt, getCarArt, groundRatio } from './carArt';
import { getCarModel } from '../data/cars';
import { drawBackdrop, drawForegroundProps, drawTrackDetails, kickupColor, Weather, type Scene } from './scenery';
import type { TrackTheme } from '../types';

interface Particle {
  x: number; // mundo
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

interface Layout {
  w: number;
  h: number;
  skyH: number;
  trackTop: number;
  trackBottom: number;
  laneH: number;
  scale: number;
  pxPerChar: number;
  trackLen: number;
  startX: number;
  carLen: number;
}

const LANES = 4;
/** Escala de profundidade de cada faixa: as do fundo ficam menores */
const LANE_DEPTH = [0.82, 0.94, 1.06, 1.18];


/** Hash determinístico simples para gerar cenário procedural estável */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Renderizador Canvas 2D da corrida. Câmera lateral acompanha o jogador;
 * cenário em camadas com parallax. Não guarda estado de jogo — apenas lê
 * o RaceController a cada quadro.
 */
export class RaceRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private race: RaceController;
  private theme: TrackTheme;
  private dpr = 1;
  private layout!: Layout;
  private camX = 0;
  private time = 0;
  private particles: Particle[] = [];
  private noise: CanvasPattern | null = null;
  private stars: { x: number; y: number; r: number; tw: number }[] = [];
  private shake = 0;
  private wheelAngle = new Map<string, number>();
  private weather: Weather;

  constructor(canvas: HTMLCanvasElement, race: RaceController, theme: TrackTheme) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.race = race;
    this.theme = theme;
    this.weather = new Weather(theme.weather);
    for (let i = 0; i < 70; i++) {
      this.stars.push({ x: hash(i * 3.1), y: hash(i * 7.7), r: 0.4 + hash(i * 1.3) * 1.2, tw: hash(i * 9.2) * 6 });
    }
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    const w = rect.width;
    const h = rect.height;
    const skyH = Math.round(h * 0.3);
    const trackTop = skyH + 12;
    const trackBottom = Math.round(h * 0.9);
    const laneH = (trackBottom - trackTop) / LANES;
    const carLen = Math.max(60, laneH * 2.1);
    const scale = carLen / 92;
    const pxPerChar = carLen / 2;
    const startX = 0;
    this.layout = {
      w,
      h,
      skyH,
      trackTop,
      trackBottom,
      laneH,
      scale,
      pxPerChar,
      trackLen: this.race.typing.totalChars * pxPerChar,
      startX,
      carLen,
    };
    this.noise = this.buildNoise();
    this.camX = this.carWorldX(this.race.player) - w * 0.3;
  }

  /** Dispara efeito de largada */
  burst() {
    for (const r of this.race.racers) {
      const x = this.carWorldX(r) - this.layout.carLen * 0.5;
      const y = this.laneY(r.lane);
      for (let i = 0; i < 14; i++) this.spawn(x, y + (Math.random() - 0.5) * this.layout.laneH * 0.4, 'rgba(220,225,235,', 1.4, 2.4);
    }
    this.shake = 6;
  }

  bump(amount = 2) {
    this.shake = Math.max(this.shake, amount);
  }

  private buildNoise(): CanvasPattern | null {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = this.theme.asphalt;
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      const v = Math.random();
      x.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.18)';
      x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5);
    }
    return this.ctx.createPattern(c, 'repeat');
  }

  /** Topo da faixa: faixas mais próximas da câmera são mais altas */
  private laneTop(lane: number) {
    const L = this.layout;
    let y = L.trackTop;
    for (let i = 0; i < lane; i++) y += L.laneH * LANE_DEPTH[i];
    return y;
  }

  private laneY(lane: number) {
    return this.laneTop(lane) + this.layout.laneH * LANE_DEPTH[lane] * 0.55;
  }

  /** Linha onde os pneus tocam o asfalto */
  private laneGround(lane: number) {
    return this.laneTop(lane) + this.layout.laneH * LANE_DEPTH[lane] * 0.82;
  }



  /** Centro do carro em coordenadas de mundo */
  private carWorldX(r: Racer) {
    const L = this.layout;
    return L.startX - L.carLen * 0.55 + r.visualProgress * L.trackLen;
  }

  private spawn(x: number, y: number, color: string, life: number, size: number) {
    if (this.particles.length > 160) return;
    this.particles.push({
      x,
      y,
      vx: -20 - Math.random() * 60,
      vy: (Math.random() - 0.5) * 30,
      life,
      max: life,
      size: size * this.layout.scale * (0.6 + Math.random()),
      color,
    });
  }

  private scene(): Scene {
    const L = this.layout;
    return {
      ctx: this.ctx,
      w: L.w,
      h: L.h,
      skyH: L.skyH,
      trackTop: L.trackTop,
      trackBottom: L.trackBottom,
      camX: this.camX,
      time: this.time,
      scale: L.scale,
      theme: this.theme,
    };
  }

  render(dtMs: number) {
    const dt = Math.min(dtMs, 100) / 1000;
    this.time += dt;
    const ctx = this.ctx;
    const L = this.layout;
    const race = this.race;
    const player = race.player;

    // Câmera
    const targetCam = this.carWorldX(player) - L.w * 0.3;
    const prevCam = this.camX;
    this.camX += (targetCam - this.camX) * Math.min(1, dt * 6);
    const camDx = this.camX - prevCam;
    this.shake *= 1 - Math.min(1, dt * 8);
    const speedK = Math.min(1, player.speed / 300);
    const vib = (this.shake + speedK * 0.8) * (Math.random() - 0.5);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.save();
    ctx.translate(0, vib);

    this.drawSky();
    if (this.theme.scenery === 'city') {
      this.drawSkyline();
      this.drawGrandstand();
    } else {
      drawBackdrop(this.scene());
    }
    this.drawTrack();
    drawTrackDetails(this.scene());
    this.drawStartFinish();
    this.drawStartLights();
    this.drawSpeedLines(speedK);

    // Partículas atrás dos carros
    this.updateParticles(dt);

    // Carros (do topo para baixo, para sobreposição correta)
    const sorted = [...race.racers].sort((a, b) => a.lane - b.lane);
    for (const r of sorted) this.drawRacer(r, dt);

    this.drawForeground();
    ctx.restore();

    this.weather.draw(ctx, L.w, L.h, dt, camDx, this.time);

    this.drawIndicators();
    this.drawVignette(speedK);
  }

  private drawSky() {
    const { ctx, layout: L, theme } = this;
    const g = ctx.createLinearGradient(0, 0, 0, L.skyH);
    g.addColorStop(0, theme.sky[0]);
    g.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L.w, L.skyH + 2);

    if (theme.stars) {
      for (const s of this.stars) {
        const a = 0.35 + 0.35 * Math.sin(this.time * 1.5 + s.tw);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(s.x * L.w, s.y * L.skyH * 0.55, s.r, s.r);
      }
    }
  }

  private drawSkyline() {
    const { ctx, layout: L, theme } = this;
    const par = 0.12;
    const offset = this.camX * par;
    const bw = 46;
    const first = Math.floor(offset / bw) - 1;
    const count = Math.ceil(L.w / bw) + 3;
    const base = L.skyH;
    for (let i = first; i < first + count; i++) {
      const x = i * bw - offset;
      const hgt = (0.25 + hash(i) * 0.55) * L.skyH;
      const wdt = bw * (0.6 + hash(i + 50) * 0.5);
      ctx.fillStyle = theme.night ? '#0b0d1c' : 'rgba(40,14,40,0.9)';
      ctx.fillRect(x, base - hgt, wdt, hgt);
      // janelas
      if (theme.night) {
        ctx.fillStyle = withAlpha(hash(i + 9) > 0.5 ? theme.neon : theme.neon2, 0.5);
        for (let wy = base - hgt + 6; wy < base - 6; wy += 7) {
          for (let wx = x + 4; wx < x + wdt - 4; wx += 6) {
            if (hash(wx * 0.37 + wy * 1.7 + i) > 0.72) ctx.fillRect(wx, wy, 2, 3);
          }
        }
        // topo neon
        if (hash(i + 3) > 0.7) {
          ctx.fillStyle = withAlpha(theme.neon2, 0.9);
          ctx.fillRect(x, base - hgt, wdt, 2);
        }
      }
    }
    // névoa no horizonte
    const fog = ctx.createLinearGradient(0, base - L.skyH * 0.4, 0, base);
    fog.addColorStop(0, 'rgba(0,0,0,0)');
    fog.addColorStop(1, withAlpha(theme.neon, theme.night ? 0.18 : 0.25));
    ctx.fillStyle = fog;
    ctx.fillRect(0, base - L.skyH * 0.4, L.w, L.skyH * 0.4);
  }

  private drawGrandstand() {
    const { ctx, layout: L, theme } = this;
    const par = 0.55;
    const offset = this.camX * par;
    const top = L.skyH - L.skyH * 0.32;
    const hgt = L.skyH * 0.32;
    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(0, top, L.w, hgt + 12);

    // torcida
    const cell = 6;
    const first = Math.floor(offset / cell);
    const cols = Math.ceil(L.w / cell) + 2;
    const rows = Math.floor(hgt / cell) - 1;
    const colors = [theme.neon, theme.neon2, '#ffffff', '#ff6a00', '#ffd000'];
    for (let c = first; c < first + cols; c++) {
      const x = c * cell - offset;
      const seg = Math.floor(c / 40);
      if (hash(seg * 13.3) > 0.82) continue; // vãos entre setores
      for (let r = 0; r < rows; r++) {
        const hv = hash(c * 3.7 + r * 11.1);
        if (hv < 0.35) continue;
        const jump = Math.sin(this.time * 8 + hv * 20) > 0.85 ? -1.5 : 0;
        ctx.fillStyle = withAlpha(colors[Math.floor(hv * colors.length * 7) % colors.length], 0.25 + hv * 0.35);
        ctx.fillRect(x, top + 4 + r * cell + jump, 3, 3);
      }
    }

    // postes de luz
    const poleGap = 320;
    const pf = Math.floor(offset / poleGap) - 1;
    for (let i = pf; i < pf + Math.ceil(L.w / poleGap) + 3; i++) {
      const x = i * poleGap - offset + 80;
      ctx.fillStyle = '#1c2133';
      ctx.fillRect(x - 1.5, top - L.skyH * 0.35, 3, L.skyH * 0.35 + hgt);
      const gy = top - L.skyH * 0.35;
      const glow = ctx.createRadialGradient(x, gy, 0, x, gy, 40);
      glow.addColorStop(0, 'rgba(255,255,255,0.9)');
      glow.addColorStop(0.2, withAlpha(theme.neon, 0.35));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 40, gy - 40, 80, 80);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 7, gy - 2, 14, 4);
    }

    this.drawAdBoards();

    // muro neon
    ctx.fillStyle = withAlpha(theme.neon, 0.85);
    ctx.fillRect(0, L.skyH - 2, L.w, 2);
  }

  /** Painéis de LED publicitários presos ao muro da pista */
  private drawAdBoards() {
    const { ctx, layout: L, theme } = this;
    const bh = Math.max(14, Math.round(L.skyH * 0.13));
    const y = L.skyH - bh - 2;
    const bw = 220;
    const gap = 26;
    const period = bw + gap;
    const msgs = ['TYPECAR', 'NEON GP', 'TURBO KEYS', 'WPM RACING', 'FULL THROTTLE', 'NITRO'];
    const first = Math.floor(this.camX / period) - 1;
    ctx.font = `800 ${Math.round(bh * 0.62)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = first; i < first + Math.ceil(L.w / period) + 2; i++) {
      const x = i * period - this.camX;
      const idx = ((i % msgs.length) + msgs.length) % msgs.length;
      const accent = i % 2 === 0 ? theme.neon : theme.neon2;
      ctx.fillStyle = '#05060c';
      ctx.fillRect(x, y, bw, bh);
      // brilho de LED
      const g = ctx.createLinearGradient(x, y, x, y + bh);
      g.addColorStop(0, withAlpha(accent, 0.28));
      g.addColorStop(1, withAlpha(accent, 0.06));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, bw, bh);
      // texto pisca suavemente em sequência
      const pulse = 0.75 + 0.25 * Math.sin(this.time * 3 + i);
      ctx.fillStyle = withAlpha(i % 3 === 0 ? '#ffffff' : accent, pulse);
      ctx.fillText(msgs[idx], x + bw / 2, y + bh / 2 + 1);
      // grade de pixels
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let py = y + 2; py < y + bh; py += 3) ctx.fillRect(x, py, bw, 1);
      ctx.fillStyle = withAlpha(accent, 0.9);
      ctx.fillRect(x, y, bw, 1);
    }
  }

  private drawCurb(y: number, h: number) {
    const { ctx, layout: L, theme } = this;
    const seg = 26 * L.scale + 10;
    const first = Math.floor(this.camX / seg);
    for (let i = first; i < first + Math.ceil(L.w / seg) + 2; i++) {
      ctx.fillStyle = i % 2 === 0 ? theme.curbA : theme.curbB;
      ctx.fillRect(i * seg - this.camX, y, seg + 0.5, h);
    }
  }

  private drawTrack() {
    const { ctx, layout: L, theme } = this;
    // zebras
    this.drawCurb(L.skyH, L.trackTop - L.skyH);
    this.drawCurb(L.trackBottom, 10);

    // asfalto
    ctx.save();
    ctx.translate(-(((this.camX % 128) + 128) % 128), 0);
    ctx.fillStyle = this.noise ?? theme.asphalt;
    ctx.fillRect(0, L.trackTop, L.w + 256, L.trackBottom - L.trackTop);
    ctx.restore();

    // marcas de pneu escuras no meio das faixas
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let lane = 0; lane < LANES; lane++) {
      const y = this.laneGround(lane);
      ctx.fillRect(0, y - 2, L.w, L.laneH * 0.07);
    }

    // divisórias de faixa tracejadas
    const dash = 60 * L.scale + 20;
    const gap = dash * 0.9;
    const period = dash + gap;
    ctx.fillStyle = withAlpha('#ffffff', 0.55);
    for (let lane = 1; lane < LANES; lane++) {
      const y = this.laneTop(lane) - 1.5;
      const first = Math.floor(this.camX / period);
      for (let i = first; i < first + Math.ceil(L.w / period) + 2; i++) {
        ctx.fillRect(i * period - this.camX, y, dash, 3);
      }
    }
    // linhas de borda
    ctx.fillStyle = theme.asphaltLine;
    ctx.fillRect(0, L.trackTop + 3, L.w, 2.5);
    ctx.fillRect(0, L.trackBottom - 5.5, L.w, 2.5);
  }

  private checker(x: number, top: number, bottom: number, cols: number, size: number) {
    const ctx = this.ctx;
    const rows = Math.ceil((bottom - top) / size);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#0a0a0a';
        ctx.fillRect(x + c * size, top + r * size, size, Math.min(size, bottom - (top + r * size)));
      }
    }
  }

  private drawStartFinish() {
    const { ctx, layout: L, theme } = this;
    const size = Math.max(6, L.laneH / 8);

    // Largada
    const sx = L.startX - this.camX;
    if (sx > -300 && sx < L.w + 300) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(sx, L.trackTop, 4, L.trackBottom - L.trackTop);
      // grid de largada
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      for (let lane = 0; lane < LANES; lane++) {
        const y = this.laneY(lane);
        ctx.beginPath();
        ctx.moveTo(sx - L.carLen * 1.2, y - L.laneH * 0.4);
        ctx.lineTo(sx - 8, y - L.laneH * 0.4);
        ctx.moveTo(sx - L.carLen * 1.2, y + L.laneH * 0.4);
        ctx.lineTo(sx - 8, y + L.laneH * 0.4);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = `700 ${Math.round(L.laneH * 0.28)}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(lane + 1), sx - L.carLen * 1.45, y);
      }
      ctx.save();
      ctx.translate(sx + 40 * L.scale + 20, (L.trackTop + L.trackBottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.font = `900 ${Math.round(L.laneH * 0.55)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('START', 0, 0);
      ctx.restore();
    }

    // Chegada
    const fx = L.startX + L.trackLen - this.camX;
    if (fx > -300 && fx < L.w + 400) {
      const glow = ctx.createLinearGradient(fx - 120, 0, fx + 30, 0);
      glow.addColorStop(0, 'rgba(0,0,0,0)');
      glow.addColorStop(1, withAlpha(theme.neon, 0.25));
      ctx.fillStyle = glow;
      ctx.fillRect(fx - 120, L.trackTop, 150, L.trackBottom - L.trackTop);
      this.checker(fx, L.trackTop, L.trackBottom, 3, size);

      ctx.save();
      ctx.translate(fx - 50 * L.scale - 14, (L.trackTop + L.trackBottom) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = withAlpha('#ffffff', 0.18);
      ctx.font = `900 ${Math.round(L.laneH * 0.6)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', 0, 0);
      ctx.restore();

      // pórtico
      ctx.fillStyle = '#10131f';
      ctx.fillRect(fx + size * 3 + 10, L.skyH - L.skyH * 0.6, 8, L.skyH * 0.6 + (L.trackBottom - L.skyH) + 14);
      ctx.fillStyle = withAlpha(theme.neon, 0.9);
      ctx.fillRect(fx + size * 3 + 10, L.skyH - L.skyH * 0.6, 8, 3);
      ctx.save();
      ctx.translate(fx + size * 3 + 14, L.skyH - L.skyH * 0.6);
      ctx.fillStyle = '#0d1120';
      const bw = 130;
      ctx.fillRect(-bw / 2, -26, bw, 24);
      ctx.strokeStyle = theme.neon;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-bw / 2, -26, bw, 24);
      ctx.fillStyle = '#fff';
      ctx.font = '800 13px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CHEGADA', 0, -14);
      ctx.restore();
    }
  }

  private drawStartLights() {
    const { ctx, layout: L } = this;
    const race = this.race;
    const sx = L.startX - this.camX + 24;
    if (sx < -100 || sx > L.w + 100) return;
    const y = L.skyH * 0.28;
    // pórtico
    ctx.fillStyle = '#10131f';
    ctx.fillRect(sx - 3, y, 6, L.skyH - y);
    const lights = 3;
    const r = Math.max(5, L.skyH * 0.07);
    const pw = lights * r * 2.6 + 10;
    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(sx - pw / 2, y - r * 1.6, pw, r * 3.2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeRect(sx - pw / 2, y - r * 1.6, pw, r * 3.2);

    const phase = race.phase;
    const lit = phase === 'countdown' ? 3 - race.countdown + 1 : 0;
    const green = phase !== 'countdown' && race.elapsedMs < 2500;
    for (let i = 0; i < lights; i++) {
      const cx = sx - pw / 2 + 5 + r * 1.3 + i * r * 2.6;
      let color = '#2a0a0e';
      let glowColor: string | null = null;
      if (green) {
        color = '#3dff6e';
        glowColor = 'rgba(61,255,110,';
      } else if (phase === 'countdown' && i < lit) {
        color = '#ff1f3d';
        glowColor = 'rgba(255,31,61,';
      }
      if (glowColor) {
        const g = ctx.createRadialGradient(cx, y, 0, cx, y, r * 4);
        g.addColorStop(0, glowColor + '0.8)');
        g.addColorStop(1, glowColor + '0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r * 4, y - r * 4, r * 8, r * 8);
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSpeedLines(k: number) {
    if (k < 0.15) return;
    const { ctx, layout: L } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = Math.floor(14 * k);
    for (let i = 0; i < n; i++) {
      const seed = Math.floor(this.time * 18) + i * 31;
      const y = L.trackTop + hash(seed) * (L.trackBottom - L.trackTop);
      const len = 60 + hash(seed + 1) * 220 * k;
      const x = hash(seed + 2) * L.w;
      const g = ctx.createLinearGradient(x, 0, x + len, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, `rgba(200,240,255,${0.1 + 0.15 * k})`);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, len, 1.2);
    }
    ctx.restore();
  }

  private drawRacer(r: Racer, dt: number) {
    const { ctx, layout: L, theme } = this;
    const k = LANE_DEPTH[r.lane];
    // a imagem inclui a asa traseira, por isso é um pouco maior que o carro
    const len = L.carLen * k * 1.1;
    const meta = CAR_ART[r.car];
    const carH = len * (meta.h / meta.w);
    const wx = this.carWorldX(r);
    const x = wx - this.camX;
    if (x < -len * 2 || x > L.w + len * 2) return;

    const speedK = Math.min(1, r.speed / 300);
    const bounce = Math.sin(this.time * 28 + r.lane * 1.7) * speedK * 0.8;
    const ground = this.laneGround(r.lane);
    const left = x - len / 2;
    const top = ground - carH * groundRatio(r.car) + bounce;
    const nitro = r.isPlayer && this.race.typing.streak >= 5 && r.speed > 60 && this.race.phase === 'racing';
    const exhaustY = top + carH * 0.72;

    // partículas de escapamento
    if (this.race.phase === 'racing' && r.speed > 40 && Math.random() < dt * (10 + speedK * 30)) {
      this.spawn(wx - len / 2, exhaustY + (Math.random() - 0.5) * 4, nitro ? 'rgba(0,212,255,' : 'rgba(180,190,210,', 0.6, 2.2);
    }

    // poeira, neve ou spray levantados pelos pneus
    const kick = kickupColor(theme);
    if (kick && this.race.phase === 'racing' && r.speed > 50 && Math.random() < dt * (6 + speedK * 40)) {
      this.spawn(wx - len * 0.3, ground - 2 - Math.random() * len * 0.05, kick, 0.9, theme.scenery === 'city' ? 2 : 4);
    }

    // sombra no asfalto
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, ground, len * 0.52, Math.max(3, len * 0.045), 0, 0, Math.PI * 2);
    ctx.fill();

    // brilho sob o carro do jogador
    if (r.isPlayer) {
      ctx.save();
      ctx.translate(x, ground);
      ctx.scale(1, 0.18);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, len * 0.7);
      g.addColorStop(0, withAlpha(r.color, 0.5));
      g.addColorStop(1, withAlpha(r.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-len, -len, len * 2, len * 2);
      ctx.restore();
    }

    // faróis: feixe à frente, descendo até o asfalto
    if (theme.night) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fx = x + len / 2 - len * 0.03;
      const fy = top + carH * 0.5;
      const beamLen = len * 1.4;
      const g = ctx.createLinearGradient(fx, 0, fx + beamLen, 0);
      g.addColorStop(0, 'rgba(210,240,255,0.35)');
      g.addColorStop(1, 'rgba(210,240,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fx, fy - len * 0.008);
      ctx.lineTo(fx + beamLen, fy - len * 0.05);
      ctx.lineTo(fx + beamLen, ground + len * 0.03);
      ctx.lineTo(fx, fy + len * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // chama de nitro / escapamento
    if (nitro || (r.isPlayer && speedK > 0.75 && this.race.phase === 'racing')) {
      const fl = len * (0.18 + 0.14 * Math.random()) * (nitro ? 1.5 : 0.8);
      const bx = x - len / 2 + 2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(bx, 0, bx - fl, 0);
      g.addColorStop(0, nitro ? 'rgba(160,240,255,0.95)' : 'rgba(255,200,120,0.9)');
      g.addColorStop(0.4, nitro ? 'rgba(0,150,255,0.6)' : 'rgba(255,90,0,0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      const fh = Math.max(3, carH * 0.08);
      ctx.beginPath();
      ctx.moveTo(bx, exhaustY - fh / 2);
      ctx.lineTo(bx - fl, exhaustY);
      ctx.lineTo(bx, exhaustY + fh / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // carroceria com rodas girando conforme a velocidade
    const paint = r.color.toLowerCase() === getCarModel(r.car).signature.toLowerCase() ? null : r.color;
    const art = getCarArt(r.car, paint);
    const radiusPx = Math.max(4, meta.wheels[0][5] * (len / meta.w));
    const angle = ((this.wheelAngle.get(r.id) ?? 0) + (r.speed * 0.9 * dt) / radiusPx) % (Math.PI * 2);
    this.wheelAngle.set(r.id, angle);
    if (art) drawCarArt(ctx, art, r.car, left, top, len, angle, Math.min(1, r.speed / 120));

    // brilho das lanternas
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tx = x - len / 2;
    const ty = top + carH * 0.42;
    const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, len * 0.22);
    tg.addColorStop(0, 'rgba(255,30,50,0.5)');
    tg.addColorStop(1, 'rgba(255,30,50,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(tx - len * 0.22, ty - len * 0.22, len * 0.44, len * 0.44);
    ctx.restore();

    // etiqueta
    const tagY = top - Math.max(8, len * 0.05);
    ctx.font = `700 ${Math.max(10, Math.round(len * 0.1))}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = r.isPlayer ? 'VOCÊ' : r.name;
    const tw = ctx.measureText(label).width + 12;
    const th = Math.max(16, len * 0.13);
    ctx.fillStyle = r.isPlayer ? 'rgba(0,212,255,0.9)' : 'rgba(8,10,18,0.75)';
    ctx.fillRect(x - tw / 2, tagY - th / 2, tw, th);
    if (!r.isPlayer) {
      ctx.fillStyle = r.color;
      ctx.fillRect(x - tw / 2, tagY - th / 2, 2, th);
    }
    ctx.fillStyle = r.isPlayer ? '#00131a' : '#fff';
    ctx.fillText(label, x, tagY + 0.5);
  }

  private updateParticles(dt: number) {
    const ctx = this.ctx;
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += dt * 6;
      const a = (p.life / p.max) * 0.5;
      ctx.fillStyle = p.color + a + ')';
      ctx.beginPath();
      ctx.arc(p.x - this.camX, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      next.push(p);
    }
    this.particles = next;
  }

  private drawForeground() {
    const { ctx, layout: L, theme } = this;
    const top = L.trackBottom + 10;
    const g = ctx.createLinearGradient(0, top, 0, L.h);
    g.addColorStop(0, theme.grass);
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, L.w, L.h - top + 10);

    // objetos do cenário; na cidade, barreira com luzes (parallax > 1 para profundidade)
    if (!drawForegroundProps(this.scene())) {
      const par = 1.35;
      const off = this.camX * par;
      const gap = 140;
      const first = Math.floor(off / gap) - 1;
      for (let i = first; i < first + Math.ceil(L.w / gap) + 3; i++) {
        const x = i * gap - off;
        const y = L.h - 8;
        ctx.fillStyle = '#151a28';
        ctx.fillRect(x, y - 6, gap - 20, 14);
        ctx.fillStyle = withAlpha(i % 2 ? theme.neon : theme.neon2, 0.85);
        ctx.fillRect(x, y - 6, gap - 20, 2);
      }
    }

    // re-desenha marcadores de distância por cima do chão
    const meters = Math.round((this.race.typing.totalChars * 8) / 100) * 100;
    for (let m = 200; m < meters; m += 200) {
      const sx = L.startX + (m / meters) * L.trackLen - this.camX;
      if (sx < -120 || sx > L.w + 120) continue;
      const by = top + (L.h - top) * 0.45;
      const bw = 44 * L.scale + 26;
      const bh = 12 * L.scale + 10;
      ctx.fillStyle = '#0d1120';
      ctx.fillRect(sx - bw / 2, by - bh / 2, bw, bh);
      ctx.strokeStyle = withAlpha(theme.neon, 0.8);
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - bw / 2, by - bh / 2, bw, bh);
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${Math.round(7 * L.scale + 6)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${meters - m} M`, sx, by + 0.5);
    }
  }

  private drawIndicators() {
    const { ctx, layout: L } = this;
    for (const r of this.race.racers) {
      if (r.isPlayer) continue;
      const x = this.carWorldX(r) - this.camX;
      const y = this.laneY(r.lane);
      const len = L.carLen;
      let side: 'left' | 'right' | null = null;
      if (x > L.w + len * 0.4) side = 'right';
      else if (x < -len * 0.4) side = 'left';
      if (!side) continue;
      const meters = Math.abs(r.visualProgress - this.race.player.visualProgress) * Math.round((this.race.typing.totalChars * 8) / 100) * 100;
      const ax = side === 'right' ? L.w - 12 : 12;
      const dir = side === 'right' ? 1 : -1;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.moveTo(ax + dir * 6, y);
      ctx.lineTo(ax - dir * 6, y - 9);
      ctx.lineTo(ax - dir * 6, y + 9);
      ctx.closePath();
      ctx.fill();
      ctx.font = '700 12px Rajdhani, sans-serif';
      ctx.textAlign = side === 'right' ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(8,10,18,0.75)';
      const label = `${r.name} ${side === 'right' ? '+' : '-'}${Math.round(meters)}m`;
      const tw = ctx.measureText(label).width + 10;
      const lx = side === 'right' ? ax - 12 - tw : ax + 12;
      ctx.fillRect(lx, y - 9, tw, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, side === 'right' ? ax - 17 : ax + 17, y + 0.5);
    }
  }

  private drawVignette(k: number) {
    const { ctx, layout: L } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const g = ctx.createRadialGradient(L.w / 2, L.h / 2, Math.min(L.w, L.h) * 0.3, L.w / 2, L.h / 2, Math.max(L.w, L.h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${0.45 + k * 0.2})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L.w, L.h);
  }
}
