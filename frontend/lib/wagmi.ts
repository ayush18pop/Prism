import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { unichainSepolia } from './chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'Prism — IL-Free LP',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'prism-demo',
  chains: [unichainSepolia],
  ssr: true,
})
