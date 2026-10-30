import { useEffect, useRef } from 'react';
import { CAR_ART, drawCarArt, groundRatio, loadCarArt } from '../game/carArt';
import { getCarModel } from '../data/cars';
import type { CarModelId } from '../types';

interface Props {
  model: CarModelId;
  color: string;
  className?: string;
  /** Rodas girando (menu e destaque da garagem) */
  spinning?: boolean;
  /** Sombra no chão e brilho colorido embaixo */
  shadow?: boolean;
}

/** Arte do carro em um canvas responsivo, com rodas animadas */
export function CarPhoto({ model, color, className = '', spinning = false, shadow = true }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const meta = CAR_ART[model];
  const pad = shadow ? 0.1 : 0.02;
  const aspect = meta.w / (meta.h * (1 + pad));

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = color.toLowerCase() === getCarModel(model).signature.toLowerCase() ? null : color;
    let art: HTMLCanvasElement | null = null;
    let raf = 0;
    let angle = 0;
    let last = performance.now();
    let alive = true;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx || !art) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const carH = w * (meta.h / meta.w);
      const ground = carH * groundRatio(model);
      if (shadow) {
        const g = ctx.createRadialGradient(w / 2, ground, 0, w / 2, ground, w * 0.5);
        g.addColorStop(0, 'rgba(0,0,0,0.75)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.translate(0, ground);
        ctx.scale(1, 0.08);
        ctx.translate(0, -ground);
        ctx.fillStyle = g;
        ctx.fillRect(0, ground - w * 0.5, w, w);
        ctx.restore();
      }
      drawCarArt(ctx, art, model, 0, 0, w, angle, spinning ? 1 : 0);
    };

    const loop = (now: number) => {
      angle += ((now - last) / 1000) * 14;
      last = now;
      draw();
      raf = requestAnimationFrame(loop);
    };

    loadCarArt(model, paint).then((a) => {
      if (!alive) return;
      art = a;
      if (spinning) raf = requestAnimationFrame(loop);
      else draw();
    });

    const ro = new ResizeObserver(() => !spinning && draw());
    ro.observe(canvas);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [model, color, spinning, shadow, meta]);

  return <canvas ref={ref} className={`block w-full ${className}`} style={{ aspectRatio: `${aspect}` }} aria-label={getCarModel(model).name} />;
}
