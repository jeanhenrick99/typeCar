import { useEffect, useRef, useState } from 'react';
import { getShowFps, onShowFpsChange } from '../lib/desktopApp';
import { isDesktop } from '../lib/desktopAuth';

/**
 * Contador de FPS bem pequeno no canto superior direito (só no app desktop,
 * quando ligado nas Configurações). Atualiza o texto direto, sem re-render.
 */
export function FpsMeter() {
  const [on, setOn] = useState(() => isDesktop() && getShowFps());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => onShowFpsChange((v) => setOn(isDesktop() && v)), []);

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let frames = 0;
    let worst = 0;
    let last = performance.now();
    let start = last;
    const tick = (now: number) => {
      frames++;
      worst = Math.max(worst, now - last);
      last = now;
      if (now - start >= 500) {
        const fps = Math.round((frames * 1000) / (now - start));
        const el = ref.current;
        if (el) {
          el.textContent = `${fps} FPS · ${worst.toFixed(0)}ms`;
          el.style.color = fps >= 55 ? '#6ee7b7' : fps >= 40 ? '#fcd34d' : '#f87171';
        }
        frames = 0;
        worst = 0;
        start = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  if (!on) return null;
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed right-1 top-0.5 z-[100] rounded-sm bg-black/60 px-1.5 py-px font-mono text-[10px] leading-tight text-emerald-300"
      title="Quadros por segundo · pior quadro do último meio segundo"
    >
      -- FPS
    </div>
  );
}
