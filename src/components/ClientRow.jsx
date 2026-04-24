import React, { useState } from 'react'
import { Check, MessageCircle, Pencil, RotateCcw, CheckCircle2, Circle } from 'lucide-react'
import { markPaid, markUnpaid, logReminder, restoreClient } from '../db'
import { differenceInDays, format } from 'date-fns'
import { es as esLocale, enUS } from 'date-fns/locale'

export default function ClientRow({ client, t, role, lang, onEdit, archived = false, selectable = false, selected = false, onSelect }) {
  const [flashing, setFlashing] = useState(false)
  const now = new Date()
  const due = new Date(client.nextDueDate)
  const diff = differenceInDays(due, now)
  const locale = lang === 'es' ? esLocale : enUS

  const isOverdue = !client.isPaid && diff < 0
  const isDueToday = !client.isPaid && diff === 0

  const statusLabel = () => {
    if (archived) return format(new Date(client.lastPaidDate || due), 'd MMM yyyy', { locale })
    if (client.isPaid) return `${t.paidOn} ${format(new Date(client.lastPaidDate || due), 'd MMM', { locale })}`
    if (isOverdue) return t.daysLate(Math.abs(diff))
    if (isDueToday) return t.today
    return t.daysUntil(diff)
  }

  const statusColor = () => {
    if (archived) return 'var(--text-muted)'
    if (client.isPaid) return 'var(--text-muted)'
    if (isOverdue) return 'var(--red)'
    if (isDueToday) return 'var(--lime)'
    return 'var(--text-secondary)'
  }

  const handlePaid = async (e) => {
    e.stopPropagation()
    setFlashing(true)
    if (client.isPaid) await markUnpaid(client.id)
    else await markPaid(client.id)
    setTimeout(() => setFlashing(false), 300)
  }

  const handleRemind = async (e) => {
    e.stopPropagation()
    const dueStr = format(due, 'd MMM yyyy', { locale })
    const msg = client.type === 'payable'
      ? t.payMsg(client.name, client.amount || '?', dueStr)
      : t.reminderMsg(client.name, client.amount || '?', dueStr, role)
    await logReminder(client.id)
    if (navigator.share) {
      try { await navigator.share({ text: msg }) } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }
  }

  const handleRestore = async (e) => {
    e.stopPropagation()
    await restoreClient(client.id)
  }

  const initials = client.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const avatarBg = () => {
    if (archived) return 'var(--surface-3)'
    if (client.isPaid) return 'var(--surface-3)'
    if (isOverdue) return 'rgba(255,92,92,0.12)'
    if (isDueToday) return 'rgba(198,241,53,0.12)'
    return 'var(--surface-3)'
  }
  const avatarColor = () => {
    if (archived) return 'var(--text-muted)'
    if (client.isPaid) return 'var(--text-muted)'
    if (isOverdue) return 'var(--red)'
    if (isDueToday) return 'var(--lime)'
    return 'var(--text-secondary)'
  }

  const handleRowClick = () => {
    if (selectable) { onSelect?.(client.id); return }
    if (!archived) onEdit(client)
  }

  return (
    <div
      onClick={handleRowClick}
      className="flex items-center gap-3 py-4 px-4 rounded-2xl transition-all cursor-pointer"
      style={{
        background: selected
          ? 'rgba(198,241,53,0.06)'
          : archived ? 'var(--surface-1)'
          : isOverdue ? 'rgba(255,92,92,0.04)' : 'var(--surface-1)',
        border: `1px solid ${
          selected ? 'rgba(198,241,53,0.3)'
          : isOverdue && !archived ? 'rgba(255,92,92,0.15)'
          : 'var(--surface-3)'}`,
        opacity: (client.isPaid && !archived && !selectable) ? 0.45 : archived ? 0.6 : 1
      }}
    >
      {/* Avatar / Checkbox */}
      {selectable ? (
        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
          {selected
            ? <CheckCircle2 size={22} color="var(--lime)" strokeWidth={2} />
            : <Circle size={22} color="var(--surface-4)" strokeWidth={1.5} />}
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-display font-medium flex-shrink-0"
          style={{ background: avatarBg(), color: avatarColor() }}>
          {initials}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-body font-medium truncate"
            style={{ color: (client.isPaid || archived) ? 'var(--text-muted)' : 'var(--text-primary)' }}>
            {client.name}
          </p>
          {/* Edit affordance — shown only on active (non-archived) clients */}
          {!archived && (
            <Pencil size={11} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.5 }} />
          )}
        </div>
        <p className="text-xs font-body mt-0.5" style={{ color: statusColor() }}>
          {statusLabel()}
          {client.amount ? <span style={{ color: 'var(--text-muted)' }}> · ${client.amount}</span> : null}
        </p>
      </div>

      {/* Actions — hidden in select mode */}
      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {selectable ? null : archived ? (
          /* Archived mode: show Restore button only */
          <button
            onClick={handleRestore}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-body font-medium"
            style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={12} />
            {t.restore}
          </button>
        ) : (
          /* Normal mode */
          <>
            {!client.isPaid && (
              <button
                onClick={handleRemind}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-3)' }}
              >
                <MessageCircle size={15} color="var(--text-secondary)" />
              </button>
            )}
            <button
              onClick={handlePaid}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: client.isPaid ? 'var(--lime)' : flashing ? 'rgba(198,241,53,0.2)' : 'var(--surface-3)',
                border: client.isPaid ? 'none' : `1.5px solid ${isOverdue ? 'rgba(255,92,92,0.4)' : 'var(--surface-4)'}`
              }}
            >
              <Check size={15} color={client.isPaid ? '#111' : isOverdue ? 'var(--red)' : 'var(--text-muted)'} strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
