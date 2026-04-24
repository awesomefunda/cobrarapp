import React, { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { es as esLocale, enUS } from 'date-fns/locale'

// ── Helpers ────────────────────────────────────────────────────────────────────

function nextMonthlyDate(dayOfMonth) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (dayOfMonth === 'last') {
    const lastThis = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    if (lastThis >= today) return lastThis
    return new Date(today.getFullYear(), today.getMonth() + 2, 0)
  }
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dayOfMonth)
  if (thisMonth >= today) return thisMonth
  return new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth)
}

function nextWeeklyDate(dayOfWeek) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = (dayOfWeek - today.getDay() + 7) % 7
  return addDays(today, diff === 0 ? 7 : diff)
}

function getInitialState(client, mode) {
  const today = new Date().toISOString().split('T')[0]

  if (!client) {
    return {
      name: '', address: '', amount: '', type: mode,
      recurrenceType: 'monthly',
      recurrenceConfig: { dayOfMonth: 1 },
      nextDueDate: today,
    }
  }

  // Edit mode
  const recurrenceType = client.recurrenceType || 'monthly'
  const recurrenceConfig = client.recurrenceConfig || {}

  return {
    name: client.name || '',
    address: client.address || '',
    amount: client.amount || '',
    type: client.type || mode,
    recurrenceType,
    recurrenceConfig,
    nextDueDate: client.nextDueDate ? client.nextDueDate.split('T')[0] : today,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientForm({ client, mode, onSave, onDelete, onClose, t, lang }) {
  const isEdit = !!client
  const locale = lang === 'es' ? esLocale : enUS
  const [form, setForm] = useState(() => getInitialState(client, mode))
  const [customDay, setCustomDay] = useState(
    form.recurrenceType === 'monthly' &&
    typeof form.recurrenceConfig.dayOfMonth === 'number' &&
    ![1, 5, 10, 15, 20, 25].includes(form.recurrenceConfig.dayOfMonth) &&
    form.recurrenceConfig.dayOfMonth !== 'last'
      ? String(form.recurrenceConfig.dayOfMonth)
      : ''
  )

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setConfig = (k, v) => setForm(f => ({ ...f, recurrenceConfig: { ...f.recurrenceConfig, [k]: v } }))

  // ── Compute next due preview ──────────────────────────────────────────────
  const nextDuePreview = useMemo(() => {
    try {
      let d
      if (form.recurrenceType === 'monthly') {
        d = nextMonthlyDate(form.recurrenceConfig.dayOfMonth ?? 1)
      } else if (form.recurrenceType === 'weekly') {
        d = nextWeeklyDate(form.recurrenceConfig.dayOfWeek ?? 1)
      } else if (form.recurrenceType === 'biweekly') {
        d = new Date(form.nextDueDate + 'T00:00:00')
      } else {
        d = new Date(form.nextDueDate + 'T00:00:00')
      }
      return format(d, 'MMM d, yyyy', { locale })
    } catch { return '' }
  }, [form.recurrenceType, form.recurrenceConfig, form.nextDueDate, locale])

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.name.trim()) return

    let nextDueISO
    if (form.recurrenceType === 'monthly') {
      nextDueISO = nextMonthlyDate(form.recurrenceConfig.dayOfMonth ?? 1).toISOString()
    } else if (form.recurrenceType === 'weekly') {
      nextDueISO = nextWeeklyDate(form.recurrenceConfig.dayOfWeek ?? 1).toISOString()
    } else {
      nextDueISO = new Date(form.nextDueDate + 'T00:00:00').toISOString()
    }

    onSave({
      ...form,
      nextDueDate: nextDueISO,
      frequency: form.recurrenceType, // keep legacy compat
      isPaid: false,
    })
  }

  // ── Day chips ─────────────────────────────────────────────────────────────
  const MONTHLY_QUICK = [1, 5, 10, 15, 20, 25]
  const isCustomMonthly =
    form.recurrenceType === 'monthly' &&
    form.recurrenceConfig.dayOfMonth !== 'last' &&
    !MONTHLY_QUICK.includes(form.recurrenceConfig.dayOfMonth)

  const chip = (label, active, onClick, key) => (
    <button key={key}
      onClick={onClick}
      className="py-2 px-3 rounded-xl text-sm font-body font-medium transition-all"
      style={{
        background: active ? 'rgba(198,241,53,0.15)' : 'var(--surface-3)',
        color: active ? 'var(--lime)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'rgba(198,241,53,0.35)' : 'transparent'}`,
        minWidth: 44,
      }}>
      {label}
    </button>
  )

  // ── Section label ─────────────────────────────────────────────────────────
  const Label = ({ children }) => (
    <p className="text-xs font-display uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6 pb-10 slide-up overflow-y-auto"
        style={{ background: 'var(--surface-1)', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-body font-medium" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? t.editClient : t.newClient}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'var(--surface-3)' }}>
            <X size={16} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="space-y-5">

          {/* Type toggle */}
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-3)' }}>
            {['receivable', 'payable'].map(tp => (
              <button key={tp} onClick={() => set('type', tp)}
                className="flex-1 py-2 rounded-lg text-sm font-body font-medium transition-all"
                style={{
                  background: form.type === tp ? 'var(--surface-0)' : 'transparent',
                  color: form.type === tp ? 'var(--lime)' : 'var(--text-secondary)'
                }}>
                {tp === 'receivable' ? t.modeReceivable : t.modePayable}
              </button>
            ))}
          </div>

          {/* Name */}
          <div>
            <Label>{t.name}</Label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sarah Jenkins" />
          </div>

          {/* Address */}
          <div>
            <Label>{t.address}</Label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Oak St" />
          </div>

          {/* Amount */}
          <div>
            <Label>{t.amount}</Label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="150" />
          </div>

          {/* ── Schedule ──────────────────────────────────────────────────── */}
          <div>
            <Label>{t.schedule}</Label>

            {/* Recurring / One-time top toggle */}
            <div className="flex gap-2 p-1 rounded-xl mb-4" style={{ background: 'var(--surface-3)' }}>
              {['monthly', 'weekly', 'biweekly', 'once'].map(rt => {
                const labels = {
                  monthly: t.monthly, weekly: t.weekly,
                  biweekly: t.biweekly, once: t.oneTime
                }
                return (
                  <button key={rt} onClick={() => {
                    set('recurrenceType', rt)
                    if (rt === 'monthly') set('recurrenceConfig', { dayOfMonth: 1 })
                    if (rt === 'weekly') set('recurrenceConfig', { dayOfWeek: 1 })
                    if (rt === 'biweekly' || rt === 'once') set('recurrenceConfig', {})
                  }}
                    className="flex-1 py-2 rounded-lg text-xs font-body font-medium transition-all"
                    style={{
                      background: form.recurrenceType === rt ? 'var(--surface-0)' : 'transparent',
                      color: form.recurrenceType === rt ? 'var(--lime)' : 'var(--text-secondary)'
                    }}>
                    {labels[rt]}
                  </button>
                )
              })}
            </div>

            {/* ── Monthly ── */}
            {form.recurrenceType === 'monthly' && (
              <div className="space-y-3">
                <Label>{t.dayOfMonth}</Label>
                <div className="flex flex-wrap gap-2">
                  {MONTHLY_QUICK.map(d =>
                    chip(
                      lang === 'en' ? `${d}${['st','nd','rd'][((d%100-11)%10>2||(d%100-11)<0)?d%10-1:3]||'th'}` : `${d}`,
                      form.recurrenceConfig.dayOfMonth === d && !isCustomMonthly,
                      () => { setConfig('dayOfMonth', d); setCustomDay('') },
                      d
                    )
                  )}
                  {chip(t.lastDay, form.recurrenceConfig.dayOfMonth === 'last',
                    () => { setConfig('dayOfMonth', 'last'); setCustomDay('') }, 'last')}
                  {chip(t.customDay, isCustomMonthly,
                    () => { const d = parseInt(customDay) || 28; setCustomDay(String(d)); setConfig('dayOfMonth', d) }, 'custom')}
                </div>
                {/* Custom day input */}
                {(isCustomMonthly || customDay !== '') && (
                  <input
                    type="number" min="1" max="31"
                    value={customDay}
                    placeholder="e.g. 28"
                    onChange={e => {
                      setCustomDay(e.target.value)
                      const n = parseInt(e.target.value)
                      if (n >= 1 && n <= 31) setConfig('dayOfMonth', n)
                    }}
                  />
                )}
              </div>
            )}

            {/* ── Weekly ── */}
            {form.recurrenceType === 'weekly' && (
              <div className="space-y-3">
                <Label>{t.dayOfWeek}</Label>
                <div className="flex gap-1.5">
                  {t.days.map((d, i) =>
                    chip(d, form.recurrenceConfig.dayOfWeek === i,
                      () => setConfig('dayOfWeek', i), i)
                  )}
                </div>
              </div>
            )}

            {/* ── Bi-weekly ── */}
            {form.recurrenceType === 'biweekly' && (
              <div className="space-y-3">
                <Label>{t.startDate}</Label>
                <input type="date" value={form.nextDueDate}
                  onChange={e => set('nextDueDate', e.target.value)}
                  style={{ colorScheme: 'dark' }} />
                <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                  {t.biweeklyHint}
                </p>
              </div>
            )}

            {/* ── One-time ── */}
            {form.recurrenceType === 'once' && (
              <div className="space-y-3">
                <Label>{t.nextDue}</Label>
                <input type="date" value={form.nextDueDate}
                  onChange={e => set('nextDueDate', e.target.value)}
                  style={{ colorScheme: 'dark' }} />
                <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                  {t.oneTimeHint}
                </p>
              </div>
            )}

            {/* Next due preview */}
            {nextDuePreview && form.recurrenceType !== 'once' && (
              <div className="mt-3 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(198,241,53,0.06)', border: '1px solid rgba(198,241,53,0.12)' }}>
                <p className="text-xs font-body" style={{ color: 'var(--lime)' }}>
                  {t.nextDuePreview(nextDuePreview)}
                </p>
              </div>
            )}
          </div>

          {/* Save */}
          <button onClick={handleSave}
            className="w-full py-4 rounded-2xl font-body font-medium"
            style={{ background: 'var(--lime)', color: '#111' }}>
            {t.save}
          </button>

          {/* Delete (edit mode only) */}
          {isEdit && (
            <button onClick={() => onDelete(client.id)}
              className="w-full py-3 rounded-2xl font-body text-sm"
              style={{ color: 'var(--red)', background: 'rgba(255,92,92,0.08)' }}>
              {t.delete}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
