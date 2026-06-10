import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter            = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono    = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const instrumentSerif  = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Prism — The IL Options Market',
  description: 'LPs sell impermanent loss risk. Protocols compete to buy it. The Uniswap v4 hook clears the market in one block.',
  openGraph: {
    title: 'Prism — The IL Options Market',
    description: 'One hook. Two tokens. A two-sided market for impermanent loss risk. Built on Uniswap v4, deployed on Unichain Sepolia.',
    url: 'https://prism.uhi9.dev',
    siteName: 'Prism',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Prism: The IL Options Market' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prism — The IL Options Market',
    description: 'LPs sell IL risk. Protocols buy it. The hook settles it in one block.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
        style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
