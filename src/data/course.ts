import { RACE_TEXTS } from './texts';
import { loadJSON, saveJSON } from '../lib/storage';

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  /** Teclas novas apresentadas na lição */
  newKeys: string[];
  /** Explicação mostrada antes de começar */
  tips: string[];
  /** Precisão mínima para concluir */
  minAccuracy: number;
  /** PPM para ganhar a terceira estrela */
  targetWpm: number;
}

/** Palavras comuns em português usadas para montar os exercícios */
const WORDS = (
  'a o e de da do das dos em no na nos nas um uma com por para que se ao sua seu mas mais ' +
  'casa sala fala asa sal salada fada falsa lada saga gala galhas falha haja jaja dada alfa ' +
  'ele ela eles elas era eram ser seria rir rua sua suas fere dedo dia dias sede seda leve leis ' +
  'ideia idade ilha juiz fiel feira serra terra torre toda todo tudo outro outra olho olhos ' +
  'tarde teto lote rota foto forte sorte festa testa resto estado estrada ruas posto porta ' +
  'quero quase quarto queda pista piso pato pedra perto prato pouco poder porque sapato tipo ' +
  'carro corrida curva campo cabo cada coisa cinco claro vida volta vento vez novo nova nome ' +
  'boca bom bem baixo branco breve mundo meio mesmo motor marcha manobra numero noite nunca ' +
  'vamos vence veloz viva bandeira zona zero xadrez exato fixo luz paz vez dez giz ' +
  'piloto pneu freio volante largada chegada placar ritmo foco treino tecla teclado dedos ' +
  'rapido certo erro erros letra letras linha texto frase palavra palavras escrever digitar'
).split(' ');

const ACCENT_WORDS = (
  'você está já até também café pé fé avó avô três mês português órgão pão mão não são irmão ' +
  'coração atenção posição precisão direção ação lição lições é só lá aí até ônibus número ' +
  'rápido último próximo música fácil difícil pódio vitória rápida família água às à'
).split(' ');

export const LESSONS: Lesson[] = [
  {
    id: 'home',
    title: 'Posição inicial',
    subtitle: 'A S D F  ·  J K L Ç',
    newKeys: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'ç'],
    tips: [
      'Apoie os indicadores nas teclas F e J — elas têm um pequeno relevo para você encontrá-las sem olhar.',
      'Os outros dedos ficam ao lado: mínimo no A e no Ç, anelar no S e no L, médio no D e no K.',
      'Os polegares descansam sobre a barra de espaço.',
      'Depois de cada tecla, volte o dedo para a posição inicial.',
    ],
    minAccuracy: 90,
    targetWpm: 15,
  },
  {
    id: 'gh',
    title: 'Indicadores ao centro',
    subtitle: 'G  ·  H',
    newKeys: ['g', 'h'],
    tips: ['O indicador esquerdo estica para o G; o direito, para o H.', 'Os outros dedos não saem da posição inicial.'],
    minAccuracy: 90,
    targetWpm: 18,
  },
  {
    id: 'top1',
    title: 'Fileira de cima I',
    subtitle: 'E  ·  R  ·  U  ·  I',
    newKeys: ['e', 'r', 'u', 'i'],
    tips: [
      'O médio esquerdo sobe do D para o E; o indicador esquerdo sobe do F para o R.',
      'Do lado direito: indicador do J para o U, médio do K para o I.',
      'Suba só o dedo necessário e volte logo para a fileira do meio.',
    ],
    minAccuracy: 90,
    targetWpm: 20,
  },
  {
    id: 'top2',
    title: 'Fileira de cima II',
    subtitle: 'T  ·  O  ·  P  ·  Y',
    newKeys: ['t', 'o', 'p', 'y'],
    tips: ['T é do indicador esquerdo, Y do indicador direito.', 'O anelar direito alcança o O; o mínimo direito, o P.'],
    minAccuracy: 90,
    targetWpm: 22,
  },
  {
    id: 'top3',
    title: 'Cantos de cima',
    subtitle: 'Q  ·  W',
    newKeys: ['q', 'w'],
    tips: ['O mínimo esquerdo sobe do A para o Q, o anelar esquerdo do S para o W.', 'Mantenha o pulso parado: só o dedo se move.'],
    minAccuracy: 90,
    targetWpm: 22,
  },
  {
    id: 'bottom1',
    title: 'Fileira de baixo I',
    subtitle: 'C  ·  V  ·  B  ·  N  ·  M',
    newKeys: ['c', 'v', 'b', 'n', 'm'],
    tips: [
      'Os dedos descem curvando, sem levantar a mão.',
      'C é do médio esquerdo; V e B, do indicador esquerdo.',
      'N e M são do indicador direito.',
    ],
    minAccuracy: 90,
    targetWpm: 24,
  },
  {
    id: 'bottom2',
    title: 'Fileira de baixo II',
    subtitle: 'Z  ·  X  ·  vírgula  ·  ponto',
    newKeys: ['z', 'x', ',', '.'],
    tips: ['Z é do mínimo esquerdo e X do anelar esquerdo.', 'A vírgula é do médio direito; o ponto, do anelar direito.'],
    minAccuracy: 90,
    targetWpm: 24,
  },
  {
    id: 'shift',
    title: 'Maiúsculas',
    subtitle: 'Shift com a mão oposta',
    newKeys: ['shiftL', 'shiftR'],
    tips: [
      'Para letra maiúscula, segure o Shift com o mínimo da mão oposta à letra.',
      'Letra da mão esquerda (ex.: A) → Shift direito. Letra da mão direita (ex.: J) → Shift esquerdo.',
      'Solte o Shift logo depois de apertar a letra.',
    ],
    minAccuracy: 90,
    targetWpm: 25,
  },
  {
    id: 'accents',
    title: 'Acentos',
    subtitle: '´  ~  ^  e Ç',
    newKeys: ['´', '~', 'ç'],
    tips: [
      'Os acentos são teclas "mortas": aperte o acento primeiro e depois a letra.',
      'Agudo (´) e til (~) ficam com o mínimo direito. O circunflexo (^) é Shift + ~.',
      'Exemplos: ´ + a = á, ~ + a = ã, Shift + ~ e depois e = ê.',
    ],
    minAccuracy: 88,
    targetWpm: 25,
  },
  {
    id: 'final',
    title: 'Texto completo',
    subtitle: 'Frases reais de corrida',
    newKeys: [],
    tips: ['Agora junte tudo: maiúsculas, acentos e pontuação.', 'Mantenha o ritmo constante e não olhe para o teclado.'],
    minAccuracy: 92,
    targetWpm: 30,
  },
];

/** Teclas liberadas até a lição `index` (inclusive) */
function allowedLetters(index: number): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i <= index; i++) for (const key of LESSONS[i].newKeys) if (key.length === 1) set.add(key);
  return set;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function wordsWith(letters: Set<string>, pool = WORDS): string[] {
  return pool.filter((w) => [...w].every((c) => letters.has(c)));
}

function capitalize(w: string) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** Gera os exercícios (textos) de uma lição. Uma nova variação a cada tentativa. */
export function buildExercises(index: number, attempt = 0): string[] {
  const lesson = LESSONS[index];
  const rnd = seeded(index * 1000 + attempt * 17 + 7);
  const letters = allowedLetters(index);
  const newLetters = lesson.newKeys.filter((key) => key.length === 1 && key !== '´' && key !== '~');

  if (lesson.id === 'final') {
    const texts = [...RACE_TEXTS].sort(() => rnd() - 0.5);
    return texts.slice(0, 3);
  }

  // 1. repetição das teclas novas (pares e trios)
  const drill: string[] = [];
  const focus = newLetters.length ? newLetters : [...letters];
  for (let i = 0; i < 12; i++) {
    const a = pick(focus, rnd);
    const b = pick(focus, rnd);
    drill.push(i % 3 === 0 ? a.repeat(3) : a + b + (i % 2 ? a : b));
  }

  // 2. grupos misturando teclas antigas e novas
  const all = [...letters].filter((c) => c !== ',' && c !== '.');
  const mix: string[] = [];
  for (let i = 0; i < 10; i++) {
    const len = 3 + Math.floor(rnd() * 3);
    let g = '';
    for (let j = 0; j < len; j++) g += j % 2 === 0 && newLetters.length && rnd() < 0.6 ? pick(newLetters, rnd) : pick(all, rnd);
    mix.push(g);
  }

  // 3 e 4. palavras reais que só usam as teclas já aprendidas
  let words = wordsWith(letters);
  if (words.length < 6) words = words.concat(mix);
  const sentence = (n: number) => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(pick(words, rnd));
    return out;
  };

  if (lesson.id === 'shift') {
    const s1 = sentence(10).map((w, i) => (i % 2 === 0 ? capitalize(w) : w));
    const s2 = sentence(12).map((w) => (rnd() < 0.5 ? capitalize(w) : w));
    const names = ['Ana', 'Bruno', 'Carla', 'Diego', 'Lucas', 'Julia', 'Pedro', 'Sofia', 'Rafael', 'Marina'];
    const s3 = Array.from({ length: 8 }, () => `${pick(names, rnd)} ${pick(words, rnd)}.`);
    return [s1.join(' '), s2.join(' '), s3.join(' ')];
  }

  if (lesson.id === 'accents') {
    const acc = ACCENT_WORDS.slice().sort(() => rnd() - 0.5);
    const pairs = 'á é í ó ú ã õ â ê ô ç à'.split(' ');
    return [
      Array.from({ length: 12 }, () => pick(pairs, rnd)).join(' '),
      acc.slice(0, 12).join(' '),
      acc
        .slice(12, 22)
        .map((w, i) => (i % 3 === 0 ? capitalize(w) : w))
        .join(' ') + '.',
    ];
  }

  const ex3 = sentence(10).join(' ');
  let ex4 = sentence(14).join(' ');
  if (letters.has(',') && letters.has('.')) {
    const s = sentence(14);
    ex4 = s.map((w, i) => (i === 4 || i === 9 ? `${w},` : w)).join(' ') + '.';
  }
  return [drill.join(' '), mix.join(' '), ex3, ex4];
}

// ───────────── progresso ─────────────

export interface LessonProgress {
  stars: number;
  bestWpm: number;
  bestAccuracy: number;
}

const KEY = 'typecar:course';

export function loadProgress(): Record<string, LessonProgress> {
  return loadJSON<Record<string, LessonProgress>>(KEY, {});
}

export function saveLessonResult(id: string, wpm: number, accuracy: number, stars: number): Record<string, LessonProgress> {
  const all = loadProgress();
  const prev = all[id];
  all[id] = {
    stars: Math.max(prev?.stars ?? 0, stars),
    bestWpm: Math.max(prev?.bestWpm ?? 0, wpm),
    bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
  };
  saveJSON(KEY, all);
  return all;
}

export function starsFor(lesson: Lesson, wpm: number, accuracy: number): number {
  if (accuracy < lesson.minAccuracy) return 0;
  let s = 1;
  if (accuracy >= 95) s++;
  if (accuracy >= 97 && wpm >= lesson.targetWpm) s++;
  return s;
}

export function isUnlocked(index: number, progress: Record<string, LessonProgress>): boolean {
  return index === 0 || (progress[LESSONS[index - 1].id]?.stars ?? 0) > 0;
}
