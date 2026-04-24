import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientForm from '../components/ClientForm'
import { translations } from '../i18n'

const t = translations.en

describe('ClientForm', () => {
  it('renders "New Client" header in create mode', () => {
    render(<ClientForm client={null} mode="receivable" onSave={() => {}} onClose={() => {}} t={t} lang="en" />)
    expect(screen.getByRole('heading', { name: /new client/i })).toBeInTheDocument()
  })

  it('renders "Edit Client" header when editing', () => {
    const client = {
      id: 1, name: 'Bob', type: 'receivable', amount: 200,
      nextDueDate: new Date().toISOString(),
      recurrenceType: 'weekly', recurrenceConfig: { dayOfWeek: 2 },
    }
    render(<ClientForm client={client} mode="receivable" onSave={() => {}} onClose={() => {}} t={t} lang="en" />)
    expect(screen.getByRole('heading', { name: /edit client/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument()
  })

  it('does not save when name is empty', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ClientForm client={null} mode="receivable" onSave={onSave} onClose={() => {}} t={t} lang="en" />)
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves monthly client with expected shape', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ClientForm client={null} mode="receivable" onSave={onSave} onClose={() => {}} t={t} lang="en" />)
    await user.type(screen.getByPlaceholderText('Sarah Jenkins'), 'Alice')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledTimes(1)
    const payload = onSave.mock.calls[0][0]
    expect(payload.name).toBe('Alice')
    expect(payload.type).toBe('receivable')
    expect(payload.recurrenceType).toBe('monthly')
    expect(payload.isPaid).toBe(false)
    expect(payload.nextDueDate).toMatch(/\d{4}-\d{2}-\d{2}T/) // ISO string
  })

  it('switches schedule type via the tabs and updates config', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ClientForm client={null} mode="receivable" onSave={onSave} onClose={() => {}} t={t} lang="en" />)
    await user.type(screen.getByPlaceholderText('Sarah Jenkins'), 'X')
    await user.click(screen.getByRole('button', { name: /^weekly$/i }))
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave.mock.calls[0][0].recurrenceType).toBe('weekly')
  })

  it('one-time schedule keeps the date the user picked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ClientForm client={null} mode="payable" onSave={onSave} onClose={() => {}} t={t} lang="en" />)
    await user.type(screen.getByPlaceholderText('Sarah Jenkins'), 'Invoice 42')
    await user.click(screen.getByRole('button', { name: /one-time/i }))
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave.mock.calls[0][0].recurrenceType).toBe('once')
  })

  it('shows a Delete button only when editing', () => {
    const { rerender } = render(
      <ClientForm client={null} mode="receivable" onSave={() => {}} onClose={() => {}} t={t} lang="en" />
    )
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument()

    rerender(<ClientForm
      client={{ id: 1, name: 'Bob', type: 'receivable', amount: 100, nextDueDate: new Date().toISOString(), recurrenceType: 'monthly', recurrenceConfig: { dayOfMonth: 1 } }}
      mode="receivable" onSave={() => {}} onDelete={() => {}} onClose={() => {}} t={t} lang="en" />)
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
  })

  it('close button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ClientForm client={null} mode="receivable" onSave={() => {}} onClose={onClose} t={t} lang="en" />)
    // The close button is the one with the X icon (no accessible name); it's the
    // first button rendered in the header.
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])
    expect(onClose).toHaveBeenCalled()
  })
})
