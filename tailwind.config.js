/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        asphalt: { 950: '#05070d', 900: '#0a0e18', 800: '#111726', 700: '#1a2236', 600: '#26304a' },
        volt: { DEFAULT: '#00d4ff', 400: '#33ddff', 600: '#00a6d6' },
        blaze: { DEFAULT: '#ff6a00', 400: '#ff8a33', 600: '#e05500' },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        hud: ['Rajdhani', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        streak: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        pulseGlow: { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
        caret: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.2' } },
      },
      animation: {
        streak: 'streak 1.2s linear infinite',
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
        caret: 'caret 1s steps(2) infinite',
      },
    },
  },
  plugins: [],
};
