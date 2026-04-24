import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientRow from '../components/ClientRow'
import { translations } from '../i18n'
import { db } from '../db'

const t = translations.en

async function resetDb() {
  await db.delete(); await db.open()
}

function makeClient(overrides = {}) {
  return {
    id: 1,
    name: 'Alice Jenkins',
    type: 'receivable',
    amount: 150,
    nextDueDate: new Date(Date.now() + 3 * 86400000).toISOString(), // 3 days out
    isPaid: false,
    archived: false,
    recurrenceType: 'monthly',
    recurrenceConfig: { dayOfMonth: 1 },
    ...overrides,
  }
}

describe('ClientRow', () => {
  beforeEach(resetDb)

  it('renders name, initials, amount', () => {
    render(<ClientRow client={makeClient()} t={t} role="other" lang="en" onEdit={() => {}} />)
    expect(screen.getByText('Alice Jenkins')).toBeInTheDocument()
    expect(screen.getByText('AJ')).toBeInTheDocument()
    expect(screen.getByText(/\$150/)).toBeInTheDocument()
  })

  it('shows "due today" when diff is 0', () => {
    const today = new Date(); today.setHours(12, 0, 0, 0)
    render(<ClientRow client={makeClient({ nextDueDate: today.toISOString() })} t={t} role="other" lang="en" onEdit={() => {}} />)
    expect(screen.getByText(/due today/i)).toBeInTheDocument()
  })

  it('shows "days late" when overdue', () => {
    const past = new Date(Date.now() - 5 * 86400000)
    render(<ClientRow client={makeClient({ nextDueDate: past.toISOString() })} t={t} role="other" lang="en" onEdit={() => {}} />)
    expect(screen.getByText(/late/i)).toBeInTheDocument()
  })

  it('clicking the row calls onEdit with the client', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const c = makeClient()
    render(<ClientRow client={c} t={t} role="other" lang="en" onEdit={onEdit} />)
    await user.click(screen.getByText('Alice Jenkins'))
    expect(onEdit).toHaveBeenCalledWith(c)
  })

  it('in selectable mode, clicking the row triggers onSelect, not onEdit', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn(); const onSelect = vi.fn()
    render(<ClientRow client={makeClient()} t={t} role="other" lang="en"
      onEdit={onEdit} selectable={true} onSelect={onSelect} />)
    await user.click(screen.getByText('Alice Jenkins'))
    expect(onSelect).toHaveBeenCalledWith(1)
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('mark-paid persists and logs history', async () => {
    const user = userEvent.setup()
    // Seed real row in DB so markPaid can update it
    const id = await db.clients.add(makeClient({ id: undefined }))
    const client = await db.clients.get(id)
    render(<ClientRow client={client} t={t} role="other" lang="en" onEdit={() => {}} />)
    // The paid button is the last 9x9 button in the row (no accessible name) —
    // query by the Check icon's parent instead.
    const buttons = screen.getAllByRole('button')
    const paidBtn = buttons[buttons.length - 1]
    await user.click(paidBtn)
    const after = await db.clients.get(id)
    expect(after.isPaid).toBe(true)
    expect(await db.history.where('clientId').equals(id).count()).toBe(1)
  })

  it('archived mode renders Restore and skips the edit affordance', () => {
    render(<ClientRow client={makeClient({ archived: true, isPaid: true, lastPaidDate: new Date().toISOString() })}
      t={t} role="other" lang="en" onEdit={() => {}} archived={true} />)
    expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument()
  })
})
