import { describe, it, expect } from 'vitest'
import { translations } from '../i18n'

describe('i18n', () => {
  it('has en and es', () => {
    expect(translations.en).toBeDefined()
    expect(translations.es).toBeDefined()
  })

  it('both locales share the same keys (prevents untranslated strings)', () => {
    const enKeys = Object.keys(translations.en).sort()
    const esKeys = Object.keys(translations.es).sort()
    expect(esKeys).toEqual(enKeys)
  })

  it('daysLate and daysUntil handle singular and plural', () => {
    expect(translations.en.daysLate(1)).toBe('1 day late')
    expect(translations.en.daysLate(3)).toBe('3 days late')
    expect(translations.en.daysUntil(1)).toBe('in 1 day')
    expect(translations.es.daysLate(1)).toContain('1')
  })

  it('reminderMsg chooses a template per role', () => {
    const msg = translations.en.reminderMsg('Alice', 100, 'May 1', 'landlord')
    expect(msg).toContain('Alice')
    expect(msg).toContain('$100')
    expect(msg.toLowerCase()).toContain('rent')
  })

  it('reminderMsg falls back to "other" for unknown roles', () => {
    const msg = translations.en.reminderMsg('Alice', 100, 'May 1', 'unknown')
    expect(msg).toContain('Alice')
  })

  it('all localized day arrays have exactly 7 entries', () => {
    expect(translations.en.days).toHaveLength(7)
    expect(translations.es.days).toHaveLength(7)
  })

  it('all function-valued keys in en are also functions in es (same shape)', () => {
    for (const key of Object.keys(translations.en)) {
      expect(typeof translations.es[key]).toBe(typeof translations.en[key])
    }
  })
})
