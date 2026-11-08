/** Preferências que só existem no app desktop (.exe) */

/** Tela cheia é controlada pelo app (e lembrada ao abrir de novo) */
export async function getDesktopFullscreen(): Promise<boolean> {
  try {
    const res = await fetch('/__desktop/settings', { cache: 'no-store' });
    return Boolean((await res.json()).fullscreen);
  } catch {
    return false;
  }
}

export async function setDesktopFullscreen(on: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/__desktop/settings?fullscreen=${on ? 1 : 0}`, { method: 'POST' });
    return Boolean((await res.json()).fullscreen);
  } catch {
    return !on;
  }
}

/* Contador de FPS: guardado no aparelho, avisa a tela na hora que muda */
const FPS_KEY = 'typecar:showFps';
const FPS_EVENT = 'typecar:fps-toggle';

export function getShowFps(): boolean {
  try {
    return localStorage.getItem(FPS_KEY) === '1';
  } catch {
    return false;
  }
}

export function setShowFps(on: boolean) {
  try {
    if (on) localStorage.setItem(FPS_KEY, '1');
    else localStorage.removeItem(FPS_KEY);
  } catch {
    /* sem armazenamento: vale só agora */
  }
  window.dispatchEvent(new CustomEvent(FPS_EVENT, { detail: on }));
}

export function onShowFpsChange(cb: (on: boolean) => void): () => void {
  const h = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(FPS_EVENT, h);
  return () => window.removeEventListener(FPS_EVENT, h);
}
