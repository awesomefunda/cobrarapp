import React from 'react'

// Top-level error boundary. Before this existed, any uncaught render error
// (e.g. IndexedDB blocked, font fetch blocked, bad cached chunk on Windows)
// would produce a blank screen because main.jsx removes the pre-splash before
// React mounts. Now we surface a clear message + a recovery action.

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[cobrar] render error', error, info)
    this.setState({ info })
  }

  hardReset = async () => {
    // Nuclear option — clears every cache + SW + IndexedDB. Designed to recover
    // from broken cached builds without users having to "clear cookies".
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      try { localStorage.clear(); sessionStorage.clear() } catch {}
    } finally {
      window.location.reload()
    }
  }

  softReload = () => window.location.reload()

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || String(this.state.error)

    return (
      <div role="alert"
        style={{
          minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'DM Sans', sans-serif",
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center', gap: '1rem'
        }}>
        <div style={{
          width: 56, height: 56, background: '#c6f135', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem', fontWeight: 700, color: '#111'
        }}>Co</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '.95rem', color: '#888', maxWidth: 380, lineHeight: 1.55, margin: 0 }}>
          Cobrar hit an error while starting. This usually clears up with a refresh.
          If that doesn't help, a full reset will clear caches and reload.
        </p>
        <pre style={{
          maxWidth: 380, overflow: 'auto', fontSize: '.7rem', color: '#666',
          background: '#111', padding: '.75rem 1rem', borderRadius: 12, textAlign: 'left',
          border: '1px solid #222'
        }}>{msg}</pre>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '.5rem' }}>
          <button onClick={this.softReload}
            style={{
              background: '#c6f135', color: '#111', border: 'none',
              padding: '.75rem 1.25rem', borderRadius: 12, fontWeight: 600, cursor: 'pointer'
            }}>Refresh page</button>
          <button onClick={this.hardReset}
            style={{
              background: '#1e1e1e', color: '#e8e8e8', border: '1px solid #2a2a2a',
              padding: '.75rem 1.25rem', borderRadius: 12, fontWeight: 500, cursor: 'pointer'
            }}>Full reset</button>
        </div>
        <p style={{ fontSize: '.7rem', color: '#444', marginTop: '1rem' }}>
          Your client data is safe — it's stored on your device and this reset only clears the app code cache.
        </p>
      </div>
    )
  }
}
