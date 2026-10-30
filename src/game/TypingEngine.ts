/**
 * Motor de digitação, independente de UI.
 *
 * O texto é dividido em "alvos": cada palavra seguida do seu espaço
 * (a última palavra não tem espaço). O jogador digita o alvo atual num
 * campo de texto; quando o valor do campo é exatamente igual ao alvo, a
 * palavra é confirmada e o campo é limpo. Qualquer caractere errado
 * congela o progresso até ser apagado.
 */

export type CharState = 'done' | 'correct' | 'wrong' | 'current' | 'pending';

export interface InputResult {
  /** Novos caracteres corretos digitados nesta chamada */
  correct: number;
  /** Novos caracteres errados digitados nesta chamada */
  wrong: number;
  /** Uma palavra foi confirmada */
  committedWord: boolean;
  /** Texto completo */
  finished: boolean;
  /** Valor que o campo de entrada deve exibir após o processamento */
  inputValue: string;
}

const MAX_OVERFLOW = 12;

export class TypingEngine {
  readonly text: string;
  readonly targets: string[];
  /** Índice do primeiro caractere de cada alvo dentro do texto */
  readonly targetOffsets: number[];

  wordIndex = 0;
  input = '';
  committedChars = 0;
  totalKeystrokes = 0;
  correctKeystrokes = 0;
  errors = 0;
  /** Palavras seguidas sem erro */
  streak = 0;
  maxStreak = 0;
  private wordHadError = false;

  constructor(text: string) {
    this.text = text.replace(/\s+/g, ' ').trim();
    const words = this.text.split(' ');
    this.targets = words.map((w, i) => (i < words.length - 1 ? w + ' ' : w));
    this.targetOffsets = [];
    let off = 0;
    for (const t of this.targets) {
      this.targetOffsets.push(off);
      off += t.length;
    }
  }

  get totalChars(): number {
    return this.text.length;
  }

  get currentTarget(): string {
    return this.targets[this.wordIndex] ?? '';
  }

  get finished(): boolean {
    return this.wordIndex >= this.targets.length;
  }

  /** Quantidade de caracteres corretos no início da entrada atual */
  get correctPrefix(): number {
    const t = this.currentTarget;
    let i = 0;
    while (i < this.input.length && i < t.length && this.input[i] === t[i]) i++;
    return i;
  }

  get hasError(): boolean {
    return this.correctPrefix < this.input.length;
  }

  /** Caracteres válidos para o progresso (confirmados + prefixo correto) */
  get progressChars(): number {
    return this.committedChars + this.correctPrefix;
  }

  get progress(): number {
    return this.totalChars === 0 ? 0 : this.progressChars / this.totalChars;
  }

  get accuracy(): number {
    return this.totalKeystrokes === 0 ? 100 : (this.correctKeystrokes / this.totalKeystrokes) * 100;
  }

  /** Processa o novo valor do campo de entrada. */
  setInput(raw: string): InputResult {
    const result: InputResult = { correct: 0, wrong: 0, committedWord: false, finished: false, inputValue: raw };
    if (this.finished) return { ...result, finished: true, inputValue: '' };

    const target = this.currentTarget;
    let value = raw.slice(0, target.length + MAX_OVERFLOW);

    // Prefixo em comum com a entrada anterior: o resto são teclas novas.
    let common = 0;
    while (common < value.length && common < this.input.length && value[common] === this.input[common]) common++;

    if (value.length > common) {
      let validUntil = 0;
      while (validUntil < common && validUntil < target.length && value[validUntil] === target[validUntil]) validUntil++;
      let chainOk = validUntil === common;
      for (let p = common; p < value.length; p++) {
        this.totalKeystrokes++;
        if (chainOk && value[p] === target[p]) {
          this.correctKeystrokes++;
          result.correct++;
        } else {
          chainOk = false;
          this.errors++;
          result.wrong++;
          this.wordHadError = true;
        }
      }
    }

    this.input = value;

    if (value === target) {
      this.committedChars += target.length;
      this.wordIndex++;
      this.input = '';
      value = '';
      result.committedWord = true;
      if (this.wordHadError) {
        this.streak = 0;
      } else {
        this.streak++;
        this.maxStreak = Math.max(this.maxStreak, this.streak);
      }
      this.wordHadError = false;
      if (this.finished) result.finished = true;
    }

    result.inputValue = value;
    return result;
  }

  /** Estado visual de cada caractere do texto. */
  charStates(): CharState[] {
    const states: CharState[] = new Array(this.text.length).fill('pending');
    for (let i = 0; i < this.committedChars && i < states.length; i++) states[i] = 'done';
    if (this.finished) return states;

    const base = this.targetOffsets[this.wordIndex];
    const target = this.currentTarget;
    const prefix = this.correctPrefix;
    for (let i = 0; i < Math.min(this.input.length, target.length); i++) {
      states[base + i] = i < prefix ? 'correct' : 'wrong';
    }
    const caret = base + Math.min(this.input.length, target.length);
    if (caret < states.length && this.input.length < target.length) states[caret] = 'current';
    return states;
  }

  /** Caracteres digitados além do tamanho da palavra atual */
  get overflow(): string {
    const t = this.currentTarget;
    return this.input.length > t.length ? this.input.slice(t.length) : '';
  }
}
