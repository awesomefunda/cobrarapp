import React, { useEffect, useState } from 'react'
import { RefreshCw, Sparkles, X } from 'lucide-react'
import { UPDATE_CHECK_INTERVAL_MS, BUILD_ID, getLastSeenBuildId, setLastSeenBuildId } from '../utils/sw'

// In production Vite resolves `virtual:pwa-register` at build time. In tests or
// environments without the PWA plugin, we simply skip SW registration. Using a
// runtime dynamic import (inside an effect) keeps the test environment happy —
// vitest doesn't have to resolve a virtual module.

export default function UpdatePrompt({ lang = 'en' }) {
  const es = lang === 'es'

  const [needRefresh, setNeedRefresh] = useState(false)
  const [updater, setUpdater] = useState(null) // () => Promise — triggers SW skipWaiting + reload

  useEffect(() => {
    // Never try to register SW during tests / dev
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (import.meta.env?.DEV) return
    if (import.meta.env?.MODE === 'test') return

    let cancelled = false
    let pollTimer

    // eslint-disable-next-line import/no-unresolved
    import('virtual:pwa-register').then(({ registerSW }) => {
      if (cancelled) return

      const update = registerSW({
        immediate: true,
        onNeedRefresh() {
          setNeedRefresh(true)
        },
        onRegisteredSW(_swUrl, reg) {
          if (!reg) return
          const poll = () => reg.update().catch(() => {})
          pollTimer = setInterval(poll, UPDATE_CHECK_INTERVAL_MS)
          window.addEventListener('focus', poll)
          window.addEventListener('online', poll)
        },
        onRegisterError(err) {
          console.warn('[sw] registration error', err)
        },
      })

      // update() → Promise; calling with true triggers reload after skipWaiting
      setUpdater(() => () => update(true))
    }).catch((err) => {
      console.warn('[sw] virtual module not available', err)
    })

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [])

  // "Fresh install" / "updated since last visit" detection — runs once on mount.
  // Independent of the SW update flow: even if the user refreshed manually,
  // we can still greet them with a subtle "you're on the new version" toast.
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  useEffect(() => {
    const last = getLastSeenBuildId()
    if (last && last !== BUILD_ID) {
      setShowWhatsNew(true)
    }
    setLastSeenBuildId(BUILD_ID)
  }, [])

  const onUpdateClick = () => {
    if (updater) updater()
    else window.location.reload()
  }

  // --- render ------------------------------------------------------------
  if (needRefresh) {
    return (
      <div role="status" aria-live="polite"
        className="fixed top-4 left-4 right-4 max-w-[398px] mx-auto z-[60] p-3 rounded-2xl flex items-center gap-3 slide-down"
        style={{ background: 'var(--lime)', color: '#111', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
        <Sparkles size={16} strokeWidth={2.5} />
        <p className="flex-1 text-xs font-body font-medium leading-tight">
          {es ? 'Nueva versión disponible' : 'New version available'}
        </p>
        <button
          onClick={onUpdateClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-medium"
          style={{ background: '#111', color: 'var(--lime)' }}>
          <RefreshCw size={12} strokeWidth={2.5} />
          {es ? 'Actualizar' : 'Update'}
        </button>
        <button onClick={() => setNeedRefresh(false)}
          aria-label={es ? 'Cerrar' : 'Dismiss'}
          className="w-6 h-6 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(0,0,0,0.1)' }}>
          <X size={12} strokeWidth={2.5} />
        </button>
      </div>
    )
  }

  if (showWhatsNew) {
    return (
      <div role="status" aria-live="polite"
        className="fixed top-4 left-4 right-4 max-w-[398px] mx-auto z-[55] p-3 rounded-2xl flex items-center gap-3 slide-down"
        style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid rgba(198,241,53,0.25)' }}>
        <Sparkles size={14} color="var(--lime)" strokeWidth={2.5} />
        <p className="flex-1 text-xs font-body">
          {es ? '¡Estás en la versión más reciente!' : "You're on the latest version."}
        </p>
        <button onClick={() => setShowWhatsNew(false)}
          aria-label={es ? 'Cerrar' : 'Dismiss'}
          className="w-6 h-6 flex items-center justify-center rounded-full"
          style={{ background: 'var(--surface-3)' }}>
          <X size={12} color="var(--text-secondary)" />
        </button>
      </div>
    )
  }

  return null
}
