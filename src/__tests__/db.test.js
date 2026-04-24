import { describe, it, expect, beforeEach } from 'vitest'
import {
  db,
  getSetting, setSetting,
  addClient, deleteClient, bulkDeleteClients,
  markPaid, markUnpaid, logReminder, deleteHistoryEntry,
  archivePaidClients, restoreClient,
  calcNextDue, exportMonthCSV,
} from '../db'

// fake-indexeddb is wired up in setup.js. Dexie will open on first use.

async function resetDb() {
  await db.delete()
  await db.open()
}

describe('settings', () => {
  beforeEach(resetDb)

  it('returns fallback when key missing', async () => {
    expect(await getSetting('missing', 'fallback')).toBe('fallback')
  })

  it('round-trips values', async () => {
    await setSetting('foo', { a: 1 })
    expect(await getSetting('foo')).toEqual({ a: 1 })
  })

  it('overwrites on put', async () => {
    await setSetting('k', 'v1')
    await setSetting('k', 'v2')
    expect(await getSetting('k')).toBe('v2')
  })
})

describe('clients CRUD', () => {
  beforeEach(resetDb)

  it('adds a client with defaults', async () => {
    const id = await addClient({ name: 'Alice', type: 'receivable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly' })
    const c = await db.clients.get(id)
    expect(c.name).toBe('Alice')
    expect(c.isPaid).toBe(false)
    expect(c.lastPaidDate).toBeNull()
    expect(c.createdAt).toBeTypeOf('number')
  })

  it('deletes a client and its history', async () => {
    const id = await addClient({ name: 'Bob', type: 'payable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly' })
    await logReminder(id)
    expect(await db.history.where('clientId').equals(id).count()).toBe(1)
    await deleteClient(id)
    expect(await db.clients.get(id)).toBeUndefined()
    expect(await db.history.where('clientId').equals(id).count()).toBe(0)
  })

  it('bulk deletes clients and their history', async () => {
    const ids = []
    for (const n of ['A', 'B', 'C']) {
      ids.push(await addClient({ name: n, type: 'receivable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly' }))
    }
    await logReminder(ids[0]); await logReminder(ids[1])
    await bulkDeleteClients([ids[0], ids[1]])
    expect(await db.clients.count()).toBe(1)
    expect(await db.history.count()).toBe(0)
  })
})

describe('markPaid / markUnpaid / logReminder', () => {
  beforeEach(resetDb)

  it('marks paid, advances nextDueDate, logs history', async () => {
    const today = new Date()
    const id = await addClient({
      name: 'Rent', type: 'payable',
      nextDueDate: today.toISOString(),
      recurrenceType: 'monthly',
      recurrenceConfig: { dayOfMonth: 1 },
      amount: 1000,
    })
    await markPaid(id)
    const c = await db.clients.get(id)
    expect(c.isPaid).toBe(true)
    expect(c.lastPaidDate).toBeTypeOf('string')
    expect(new Date(c.nextDueDate)).toBeInstanceOf(Date)
    // Next due should be in the future
    expect(new Date(c.nextDueDate).getTime()).toBeGreaterThan(Date.now() - 1000)
    const hist = await db.history.toArray()
    expect(hist).toHaveLength(1)
    expect(hist[0].action).toBe('paid')
    expect(hist[0].amount).toBe(1000)
  })

  it('markUnpaid reverts isPaid flag', async () => {
    const id = await addClient({ name: 'X', type: 'receivable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly' })
    await markPaid(id)
    await markUnpaid(id)
    expect((await db.clients.get(id)).isPaid).toBe(false)
  })

  it('logReminder appends a history row without modifying the client', async () => {
    const id = await addClient({ name: 'Y', type: 'receivable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly' })
    await logReminder(id)
    const hist = await db.history.toArray()
    expect(hist).toHaveLength(1)
    expect(hist[0].action).toBe('reminded')
    expect((await db.clients.get(id)).isPaid).toBe(false)
  })

  it('deleteHistoryEntry removes just that entry', async () => {
    const id = await addClient({ name: 'Z', type: 'receivable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly' })
    await logReminder(id); await logReminder(id)
    const entries = await db.history.toArray()
    await deleteHistoryEntry(entries[0].id)
    expect(await db.history.count()).toBe(1)
  })
})

describe('archive / restore', () => {
  beforeEach(resetDb)

  it('archives only paid clients and returns a count', async () => {
    const paidId = await addClient({ name: 'P', type: 'receivable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly' })
    const unpaidId = await addClient({ name: 'U', type: 'receivable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly' })
    await markPaid(paidId)
    const n = await archivePaidClients()
    expect(n).toBe(1)
    expect((await db.clients.get(paidId)).archived).toBe(true)
    expect((await db.clients.get(unpaidId)).archived).toBeFalsy()
  })

  it('restoreClient un-archives and resets isPaid', async () => {
    const id = await addClient({ name: 'R', type: 'receivable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly' })
    await markPaid(id); await archivePaidClients()
    await restoreClient(id)
    const c = await db.clients.get(id)
    expect(c.archived).toBe(false)
    expect(c.isPaid).toBe(false)
  })
})

describe('calcNextDue', () => {
  it('monthly: dayOfMonth="last" picks last day of the month', () => {
    const d = calcNextDue(new Date('2026-01-15'), 'monthly', { dayOfMonth: 'last' })
    // Jan 15 → advance one month → last day of February
    expect(d.getMonth()).toBe(1) // February (0-indexed)
    // 2026 is not a leap year — Feb has 28 days
    expect(d.getDate()).toBe(28)
  })

  it('monthly: dayOfMonth=31 clamps to last valid day in shorter months', () => {
    const d = calcNextDue(new Date('2026-01-31'), 'monthly', { dayOfMonth: 31 })
    // Jan 31 → advance one month → Feb doesn't have 31, clamps to 28
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(28)
  })

  it('weekly: lands on requested dayOfWeek, not today', () => {
    const sunday = new Date('2026-04-26') // Sunday
    const d = calcNextDue(sunday, 'weekly', { dayOfWeek: 0 }) // also Sunday
    // Same day → should advance 7 days, not stay same
    expect(d.getDay()).toBe(0)
    expect(d.getDate()).toBe(sunday.getDate() + 7)
  })

  it('weekly: picks the next matching dow when different', () => {
    const mon = new Date('2026-04-27')
    const d = calcNextDue(mon, 'weekly', { dayOfWeek: 3 }) // Wednesday
    expect(d.getDay()).toBe(3)
  })

  it('biweekly: adds exactly 14 days', () => {
    const src = new Date('2026-04-01')
    const d = calcNextDue(src, 'biweekly')
    expect(d.getTime() - src.getTime()).toBe(14 * 24 * 60 * 60 * 1000)
  })

  it('once: returns the original date untouched', () => {
    const src = new Date('2026-05-20')
    const d = calcNextDue(src, 'once')
    expect(d.getTime()).toBe(src.getTime())
  })
})

describe('exportMonthCSV', () => {
  beforeEach(resetDb)

  it('produces a header row + rows for entries in range', async () => {
    const id = await addClient({ name: 'Test', type: 'receivable', nextDueDate: new Date().toISOString(), recurrenceType: 'monthly', amount: 50 })
    await markPaid(id)
    const now = new Date()
    const csv = await exportMonthCSV(now.getFullYear(), now.getMonth())
    const [header, ...rows] = csv.split('\n')
    expect(header).toBe('Date,Client,Type,Action,Amount')
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0]).toContain('Test')
    expect(rows[0]).toContain('paid')
  })

  it('returns just the header when no entries in range', async () => {
    const csv = await exportMonthCSV(2000, 0)
    expect(csv).toBe('Date,Client,Type,Action,Amount')
  })
})
