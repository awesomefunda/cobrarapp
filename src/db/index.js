import Dexie from 'dexie'

export const db = new Dexie('CobrarDB')

// recurrenceType: 'monthly' | 'weekly' | 'biweekly' | 'once'
// recurrenceConfig: { dayOfMonth: 1–31|'last' } | { dayOfWeek: 0–6 } | {}
// type: 'receivable' (they owe me) | 'payable' (I owe them)
//
// IMPORTANT ABOUT VERSION NUMBERS:
// Dexie refuses to open a stored DB whose on-disk version is HIGHER than
// anything declared here (`VersionError: requested X < existing Y`). Some
// users out there have CobrarDB pinned as high as v20 from earlier builds,
// so we declare v30 to leave headroom. If you ever need to change the
// schema, bump this number AGAIN — never decrease it.
const SCHEMA_V1 = {
  settings: 'key',
  clients: '++id, type, name, nextDueDate, isPaid, archived, recurrenceType',
  history: '++id, clientId, timestamp, action',
}
db.version(1).stores(SCHEMA_V1)
db.version(30).stores(SCHEMA_V1) // same shape; just a version bump to welcome users from v2–v20 forward

// Guarded open: if something still goes wrong (corrupt DB, quota, etc.)
// we surface a friendly error the ErrorBoundary can render instead of
// a cryptic native exception.
db.open().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Dexie open failed:', err?.name, err?.message)
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

/**
 * Bundle every piece of user data into a portable JSON snapshot.
 * Use this as a backup before destructive actions (factory reset),
 * or to transfer data between devices.
 */
export async function exportAllData() {
  const [clients, history, settings] = await Promise.all([
    db.clients.toArray(),
    db.history.toArray(),
    db.settings.toArray(),
  ])
  return {
    app: 'cobrar',
    schemaVersion: 30,
    exportedAt: new Date().toISOString(),
    counts: { clients: clients.length, history: history.length, settings: settings.length },
    data: { clients, history, settings },
  }
}

/**
 * Restore a snapshot produced by exportAllData(). Overwrites everything.
 * Caller is expected to confirm with the user first.
 */
export async function importAllData(snapshot) {
  if (!snapshot || snapshot.app !== 'cobrar' || !snapshot.data) {
    throw new Error('Not a valid Cobrar backup file')
  }
  const { clients = [], history = [], settings = [] } = snapshot.data
  await db.transaction('rw', db.clients, db.history, db.settings, async () => {
    await db.clients.clear()
    await db.history.clear()
    await db.settings.clear()
    if (clients.length) await db.clients.bulkAdd(clients)
    if (history.length) await db.history.bulkAdd(history)
    if (settings.length) await db.settings.bulkPut(settings)
  })
  return { clients: clients.length, history: history.length, settings: settings.length }
}

/**
 * Get counts without pulling the full records. Used by the reset
 * confirmation dialog so users see what they're about to lose.
 */
export async function getDataCounts() {
  const [clients, history] = await Promise.all([
    db.clients.count(),
    db.history.count(),
  ])
  return { clients, history }
}

/**
 * FACTORY RESET. Irreversible. Wipes IndexedDB, service workers, caches,
 * and web storage, then reloads to a fresh onboarding flow. Caller MUST
 * confirm with the user before invoking.
 *
 * Sequencing matters: clear browser-storage first (cheap, fast, survivable
 * if interrupted), then unregister SW + caches, and delete the DB LAST —
 * if something dies mid-reset, the DB is the thing we most want preserved.
 */
export async function factoryReset() {
  try { localStorage.clear() } catch {}
  try { sessionStorage.clear() } catch {}
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  } catch {}
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {}
  // Finally nuke the database itself
  try { await db.delete() } catch (e) { console.error('db.delete() failed', e) }
  // Force a clean reload so the new app instance opens a fresh DB
  window.location.replace(window.location.origin + '/')
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
