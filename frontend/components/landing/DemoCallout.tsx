'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

export function DemoCallout() {
  const { ref, inView } = useInView()

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={cn('relative overflow-hidden bg-black px-6 py-40 scroll-hidden', inView && 'scroll-visible')}
    >
      {/* Violet glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-xs text-white/30 uppercase tracking-[0.2em] mb-8">What a real drawdown looks like</p>

        {/* The outcome — what the LP paid */}
        <p className="font-display text-[10rem] md:text-[14rem] text-white leading-none tracking-tight">
          $0
        </p>

        <p className="font-display text-2xl md:text-3xl text-white/50 mt-4 mb-6">
          impermanent loss.
        </p>
        <p className="font-display text-2xl md:text-3xl text-white">
          ETH fell 25%. The loss was $412. The LP-D vault absorbed it.
        </p>

        <p className="mt-8 text-sm text-white/30 max-w-lg mx-auto leading-relaxed">
          An LP deposits $10,000 at $2,000 ETH. Price falls to $1,500.
          A standard Uniswap LP exits with $412 less than they put in.
          The Prism LP? The hook computes $412 in IL at withdrawal,
          draws it from the LP-D collateral vault, and settles atomically.
          The LP withdraws $10,000 plus every fee they earned. Principal intact.
        </p>

        <Link
          href="/app"
          className="liquid-glass inline-block mt-12 rounded-full px-14 py-5 text-base text-white hover:scale-[1.03] transition-transform"
        >
          Try the demo on Unichain Sepolia →
        </Link>
      </div>
    </section>
  )
}
