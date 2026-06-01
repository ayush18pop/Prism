'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white font-bold text-sm">
            P
          </div>
          <div>
            <span className="font-semibold text-white">Prism</span>
            <span className="ml-2 text-xs text-zinc-500">IL-Free LP · Unichain Sepolia</span>
          </div>
        </div>
        <ConnectButton chainStatus="icon" showBalance={false} />
      </div>
    </header>
  )
}
