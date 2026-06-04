export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono,"JetBrains Mono",monospace)', fontSize: 48, color: 'var(--text-tertiary)', marginBottom: 12 }}>404</p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Page not found.</p>
        <a href="/" style={{ display: 'inline-block', marginTop: 16, fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>← Back home</a>
      </div>
    </div>
  )
}
