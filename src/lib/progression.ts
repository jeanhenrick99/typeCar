import type { RaceResult } from '../types';

/* ───────────────────────── Nível e XP ───────────────────────── */

/** XP necessário para sair do nível `level` e chegar ao próximo */
export function xpToNext(level: number): number {
  return 100 + 40 * (level - 1);
}

/** Nível atual a partir do XP total, com o progresso dentro do nível */
export function levelInfo(totalXp: number) {
  let level = 1;
  let rest = Math.max(0, Math.floor(totalXp));
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  const need = xpToNext(level);
  return { level, into: rest, need, ratio: rest / need };
}

/* ─────────────────────── Sequência de dias ─────────────────────── */

export interface Streak {
  /** Dias seguidos jogando */
  count: number;
  /** Maior sequência já alcançada (as recompensas ficam para sempre) */
  best: number;
  /** Último dia em que correu (AAAA-MM-DD, horário local) */
  lastDay: string;
}

export const EMPTY_STREAK: Streak = { count: 0, best: 0, lastDay: '' };

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Sequência que vale hoje: zera se o jogador pulou um dia */
export function liveStreak(s: Streak): number {
  return s.lastDay === dayKey() || s.lastDay === yesterdayKey() ? s.count : 0;
}

/** Atualiza a sequência ao terminar uma corrida; `firstToday` = primeira corrida do dia */
export function advanceStreak(s: Streak): { streak: Streak; firstToday: boolean } {
  const today = dayKey();
  if (s.lastDay === today) return { streak: s, firstToday: false };
  const count = s.lastDay === yesterdayKey() ? s.count + 1 : 1;
  return { streak: { count, best: Math.max(s.best, count), lastDay: today }, firstToday: true };
}

/** Visual da chama da sequência, que muda conforme os dias */
export function streakTier(days: number): { color: string; label: string } {
  if (days >= 30) return { color: '#ffd000', label: 'Lendária' };
  if (days >= 14) return { color: '#c45bff', label: 'Épica' };
  if (days >= 7) return { color: '#00d4ff', label: 'Azul' };
  if (days >= 3) return { color: '#ff6a00', label: 'Em chamas' };
  return { color: '#ffb36b', label: 'Acesa' };
}

/* ─────────────────────── XP de cada corrida ─────────────────────── */

export interface XpLine {
  label: string;
  xp: number;
}

const POSITION_XP = [50, 30, 20, 10, 5];

export function raceXp(r: RaceResult, firstToday: boolean, streakDays: number): XpLine[] {
  if (r.chars === 0) return [];
  const lines: XpLine[] = [{ label: 'Corrida', xp: 20 }];
  const perf = Math.round(r.wpm * (r.accuracy / 100) * 0.8);
  if (perf > 0) lines.push({ label: 'Desempenho', xp: perf });
  if (r.finished) lines.push({ label: `${r.position}º lugar`, xp: POSITION_XP[r.position - 1] ?? 5 });
  if (r.accuracy >= 100 && r.finished) lines.push({ label: 'Sem erros', xp: 25 });
  if (firstToday) lines.push({ label: `Bônus diário · ${streakDays} ${streakDays === 1 ? 'dia' : 'dias'}`, xp: 30 + 10 * Math.min(streakDays - 1, 7) });
  return lines;
}

/* ───────────────────── Itens desbloqueáveis ───────────────────── */

export type CosmeticKind = 'paint' | 'wheel' | 'neon' | 'smoke';

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  name: string;
  /** Cor do item; 'rainbow' = arco-íris animado; null = sem efeito */
  color: string | null;
  /** Nível mínimo para liberar */
  level?: number;
  /** Ou: dias seguidos jogando (maior sequência já feita) */
  streak?: number;
}

export const RAINBOW = 'rainbow';

export const COSMETICS: Cosmetic[] = [
  // pinturas extras (as cores básicas da garagem são livres)
  { id: 'pink', kind: 'paint', name: 'Rosa Choque', color: '#ff2bd6', level: 2 },
  { id: 'mint', kind: 'paint', name: 'Menta', color: '#2affc6', level: 4 },
  { id: 'ice', kind: 'paint', name: 'Ciano Gelo', color: '#7ff6ff', level: 6 },
  { id: 'wine', kind: 'paint', name: 'Vinho', color: '#8a0f2a', level: 8 },
  { id: 'gold', kind: 'paint', name: 'Dourado', color: '#d4a017', level: 10 },
  { id: 'coral', kind: 'paint', name: 'Coral', color: '#ff5a5f', level: 12 },

  // rodas
  { id: 'original', kind: 'wheel', name: 'Original', color: null },
  { id: 'chrome', kind: 'wheel', name: 'Cromada', color: '#c8d0dc', level: 3 },
  { id: 'bronze', kind: 'wheel', name: 'Bronze', color: '#b5793a', level: 5 },
  { id: 'red', kind: 'wheel', name: 'Vermelha', color: '#e0142d', level: 7 },
  { id: 'blue', kind: 'wheel', name: 'Azul Elétrico', color: '#00a8ff', level: 9 },
  { id: 'gold', kind: 'wheel', name: 'Dourada', color: '#e8b830', level: 11 },
  { id: 'white', kind: 'wheel', name: 'Branca', color: '#f2f4f8', level: 14 },

  // neon embaixo do carro
  { id: 'none', kind: 'neon', name: 'Sem neon', color: null },
  { id: 'blue', kind: 'neon', name: 'Azul', color: '#00d4ff', level: 2 },
  { id: 'pink', kind: 'neon', name: 'Rosa', color: '#ff2bd6', level: 4 },
  { id: 'green', kind: 'neon', name: 'Verde', color: '#3dff6e', level: 6 },
  { id: 'red', kind: 'neon', name: 'Vermelho', color: '#ff2b4a', level: 8 },
  { id: 'white', kind: 'neon', name: 'Branco', color: '#ffffff', level: 12 },
  { id: 'rainbow', kind: 'neon', name: 'Arco-íris', color: RAINBOW, streak: 7 },

  // fumaça e chama do nitro
  { id: 'blue', kind: 'smoke', name: 'Azul', color: '#00d4ff' },
  { id: 'purple', kind: 'smoke', name: 'Roxa', color: '#b04bff', level: 3 },
  { id: 'pink', kind: 'smoke', name: 'Rosa', color: '#ff2bd6', streak: 3 },
  { id: 'green', kind: 'smoke', name: 'Verde', color: '#3dff6e', level: 5 },
  { id: 'red', kind: 'smoke', name: 'Vermelha', color: '#ff3040', level: 7 },
  { id: 'gold', kind: 'smoke', name: 'Dourada', color: '#ffc400', level: 10 },
  { id: 'rainbow', kind: 'smoke', name: 'Arco-íris', color: RAINBOW, streak: 14 },
];

export const DEFAULT_LOOK = { wheel: 'original', neon: 'none', smoke: 'blue' };

export function cosmeticsOf(kind: CosmeticKind): Cosmetic[] {
  return COSMETICS.filter((c) => c.kind === kind);
}

export function getCosmetic(kind: CosmeticKind, id: string): Cosmetic {
  const list = cosmeticsOf(kind);
  return list.find((c) => c.id === id) ?? list[0];
}

export function isUnlocked(c: Cosmetic, level: number, bestStreak: number): boolean {
  if (c.level && level < c.level) return false;
  if (c.streak && bestStreak < c.streak) return false;
  return true;
}

export function requirement(c: Cosmetic): string {
  if (c.streak) return `${c.streak} dias seguidos`;
  if (c.level) return `Nível ${c.level}`;
  return '';
}

/** Itens que passaram a ficar liberados entre dois estados */
export function newlyUnlocked(levelBefore: number, levelAfter: number, streakBefore: number, streakAfter: number): Cosmetic[] {
  return COSMETICS.filter((c) => !isUnlocked(c, levelBefore, streakBefore) && isUnlocked(c, levelAfter, streakAfter));
}

/** Cor resolvida no instante `t` (segundos): o arco-íris gira pelo círculo de cores */
export function resolveColor(color: string | null, t = 0): string | null {
  if (color !== RAINBOW) return color;
  return `hsl(${Math.round((t * 90) % 360)},100%,60%)`;
}

/** Componentes RGB (0..255) de uma cor hex ou do arco-íris no instante `t` */
export function colorRGB(color: string, t = 0): [number, number, number] {
  if (color === RAINBOW) {
    const h = ((t * 90) % 360) / 60;
    const x = 1 - Math.abs((h % 2) - 1);
    const [r, g, b] = h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x];
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  const n = parseInt(color.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Resumo do que uma corrida rendeu, mostrado na tela de resultado */
export interface RaceReward {
  xpLines: XpLine[];
  xpGained: number;
  xpTotal: number;
  levelBefore: number;
  levelAfter: number;
  streak: number;
  firstToday: boolean;
  unlocked: Cosmetic[];
}
