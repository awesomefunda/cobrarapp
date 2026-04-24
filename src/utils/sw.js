// Re-export helpers for SW tests and plain callers.
// The actual registration happens via the `useRegisterSW` hook from
// `virtual:pwa-register/react` inside <UpdatePrompt />. This wrapper keeps that
// coupling out of the rest of the app and lets tests stub registration easily.

export const UPDATE_CHECK_INTERVAL_MS = 60 * 1000

// Build id is injected by Vite (see vite.config.js `define`). Falls back to
// 'dev' so tests and non-Vite tooling don't throw on import.
export const BUILD_ID =
  typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev' // eslint-disable-line no-undef

// Remember the build id that was live the last time the user visited. When it
// changes, we know a fresh deploy has landed — handy for the "what's new"
// banner even if the SW updated silently during a previous session.
export function getLastSeenBuildId() {
  try {
    return localStorage.getItem('cobrar:lastBuildId')
  } catch {
    return null
  }
}

export function setLastSeenBuildId(id) {
  try {
    localStorage.setItem('cobrar:lastBuildId', id)
  } catch { /* private mode / disabled storage */ }
}

export function didBuildChange() {
  const last = getLastSeenBuildId()
  return last !== null && last !== BUILD_ID
}
