import { memo } from 'react';
import { FINGER_INFO, type Finger } from '../../data/keyboard';

interface Props {
  /** Dedos que devem se mover agora */
  active?: Finger[];
  /** Mostrar o nome do dedo ativo */
  showLabel?: boolean;
  /** O toque atual usa Shift */
  shift?: boolean;
}

// Dedos da mão esquerda, do mínimo ao polegar: [x, comprimento, largura, inclinação]
const LEFT: [Finger, number, number, number, number][] = [
  ['lp', 14, 44, 15, -10],
  ['lr', 34, 62, 16, -4],
  ['lm', 55, 70, 17, 0],
  ['li', 76, 62, 17, 5],
  ['th', 100, 38, 18, 52],
];

function Hand({ side, active }: { side: 'left' | 'right'; active: Finger[] }) {
  const mirror = side === 'right';
  return (
    <g transform={mirror ? 'translate(292 0) scale(-1 1)' : 'translate(4 0)'}>
      {/* palma */}
      <path d="M 8 92 Q 6 150 40 168 L 92 168 Q 118 150 116 104 L 100 86 Q 60 80 8 92 Z" fill="#1a2236" stroke="rgba(255,255,255,0.15)" />
      {LEFT.map(([f, x, len, wid, rot]) => {
        const finger: Finger = mirror ? (({ lp: 'rp', lr: 'rr', lm: 'rm', li: 'ri', th: 'th' }) as Record<string, Finger>)[f] : f;
        const color = FINGER_INFO[finger].color;
        const on = active.includes(finger);
        const baseY = f === 'th' ? 120 : 96;
        return (
          <g key={f} transform={`rotate(${rot} ${x + wid / 2} ${baseY})`}>
            <rect
              x={x}
              y={baseY - len}
              width={wid}
              height={len + 10}
              rx={wid / 2}
              fill={on ? color : '#232c44'}
              stroke={on ? '#fff' : color}
              strokeOpacity={on ? 1 : 0.55}
              strokeWidth={on ? 2 : 1.5}
              style={on ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}
            />
            {/* unha */}
            <rect x={x + wid * 0.22} y={baseY - len + 4} width={wid * 0.56} height={wid * 0.6} rx={wid * 0.25} fill="#fff" opacity={on ? 0.55 : 0.12} />
          </g>
        );
      })}
    </g>
  );
}

/** Ilustração das duas mãos destacando o dedo que deve teclar */
export const Hands = memo(function Hands({ active = [], showLabel = true, shift = false }: Props) {
  const main = active[0];
  const info = main ? FINGER_INFO[main] : null;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 296 175" className="h-auto w-full max-w-[18rem]">
        <Hand side="left" active={active} />
        <Hand side="right" active={active} />
      </svg>
      {showLabel && (
        <p className="mt-1 h-5 font-hud text-sm font-semibold text-white/70">
          {info ? (
            <>
              Use o <span style={{ color: info.color }}>{info.name.toLowerCase()}</span>
              {info.hand !== 'Ambas' ? ` da mão ${info.hand.toLowerCase()}` : ''}
              {shift ? ' + mínimo da outra mão no Shift' : ''}
            </>
          ) : (
            ' '
          )}
        </p>
      )}
    </div>
  );
});
