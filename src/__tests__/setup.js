// Global test setup. Runs before every test file.
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Clean up DOM after each test so tests can't leak into each other
afterEach(() => {
  cleanup()
})

// Reset the fake IndexedDB between test files so Dexie opens fresh each time
beforeEach(async () => {
  const { IDBFactory } = await import('fake-indexeddb')
  // eslint-disable-next-line no-undef
  globalThis.indexedDB = new IDBFactory()
})

// Stub APIs that jsdom doesn't implement but our code touches
if (typeof navigator !== 'undefined') {
  if (!('vibrate' in navigator)) {
    Object.defineProperty(navigator, 'vibrate', { value: vi.fn(() => true), configurable: true })
  }
}
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, media: '', addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null,
  }))
  // jsdom doesn't implement scrollTo
  window.scrollTo = window.scrollTo || (() => {})
  // URL.createObjectURL used by BackupBanner fallback
  if (!window.URL.createObjectURL) window.URL.createObjectURL = vi.fn(() => 'blob:mock')
  if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = vi.fn()
}

// Silence the expected console.error that React logs when ErrorBoundary test triggers
const origError = console.error
console.error = (...args) => {
  const first = args[0]
  if (typeof first === 'string' && (
    first.includes('React will try to recreate this component tree') ||
    first.includes('Error: Uncaught [Error: boom')
  )) return
  origError(...args)
}
