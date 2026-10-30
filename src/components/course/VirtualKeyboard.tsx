import { memo } from 'react';
import { FINGER_INFO, KEY_ROWS } from '../../data/keyboard';
import { withAlpha } from '../../game/colors';

interface Props {
  /** Teclas a apertar agora (destaque forte) */
  active?: string[];
  /** Teclas do próximo passo (destaque fraco), ex.: letra depois do acento */
  next?: string[];
  /** Tecla apertada por último e se foi certa */
  flash?: { key: string; ok: boolean } | null;
  /** Teclas a enfatizar (ex.: teclas novas da lição) */
  emphasize?: string[];
  /** Pinta as teclas com a cor do dedo */
  colored?: boolean;
}

/** Teclado ABNT2 com cores por dedo */
export const VirtualKeyboard = memo(function VirtualKeyboard({ active = [], next = [], flash, emphasize = [], colored = true }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl select-none rounded-xl border border-white/10 bg-asphalt-950/80 p-2 sm:p-3">
      <div className="flex flex-col gap-1 sm:gap-1.5">
        {KEY_ROWS.map((row, r) => (
          <div key={r} className={`flex gap-1 sm:gap-1.5 ${r === 4 ? 'justify-center' : ''}`}>
            {row.map((key) => {
              const color = FINGER_INFO[key.finger].color;
              const isActive = active.includes(key.id);
              const isNext = next.includes(key.id);
              const isEmph = emphasize.includes(key.id);
              const flashed = flash?.key === key.id;
              const w = key.w ?? 1;
              return (
                <div
                  key={key.id}
                  className={`relative flex h-8 items-center justify-center rounded-md border font-display text-[9px] font-bold uppercase sm:h-11 sm:text-xs ${
                    key.id === 'enter2' ? 'invisible sm:visible sm:opacity-0' : ''
                  } transition-[transform,box-shadow,background-color] duration-100`}
                  style={{
                    flex: `${w} ${w} 0`,
                    background: flashed
                      ? flash!.ok
                        ? 'rgba(52,211,153,0.55)'
                        : 'rgba(239,68,68,0.6)'
                      : isActive
                        ? color
                        : colored
                          ? withAlpha(color, isEmph ? 0.32 : 0.1)
                          : 'rgba(255,255,255,0.05)',
                    borderColor: isActive ? '#fff' : isNext ? color : withAlpha(color, colored ? 0.35 : 0.1),
                    color: isActive ? '#05070d' : 'rgba(255,255,255,0.85)',
                    boxShadow: isActive ? `0 0 18px ${color}` : isNext ? `0 0 8px ${withAlpha(color, 0.6)}` : undefined,
                    transform: isActive ? 'translateY(-2px)' : flashed ? 'translateY(1px)' : undefined,
                  }}
                >
                  {key.shiftLabel && <span className="absolute left-1 top-0.5 hidden text-[8px] opacity-50 sm:block">{key.shiftLabel}</span>}
                  <span>{key.label}</span>
                  {key.bump && <span className="absolute bottom-1 h-[2px] w-2.5 rounded-full bg-current opacity-70" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});
