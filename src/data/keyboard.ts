/**
 * Teclado ABNT2 (padrão brasileiro), dedo responsável por cada tecla e
 * conversão de caracteres na sequência de teclas que os produz.
 */

export type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'th' | 'ri' | 'rm' | 'rr' | 'rp';

export interface KeyDef {
  id: string;
  label: string;
  /** Rótulo superior (com Shift) */
  shiftLabel?: string;
  /** Largura em unidades de tecla */
  w?: number;
  finger: Finger;
  /** Teclas F e J têm relevo para achar a posição sem olhar */
  bump?: boolean;
}

export const FINGER_INFO: Record<Finger, { name: string; hand: 'Esquerda' | 'Direita' | 'Ambas'; color: string }> = {
  lp: { name: 'Mínimo', hand: 'Esquerda', color: '#ff5c8a' },
  lr: { name: 'Anelar', hand: 'Esquerda', color: '#ffb020' },
  lm: { name: 'Médio', hand: 'Esquerda', color: '#7dff3a' },
  li: { name: 'Indicador', hand: 'Esquerda', color: '#00d4ff' },
  th: { name: 'Polegar', hand: 'Ambas', color: '#a24bff' },
  ri: { name: 'Indicador', hand: 'Direita', color: '#3d8bff' },
  rm: { name: 'Médio', hand: 'Direita', color: '#7dff3a' },
  rr: { name: 'Anelar', hand: 'Direita', color: '#ffb020' },
  rp: { name: 'Mínimo', hand: 'Direita', color: '#ff5c8a' },
};

const k = (id: string, finger: Finger, label = id.toUpperCase(), extra: Partial<KeyDef> = {}): KeyDef => ({ id, label, finger, ...extra });

export const KEY_ROWS: KeyDef[][] = [
  [
    k("'", 'lp', "'", { shiftLabel: '"' }),
    k('1', 'lp', '1', { shiftLabel: '!' }),
    k('2', 'lr', '2', { shiftLabel: '@' }),
    k('3', 'lm', '3', { shiftLabel: '#' }),
    k('4', 'li', '4', { shiftLabel: '$' }),
    k('5', 'li', '5', { shiftLabel: '%' }),
    k('6', 'ri', '6', { shiftLabel: '¨' }),
    k('7', 'ri', '7', { shiftLabel: '&' }),
    k('8', 'rm', '8', { shiftLabel: '*' }),
    k('9', 'rr', '9', { shiftLabel: '(' }),
    k('0', 'rp', '0', { shiftLabel: ')' }),
    k('-', 'rp', '-', { shiftLabel: '_' }),
    k('=', 'rp', '=', { shiftLabel: '+' }),
    k('backspace', 'rp', '⌫', { w: 1.9 }),
  ],
  [
    k('tab', 'lp', 'Tab', { w: 1.5 }),
    k('q', 'lp'),
    k('w', 'lr'),
    k('e', 'lm'),
    k('r', 'li'),
    k('t', 'li'),
    k('y', 'ri'),
    k('u', 'ri'),
    k('i', 'rm'),
    k('o', 'rr'),
    k('p', 'rp'),
    k('´', 'rp', '´', { shiftLabel: '`' }),
    k('[', 'rp', '[', { shiftLabel: '{' }),
    k('enter', 'rp', 'Enter', { w: 1.4 }),
  ],
  [
    k('caps', 'lp', 'Caps', { w: 1.8 }),
    k('a', 'lp'),
    k('s', 'lr'),
    k('d', 'lm'),
    k('f', 'li', 'F', { bump: true }),
    k('g', 'li'),
    k('h', 'ri'),
    k('j', 'ri', 'J', { bump: true }),
    k('k', 'rm'),
    k('l', 'rr'),
    k('ç', 'rp', 'Ç'),
    k('~', 'rp', '~', { shiftLabel: '^' }),
    k(']', 'rp', ']', { shiftLabel: '}' }),
    k('enter2', 'rp', '', { w: 1.1 }),
  ],
  [
    k('shiftL', 'lp', 'Shift', { w: 1.3 }),
    k('\\', 'lp', '\\', { shiftLabel: '|' }),
    k('z', 'lp'),
    k('x', 'lr'),
    k('c', 'lm'),
    k('v', 'li'),
    k('b', 'li'),
    k('n', 'ri'),
    k('m', 'ri'),
    k(',', 'rm', ',', { shiftLabel: '<' }),
    k('.', 'rr', '.', { shiftLabel: '>' }),
    k(';', 'rp', ';', { shiftLabel: ':' }),
    k('/', 'rp', '/', { shiftLabel: '?' }),
    k('shiftR', 'rp', 'Shift', { w: 2.1 }),
  ],
  [k('space', 'th', 'Espaço', { w: 7 })],
];

export const KEY_BY_ID: Record<string, KeyDef> = Object.fromEntries(KEY_ROWS.flat().map((key) => [key.id, key]));

/** Teclas da posição inicial (fileira do meio) para cada dedo */
export const HOME_KEYS: Partial<Record<Finger, string>> = { lp: 'a', lr: 's', lm: 'd', li: 'f', ri: 'j', rm: 'k', rr: 'l', rp: 'ç', th: 'space' };

/** Um toque: tecla + Shift opcional */
export interface Stroke {
  key: string;
  shift?: 'shiftL' | 'shiftR';
}

// caractere com Shift → tecla base
const SHIFTED: Record<string, string> = {};
for (const key of KEY_ROWS.flat()) if (key.shiftLabel) SHIFTED[key.shiftLabel] = key.id;

/** Shift deve ser apertado com o mínimo da mão oposta à tecla */
function withShift(key: string): Stroke {
  const finger = KEY_BY_ID[key]?.finger ?? 'li';
  return { key, shift: finger.startsWith('l') ? 'shiftR' : 'shiftL' };
}

const ACCENTS: Record<string, [Stroke, string]> = {
  á: [{ key: '´' }, 'a'], é: [{ key: '´' }, 'e'], í: [{ key: '´' }, 'i'], ó: [{ key: '´' }, 'o'], ú: [{ key: '´' }, 'u'],
  à: [withShift('´'), 'a'],
  â: [withShift('~'), 'a'], ê: [withShift('~'), 'e'], ô: [withShift('~'), 'o'],
  ã: [{ key: '~' }, 'a'], õ: [{ key: '~' }, 'o'],
};

/** Sequência de toques para produzir um caractere no ABNT2 */
export function strokesFor(ch: string): Stroke[] {
  if (ch === ' ') return [{ key: 'space' }];
  const lower = ch.toLowerCase();
  const upper = ch !== lower;

  const acc = ACCENTS[lower];
  if (acc) {
    const [dead, base] = acc;
    return [dead, upper ? withShift(base) : { key: base }];
  }
  if (KEY_BY_ID[lower] && lower.length === 1) return [upper ? withShift(lower) : { key: lower }];
  if (SHIFTED[ch]) return [withShift(SHIFTED[ch])];
  return [];
}

/** Descrição curta de como digitar um caractere, ex.: "´ e depois E" */
export function strokeHint(ch: string): string {
  const strokes = strokesFor(ch);
  const name = (s: Stroke) => `${s.shift ? 'Shift + ' : ''}${KEY_BY_ID[s.key]?.label ?? s.key}`;
  if (strokes.length === 2) return `${name(strokes[0])}  e depois  ${name(strokes[1])}`;
  if (strokes.length === 1) return name(strokes[0]);
  return ch;
}
