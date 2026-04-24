import { describe, it, expect, beforeEach } from 'vitest'
import { getLastSeenBuildId, setLastSeenBuildId, didBuildChange, BUILD_ID } from '../utils/sw'

describe('sw build-id helpers', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing has been recorded', () => {
    expect(getLastSeenBuildId()).toBeNull()
  })

  it('round-trips the id', () => {
    setLastSeenBuildId('abc')
    expect(getLastSeenBuildId()).toBe('abc')
  })

  it('didBuildChange is false on first visit (no prior id)', () => {
    expect(didBuildChange()).toBe(false)
  })

  it('didBuildChange is false when last == current', () => {
    setLastSeenBuildId(BUILD_ID)
    expect(didBuildChange()).toBe(false)
  })

  it('didBuildChange is true when last != current', () => {
    setLastSeenBuildId('some-old-build-id')
    expect(didBuildChange()).toBe(true)
  })

  it('setLastSeenBuildId swallows errors from disabled storage', () => {
    const orig = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { setItem() { throw new Error('blocked') }, getItem() { return null }, clear() {} },
    })
    try {
      expect(() => setLastSeenBuildId('x')).not.toThrow()
      expect(getLastSeenBuildId()).toBeNull()
    } finally {
      Object.defineProperty(window, 'localStorage', orig)
    }
  })
})
