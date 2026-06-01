export function PitchSection() {
  return (
    <section id="pitch" className="bg-zinc-950 px-6 py-32">
      <div className="mx-auto max-w-5xl">
        {/* Label */}
        <p className="text-xs text-white/30 uppercase tracking-[0.2em] mb-16 text-center">The problem</p>

        {/* Two columns */}
        <div className="grid md:grid-cols-[1fr_1px_1fr] gap-12 md:gap-0">
          {/* LP problem */}
          <div className="md:pr-16">
            <p className="font-display text-2xl text-white mb-6 leading-snug">
              The LP earns fees.<br />
              <span className="text-white/40">But loses to price.</span>
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              Every Uniswap LP is taking a bet they didn&apos;t sign up for. The moment price moves,
              they lose value relative to just holding — not because they did anything wrong,
              but because that&apos;s how AMMs work. There&apos;s no way to opt out of price risk
              while staying in the pool.
            </p>
          </div>

          {/* Divider */}
          <div className="hidden md:block bg-white/5" />

          {/* Project problem */}
          <div className="md:pl-16">
            <p className="font-display text-2xl text-white mb-6 leading-snug">
              The project needs liquidity.<br />
              <span className="text-white/40">But it keeps leaving.</span>
            </p>
            <p className="text-sm text-white/50 leading-relaxed">
              Liquidity mining works — until emissions stop. Then LPs leave. The liquidity
              was rented, not loyal. Every project is on a treadmill: print tokens, attract
              LPs, watch them exit when the incentive dries up. There&apos;s no mechanism for
              genuinely sticky liquidity.
            </p>
          </div>
        </div>

        {/* Resolution */}
        <div className="mt-24 text-center">
          <p className="font-display text-4xl md:text-5xl text-white leading-tight">
            These problems are mirror images.<br />
            <span className="italic text-violet-300">Prism solves both. In a single hook.</span>
          </p>
        </div>
      </div>
    </section>
  )
}
