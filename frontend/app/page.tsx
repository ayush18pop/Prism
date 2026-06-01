import { HeroSection } from '@/components/layout/HeroSection'
import { PitchSection } from '@/components/landing/PitchSection'
import { MechanismSection } from '@/components/landing/MechanismSection'
import { DemoCallout } from '@/components/landing/DemoCallout'

export default function LandingPage() {
  return (
    <main>
      <HeroSection />
      <PitchSection />
      <MechanismSection />
      <DemoCallout />
      <footer className="border-t border-white/5 bg-black py-8 text-center">
        <p className="text-xs text-white/20 tracking-[0.15em] uppercase">
          Built for UHI9 · Unichain Sepolia · Reactive Network
        </p>
        <div className="mt-3 flex justify-center gap-6 text-xs text-white/30">
          <a href="/demo/prism-whitepaper.pdf" className="hover:text-white/60 transition-colors">Whitepaper</a>
          <a href="https://github.com/hyprayush/uhi9" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">GitHub</a>
          <a href="/app" className="hover:text-white/60 transition-colors">Launch App</a>
        </div>
      </footer>
    </main>
  )
}
