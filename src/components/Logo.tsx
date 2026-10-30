interface Props {
  size?: 'sm' | 'lg';
}

export function Logo({ size = 'sm' }: Props) {
  const big = size === 'lg';
  return (
    <div className={`relative inline-flex items-center select-none ${big ? 'gap-3' : 'gap-2'}`}>
      <div className={`flex flex-col ${big ? 'gap-1.5' : 'gap-1'}`} aria-hidden>
        {[1, 0.7, 0.4].map((o, i) => (
          <span
            key={i}
            className="block h-[3px] rounded-full bg-gradient-to-r from-transparent to-blaze"
            style={{ width: (big ? 34 : 16) - i * (big ? 8 : 4), opacity: o, marginLeft: i * (big ? 8 : 4) }}
          />
        ))}
      </div>
      <span
        className={`font-display font-black italic leading-none tracking-tight ${big ? 'text-6xl sm:text-7xl md:text-8xl' : 'text-2xl'}`}
      >
        <span className="text-white">TYPE</span>
        <span className="text-blaze text-glow-blaze">CAR</span>
      </span>
    </div>
  );
}
