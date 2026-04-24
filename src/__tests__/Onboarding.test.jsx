import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Onboarding from '../components/Onboarding'

describe('Onboarding', () => {
  it('renders English copy by default', () => {
    render(<Onboarding onComplete={() => {}} lang="en" />)
    expect(screen.getByText(/get paid on time/i)).toBeInTheDocument()
    expect(screen.getByText(/what best describes you/i)).toBeInTheDocument()
  })

  it('renders Spanish copy when lang=es', () => {
    render(<Onboarding onComplete={() => {}} lang="es" />)
    expect(screen.getByText(/cobra a tiempo/i)).toBeInTheDocument()
    expect(screen.getByText(/cómo te describes/i)).toBeInTheDocument()
  })

  it('CTA is disabled until a role is picked', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} lang="en" />)
    const cta = screen.getByRole('button', { name: /enter cobrar/i })
    expect(cta).toBeDisabled()
    // Clicking disabled button should not call onComplete
    await user.click(cta)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('enables CTA and submits with chosen role', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} lang="en" />)
    await user.click(screen.getByRole('button', { name: /gardener/i }))
    const cta = screen.getByRole('button', { name: /enter cobrar/i })
    expect(cta).toBeEnabled()
    await user.click(cta)
    expect(onComplete).toHaveBeenCalledWith('gardener')
  })

  it('keyboard: Enter submits when a role is selected', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} lang="en" />)
    await user.click(screen.getByRole('button', { name: /landlord/i }))
    await user.keyboard('{Enter}')
    expect(onComplete).toHaveBeenCalledWith('landlord')
  })

  it('keyboard: Enter is a no-op when nothing selected', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete} lang="en" />)
    await user.keyboard('{Enter}')
    expect(onComplete).not.toHaveBeenCalled()
  })
})
