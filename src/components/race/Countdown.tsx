import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  /** 3,2,1 durante a contagem; 0 = GO; null = oculto */
  value: number | null;
}

export function Countdown({ value }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <AnimatePresence mode="popLayout">
        {value !== null && (
          <motion.div
            key={value}
            initial={{ scale: 2.4, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`font-display font-black italic leading-none ${
              value === 0
                ? 'text-7xl sm:text-9xl text-emerald-400 [text-shadow:0_0_40px_rgba(52,211,153,0.9)]'
                : 'text-8xl sm:text-[10rem] text-white [text-shadow:0_0_40px_rgba(255,106,0,0.9)]'
            }`}
          >
            {value === 0 ? 'GO!' : value}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
