import Link from 'next/link'

export function DemoCallout() {
  return (
    <section className="relative overflow-hidden bg-black px-6 py-40">
      {/* Violet glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-xs text-white/30 uppercase tracking-[0.2em] mb-8">Demo scenario</p>

        {/* The outcome — what the LP paid */}
        <p className="font-display text-[10rem] md:text-[14rem] text-white leading-none tracking-tight">
          $0
        </p>

        <p className="font-display text-2xl md:text-3xl text-white/50 mt-4 mb-6">
          IL deducted from the LP.
        </p>
        <p className="font-display text-2xl md:text-3xl text-white">
          Price dropped 25%. The vault covered it.
        </p>

        <p className="mt-8 text-sm text-white/30 max-w-lg mx-auto leading-relaxed">
          ETH falls from $2,000 to $1,500. The LP removes liquidity.
          The IL is drawn from the LP-D collateral vault — not from the LP&apos;s principal.
          The LP exits with full value.
        </p>

        <Link
          href="/app"
          className="liquid-glass inline-block mt-12 rounded-full px-14 py-5 text-base text-white hover:scale-[1.03] transition-transform"
        >
          See it live →
        </Link>
      </div>
    </section>
  )
}
