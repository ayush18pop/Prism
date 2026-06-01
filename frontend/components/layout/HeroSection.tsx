import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-black">
      {/* Video background — place hero-bg.mp4 in public/demo/ after recording */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-30"
      >
        <source src="/demo/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay so text stays readable */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-br from-black/80 via-black/40 to-black/60" />

      {/* Bottom-right vignette — covers Gemini watermark */}
      <div
        className="absolute bottom-0 right-0 z-[2] w-40 h-40 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 100% 100%, rgba(0,0,0,1) 0%, transparent 70%)' }}
      />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Navbar */}
      <nav className="relative z-[3] flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        {/* Brand */}
        <span className="font-display text-2xl tracking-tight text-white">
          Prism
        </span>

        {/* Nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-10 text-sm text-white/50">
          <a href="#pitch" className="hover:text-white/80 transition-colors">
            Protocol
          </a>
          <a
            href="#mechanism"
            className="hover:text-white/80 transition-colors"
          >
            How It Works
          </a>
          <a
            href="https://github.com/hyprayush/uhi9"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/80 transition-colors"
          >
            Docs
          </a>
        </div>

        {/* Launch App — simple link, no wallet state */}
        <Link
          href="/app"
          className="liquid-glass rounded-full px-5 py-2 text-sm text-white hover:scale-[1.03] transition-transform"
        >
          Launch App
        </Link>
      </nav>

      {/* Hero content */}
      <div className="relative z-[3] flex flex-col items-center justify-center text-center px-6 pt-24 pb-40">
        {/* Sponsor tags */}
        <div className="animate-fade-rise flex items-center gap-3 mb-10">
          <span className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/60 tracking-wide uppercase">
            Uniswap v4 Hook
          </span>
          <span className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/60 tracking-wide uppercase">
            Unichain Sepolia
          </span>
          <span className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/60 tracking-wide uppercase">
            Reactive Network
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display animate-fade-rise text-5xl sm:text-7xl md:text-8xl text-white max-w-5xl leading-[0.95] tracking-[-2px]">
          LP with zero
          <br />
          <span className="italic text-violet-300">impermanent loss.</span>
        </h1>

        {/* Subtext */}
        <p className="animate-fade-rise-delay mt-8 text-base sm:text-lg max-w-2xl leading-relaxed text-white/60">
          Every deposit splits into two tokens — one that earns fees with zero
          price risk, one that absorbs IL with USDC backing. Automated by
          Reactive Network. One transaction.
        </p>

        {/* CTA */}
        <a
          href="#app"
          className="animate-fade-rise-delay-2 liquid-glass mt-12 rounded-full px-14 py-5 text-base text-white hover:scale-[1.03] transition-transform inline-block"
        >
          Launch App
        </a>

        {/* Demo stat pills */}
        <div className="animate-fade-rise-delay-3 flex gap-8 mt-16 text-center">
          <Stat value="$0" label="IL on exit" />
          <Stat value="1 tx" label="per deposit" />
          <Stat value="1s" label="Unichain blocks" />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[3] animate-bounce opacity-40">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 8l5 5 5-5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl text-white">{value}</p>
      <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}
