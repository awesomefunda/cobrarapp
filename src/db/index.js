import Dexie from 'dexie'

export const db = new Dexie('CobrarDB')

// recurrenceType: 'monthly' | 'weekly' | 'biweekly' | 'once'
// recurrenceConfig: { dayOfMonth: 1–31|'last' } | { dayOfWeek: 0–6 } | {}
// type: 'receivable' (they owe me) | 'payable' (I owe them)
db.version(1).stores({
  settings: 'key',
  clients: '++id, type, name, nextDueDate, isPaid, archived, recurrenceType',
  history: '++id, clientId, timestamp, action'
})

// type: 'receivable' (they owe me) | 'payable' (I owe them)
// action: 'paid' | 'reminded'

export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key)
  return row ? row.value : fallback
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}

export async function addClient(client) {
  return db.clients.add({
    ...client,
    createdAt: Date.now(),
    isPaid: false,
    lastPaidDate: null,
  })
}

export async function markPaid(clientId) {
  const client = await db.clients.get(clientId)
  if (!client) return
  const now = new Date()
  const next = calcNextDue(now, client.recurrenceType || 'monthly', client.recurrenceConfig || {})
  await db.clients.update(clientId, {
    isPaid: true,
    lastPaidDate: now.toISOString(),
    nextDueDate: next.toISOString(),
  })
  await db.history.add({
    clientId,
    timestamp: now.toISOString(),
    action: 'paid',
    amount: client.amount
  })
  if (navigator.vibrate) navigator.vibrate([30, 10, 30])
}

export async function markUnpaid(clientId) {
  await db.clients.update(clientId, { isPaid: false })
}

export async function logReminder(clientId) {
  await db.history.add({
    clientId,
    timestamp: new Date().toISOString(),
    action: 'reminded'
  })
}

export async function deleteClient(clientId) {
  await db.clients.delete(clientId)
  await db.history.where('clientId').equals(clientId).delete()
}

export async function bulkDeleteClients(ids) {
  await db.transaction('rw', db.clients, db.history, async () => {
    await db.clients.bulkDelete(ids)
    for (const id of ids) {
      await db.history.where('clientId').equals(id).delete()
    }
  })
}

// Delete a single history log entry (keeps the client intact)
export async function deleteHistoryEntry(id) {
  await db.history.delete(id)
}

// Archive all currently-paid clients (hides from dashboard, data stays in DB)
export async function archivePaidClients() {
  const paid = await db.clients.filter(c => c.isPaid && !c.archived).toArray()
  const ids = paid.map(c => c.id)
  if (ids.length) await db.clients.where('id').anyOf(ids).modify({ archived: true })
  return ids.length
}

// Restore a single archived client back to the active dashboard
export async function restoreClient(clientId) {
  await db.clients.update(clientId, { archived: false, isPaid: false })
}

/**
 * Compute the next due date after `fromDate` given recurrence settings.
 * recurrenceType: 'monthly' | 'weekly' | 'biweekly' | 'once'
 * recurrenceConfig:
 *   monthly  → { dayOfMonth: 1–31 | 'last' }
 *   weekly   → { dayOfWeek: 0–6 }  (0 = Sunday)
 *   biweekly → {}
 *   once     → {}  (no recurrence; nextDueDate stays as-is)
 */
export function calcNextDue(fromDate, recurrenceType, recurrenceConfig = {}) {
  const d = new Date(fromDate)

  if (recurrenceType === 'once') {
    return d // one-time: never advances automatically
  }

  if (recurrenceType === 'monthly') {
    const { dayOfMonth = 1 } = recurrenceConfig
    const next = new Date(d)
    next.setMonth(next.getMonth() + 1)
    if (dayOfMonth === 'last') {
      next.setDate(1)
      next.setMonth(next.getMonth() + 1)
      next.setDate(0)
    } else {
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(dayOfMonth, maxDay))
    }
    return next
  }

  if (recurrenceType === 'weekly') {
    const { dayOfWeek = d.getDay() } = recurrenceConfig
    const next = new Date(d)
    const current = next.getDay()
    let daysUntil = (dayOfWeek - current + 7) % 7
    if (daysUntil === 0) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
    return next
  }

  if (recurrenceType === 'biweekly') {
    const next = new Date(d)
    next.setDate(next.getDate() + 14)
    return next
  }

  return d
}

export async function exportMonthCSV(year, month) {
  const start = new Date(year, month, 1).toISOString()
  const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  const records = await db.history
    .where('timestamp').between(start, end)
    .toArray()
  const clients = await db.clients.toArray()
  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const rows = [['Date', 'Client', 'Type', 'Action', 'Amount']]
  for (const r of records) {
    const c = clientMap[r.clientId] || {}
    rows.push([
      new Date(r.timestamp).toLocaleDateString(),
      c.name || 'Deleted',
      c.type || '',
      r.action,
      c.amount || ''
    ])
  }
  return rows.map(r => r.join(',')).join('\n')
}
