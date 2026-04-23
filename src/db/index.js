import Dexie from 'dexie'

export const db = new Dexie('CobrarDB')

db.version(1).stores({
  settings: 'key',
  clients: '++id, type, name, nextDueDate, isPaid',
  history: '++id, clientId, timestamp, action'
})

// v2: adds `archived` field to clients for monthly clear/restore
db.version(2).stores({
  settings: 'key',
  clients: '++id, type, name, nextDueDate, isPaid, archived',
  history: '++id, clientId, timestamp, action'
}).upgrade(tx => {
  return tx.table('clients').toCollection().modify(c => { c.archived = false })
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
  const next = calcNextDue(now, client.frequency)
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

export function calcNextDue(fromDate, frequency) {
  const d = new Date(fromDate)
  if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (frequency === 'biweekly') d.setDate(d.getDate() + 14)
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
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
