import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { unichainSepolia } from './chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'Prism: IL-Free LP',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '08e60448af2021ec2fe08325d7eee43a',
  chains: [unichainSepolia],
  ssr: true,
})
