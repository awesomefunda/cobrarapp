import React, { useState } from 'react'
import { X } from 'lucide-react'

export default function ClientForm({ client, mode, onSave, onDelete, onClose, t }) {
  const isEdit = !!client
  const defaultDate = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    name: '', address: '', amount: '', frequency: 'monthly',
    type: mode,
    ...client,
    nextDueDate: client?.nextDueDate ? client.nextDueDate.split('T')[0] : defaultDate
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return
    const next = new Date(form.nextDueDate + 'T00:00:00')
    onSave({ ...form, nextDueDate: next.toISOString(), isPaid: false })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6 pb-10 slide-up"
        style={{ background: 'var(--surface-1)' }}>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-body font-medium" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? t.editClient : t.newClient}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'var(--surface-3)' }}>
            <X size={16} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-3)' }}>
            {['receivable', 'payable'].map(tp => (
              <button key={tp}
                onClick={() => set('type', tp)}
                className="flex-1 py-2 rounded-lg text-sm font-body font-medium transition-all"
                style={{
                  background: form.type === tp ? 'var(--surface-0)' : 'transparent',
                  color: form.type === tp ? 'var(--lime)' : 'var(--text-secondary)'
                }}>
                {tp === 'receivable' ? t.modeReceivable : t.modePayable}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-display uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-muted)' }}>{t.name}</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sarah Jenkins" />
          </div>

          <div>
            <label className="block text-xs font-display uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-muted)' }}>{t.address}</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Oak St" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-display uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}>{t.amount}</label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="150" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-display uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-muted)' }}>{t.frequency}</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                <option value="weekly">{t.weekly}</option>
                <option value="biweekly">{t.biweekly}</option>
                <option value="monthly">{t.monthly}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-display uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-muted)' }}>{t.nextDue}</label>
            <input type="date" value={form.nextDueDate} onChange={e => set('nextDueDate', e.target.value)}
              style={{ colorScheme: 'dark' }} />
          </div>

          <button onClick={handleSave}
            className="w-full py-4 rounded-2xl font-body font-medium mt-2"
            style={{ background: 'var(--lime)', color: '#111' }}>
            {t.save}
          </button>

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
