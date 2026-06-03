export function MechanismSection() {
  return (
    <section id="mechanism" className="bg-black px-6 py-32">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs text-white/30 uppercase tracking-[0.2em] mb-4 text-center">How it works</p>
        <p className="font-display text-4xl md:text-5xl text-white text-center mb-20 leading-tight">
          One deposit.<br />
          <span className="text-white/30">Two tokens. Zero IL.</span>
        </p>

        {/* Three columns */}
        <div className="grid md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden">
          <Step
            number="01"
            accent="text-white/40"
            headline="LP deposits"
            body="An LP provides liquidity to a Prism pool exactly as they would on Uniswap. One transaction. Nothing different."
            tag="afterAddLiquidity"
          />
          <Step
            number="02"
            accent="text-violet-400"
            headline="Hook splits the position"
            body="The hook mints two tokens. LP-Y earns a protocol-set share of swap fees with zero IL. LP-D earns its share too — plus USDC collateral that pays out only if the LP exits with losses. Both tokens earn."
            tag="LP-Y · LP-D"
          />
          <Step
            number="03"
            accent="text-emerald-400"
            headline="LP exits whole"
            body="When the LP removes liquidity, any IL is drawn from the LP-D vault. The LP receives their full value. The project keeps their liquidity loyal."
            tag="IL = $0"
          />
        </div>

        {/* Standing bid callout */}
        <div className="mt-16 border border-amber-500/10 bg-amber-500/[0.03] rounded-2xl px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p className="text-xs text-amber-400/60 uppercase tracking-[0.2em] mb-2">Standing Bid</p>
              <p className="font-display text-2xl text-white leading-snug">
                The project pre-deposits USDC once.<br />
                <span className="text-white/50">Every LP deposit auto-fills in the same block.</span>
              </p>
            </div>
            <div className="md:w-72 text-sm text-white/40 leading-relaxed space-y-3">
              <p>
                The project gets sticky liquidity without printing tokens or running incentive programs.
                LPs stay because the IL is covered, not because the yield is temporarily inflated.
              </p>
              <p>
                LP-D buyers earn their fee share on liquidity they didn&apos;t have to provide —
                and their collateral returns if price barely moves. It is insurance underwriting:
                collect the premium, pay out only when the event occurs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Step({ number, accent, headline, body, tag }: {
  number: string
  accent: string
  headline: string
  body: string
  tag: string
}) {
  return (
    <div className="bg-black px-8 py-10">
      <p className={`font-display text-5xl mb-6 ${accent}`}>{number}</p>
      <p className="text-white font-medium mb-3">{headline}</p>
      <p className="text-sm text-white/40 leading-relaxed mb-6">{body}</p>
      <code className="text-xs text-white/20 font-mono">{tag}</code>
    </div>
  )
}
