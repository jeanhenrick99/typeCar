import { memo, useEffect, useMemo, useRef } from 'react';
import type { CharState } from '../../game/TypingEngine';

interface Props {
  text: string;
  states: CharState[];
  overflow: string;
  /** índice do caractere atual (cursor) */
  caretIndex: number;
  hasError: boolean;
  active: boolean;
  focused: boolean;
}

const CHAR_CLASS: Record<CharState, string> = {
  done: 'text-emerald-400/70',
  correct: 'text-emerald-300',
  wrong: 'text-white bg-red-500/80 rounded-[3px]',
  current: 'text-asphalt-950 bg-volt rounded-[3px] shadow-[0_0_14px_rgba(0,212,255,0.8)]',
  pending: 'text-white/45',
};

/** Exibe o texto da corrida com coloração por caractere. */
export const TypingPanel = memo(function TypingPanel({ text, states, overflow, caretIndex, hasError, active, focused }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);

  // Agrupa caracteres em palavras para não quebrar linhas no meio de uma palavra
  const words = useMemo(() => {
    const out: { start: number; chars: string[] }[] = [];
    let cur: { start: number; chars: string[] } = { start: 0, chars: [] };
    for (let i = 0; i < text.length; i++) {
      cur.chars.push(text[i]);
      if (text[i] === ' ') {
        out.push(cur);
        cur = { start: i + 1, chars: [] };
      }
    }
    if (cur.chars.length) out.push(cur);
    return out;
  }, [text]);

  // Mantém a linha atual visível
  useEffect(() => {
    const el = caretRef.current;
    const box = containerRef.current;
    if (!el || !box) return;
    const top = el.offsetTop;
    const lineH = el.offsetHeight || 32;
    if (top > box.scrollTop + box.clientHeight - lineH * 1.5 || top < box.scrollTop) {
      box.scrollTo({ top: Math.max(0, top - lineH), behavior: 'smooth' });
    }
  }, [caretIndex]);

  return (
    <div
      ref={containerRef}
      className={`relative max-h-[7.5rem] sm:max-h-[8.6rem] overflow-hidden font-mono text-lg sm:text-2xl leading-[2.2rem] sm:leading-[2.6rem] tracking-wide transition-opacity ${
        active ? 'opacity-100' : 'opacity-60'
      }`}
    >
      {words.map((w) => (
        <span key={w.start} className="inline-block whitespace-pre">
          {w.chars.map((ch, j) => {
            const idx = w.start + j;
            const st = states[idx] ?? 'pending';
            const isCaret = idx === caretIndex;
            const showOverflow = overflow && idx === caretIndex;
            return (
              <span key={idx}>
                {showOverflow && <span className="text-red-400 underline decoration-red-500 decoration-2">{overflow}</span>}
                <span
                  ref={isCaret ? caretRef : undefined}
                  className={`px-[1px] transition-colors duration-75 ${CHAR_CLASS[st]} ${
                    st === 'current' && !focused ? 'animate-caret' : ''
                  } ${st === 'current' && hasError ? '!bg-red-500 !shadow-[0_0_14px_rgba(255,40,60,0.8)]' : ''}`}
                >
                  {ch === ' ' && (st === 'wrong' || st === 'current') ? ' ' : ch}
                </span>
              </span>
            );
          })}
        </span>
      ))}
      {caretIndex >= text.length && overflow && <span className="text-red-400">{overflow}</span>}
    </div>
  );
});
