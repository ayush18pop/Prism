import { TabNav } from '@/components/layout/TabNav'
import { NetworkGuard } from '@/components/layout/NetworkGuard'
import { Toaster } from 'sonner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <NetworkGuard />
      <TabNav />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            borderRadius: 0,
          },
          actionButtonStyle: {
            background: 'var(--border-strong)',
            color: 'var(--text-primary)',
            borderRadius: 0,
            fontSize: 11,
            fontWeight: 500,
            padding: '4px 10px',
            cursor: 'pointer',
          },
        }}
      />
      <main suppressHydrationWarning style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  )
}
