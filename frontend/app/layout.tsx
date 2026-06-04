import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Prism: IL-Free LP on Uniswap v4',
  description: 'Split your LP position into LP-Y (zero IL) and LP-D (delta token). Demo on Unichain Sepolia.',
  openGraph: {
    title: 'Prism: LP with $0 impermanent loss',
    description: 'One Uniswap v4 hook. Two tokens. Zero IL deducted from your principal. Powered by Unichain + Reactive Network.',
    url: 'https://prism.uhi9.dev',
    siteName: 'Prism',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Prism: LP with $0 IL' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prism: LP with $0 IL',
    description: 'One Uniswap v4 hook. Two tokens. Zero IL deducted from your principal.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`} style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
