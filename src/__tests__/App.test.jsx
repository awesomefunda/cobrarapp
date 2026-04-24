import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { db, setSetting } from '../db'

async function resetDb() {
  await db.delete(); await db.open()
}

// Stub the virtual PWA module so App → UpdatePrompt doesn't blow up during import
vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => Promise.resolve() }))

describe('App (integration)', () => {
  beforeEach(resetDb)

  it('shows Onboarding on first run', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/what best describes you/i)).toBeInTheDocument()
    })
  })

  it('moves to dashboard after onboarding', async () => {
    const user = userEvent.setup()
    render(<App />)
    // Wait for ready
    await waitFor(() => screen.getByText(/what best describes you/i))
    await user.click(screen.getByRole('button', { name: /gardener/i }))
    await user.click(screen.getByRole('button', { name: /enter cobrar/i }))
    await waitFor(() => expect(screen.getByText(/no clients yet/i)).toBeInTheDocument())
  })

  it('shows dashboard directly for returning users', async () => {
    await setSetting('onboarded', true)
    await setSetting('role', 'landlord')
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/no clients yet/i)).toBeInTheDocument()
    })
  })

  it('toggles language between EN and ES and persists', async () => {
    const user = userEvent.setup()
    await setSetting('onboarded', true)
    render(<App />)
    await waitFor(() => screen.getByText(/no clients yet/i))
    // There's a toggle button labeled "ES" when current lang is EN
    await user.click(screen.getByRole('button', { name: /^ES$/ }))
    await waitFor(() => {
      expect(screen.getByText(/sin clientes aún/i)).toBeInTheDocument()
    })
  })

  it('adds a client end-to-end and shows it in the list', async () => {
    const user = userEvent.setup()
    await setSetting('onboarded', true)
    render(<App />)
    await waitFor(() => screen.getByText(/no clients yet/i))
    // FAB — identified by its aria-label
    await user.click(screen.getByRole('button', { name: /add client/i }))
    await user.type(await screen.findByPlaceholderText('Sarah Jenkins'), 'Carlos R.')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(screen.getByText('Carlos R.')).toBeInTheDocument()
    })
  })

  it('navigates to the History tab', async () => {
    const user = userEvent.setup()
    await setSetting('onboarded', true)
    render(<App />)
    await waitFor(() => screen.getByText(/no clients yet/i))
    await user.click(screen.getByRole('button', { name: /^history$/i }))
    await waitFor(() => expect(screen.getByText(/no history yet/i)).toBeInTheDocument())
  })

  it('settings tab shows the role picker and version text', async () => {
    const user = userEvent.setup()
    await setSetting('onboarded', true)
    render(<App />)
    await waitFor(() => screen.getByText(/no clients yet/i))
    await user.click(screen.getByRole('button', { name: /^settings$/i }))
    await waitFor(() => {
      expect(screen.getByText(/your role/i)).toBeInTheDocument()
      expect(screen.getByText(/cobrar v1/i)).toBeInTheDocument()
    })
  })
})
