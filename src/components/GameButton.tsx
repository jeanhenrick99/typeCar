import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { audio } from '../lib/audio';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg' | 'xl';
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-blaze-600 via-blaze to-blaze-400 text-white shadow-[0_0_30px_rgba(255,106,0,0.45)] hover:shadow-[0_0_50px_rgba(255,106,0,0.7)]',
  secondary:
    'bg-asphalt-800/80 text-white border border-volt/40 hover:border-volt hover:bg-volt/10 shadow-[0_0_20px_rgba(0,212,255,0.12)] hover:shadow-[0_0_30px_rgba(0,212,255,0.35)]',
  ghost: 'bg-white/5 text-white/80 hover:text-white hover:bg-white/10 border border-white/10',
};

const SIZES = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
  xl: 'px-10 sm:px-14 py-4 sm:py-5 text-lg sm:text-xl',
};

export function GameButton({ children, onClick, variant = 'primary', size = 'lg', className = '', disabled, icon }: Props) {
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { scale: 1.04, x: 2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onHoverStart={() => !disabled && audio.hover()}
      onClick={() => {
        if (disabled) return;
        audio.unlock();
        audio.click();
        onClick?.();
      }}
      disabled={disabled}
      className={`group relative skew-panel font-display font-bold uppercase tracking-[0.18em] transition-[box-shadow,background-color,border-color] duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-3">
        {icon}
        {children}
      </span>
      {variant === 'primary' && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="absolute -left-1/2 top-0 h-full w-1/3 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 group-hover:translate-x-[400%]" />
        </span>
      )}
    </motion.button>
  );
}
