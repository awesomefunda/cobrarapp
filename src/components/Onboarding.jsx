import React, { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

const roles = [
  { key: 'gardener', emoji: '🌿', label_en: 'Gardener',  label_es: 'Jardinero/a' },
  { key: 'landlord', emoji: '🏠', label_en: 'Landlord',  label_es: 'Arrendador/a' },
  { key: 'daycare',  emoji: '⭐', label_en: 'Daycare',   label_es: 'Guardería' },
  { key: 'other',   emoji: '💼', label_en: 'Other',      label_es: 'Otro' },
]

export default function Onboarding({ onComplete, lang }) {
  const [selected, setSelected] = useState(null)
  const es = lang === 'es'

  // Keyboard shortcut: Enter submits when a role is selected. Desktop users
  // were the main loss on the Windows machine — this lets them complete the
  // flow without touching the mouse.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && selected) onComplete(selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, onComplete])

  return (
    <div className="flex flex-col min-h-screen px-6 pt-14 pb-10 fade-in"
      style={{ background: 'var(--surface-0)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-medium text-sm"
          style={{ background: 'var(--lime)', color: '#111' }}>Co</div>
        <span className="text-xl font-body font-medium tracking-tight"
          style={{ color: 'var(--text-primary)' }}>Cobrar</span>
      </div>

      {/* Headline */}
      <h1 className="text-3xl font-body font-medium leading-tight mb-2"
        style={{ color: 'var(--text-primary)' }}>
        {es ? 'Cobra a tiempo,' : 'Get paid on time,'}
        <br />
        <span style={{ color: 'var(--lime)' }}>{es ? 'siempre.' : 'every time.'}</span>
      </h1>
      <p className="text-sm font-body mb-6" style={{ color: 'var(--text-secondary)' }}>
        {es
          ? 'Registra quién te debe y a quién le debes. Privado, sin conexión y gratis.'
          : 'Track who owes you and who you owe. Private, offline, and free.'}
      </p>

      {/* What it does — 3 quick bullets */}
      <div className="flex flex-col gap-2 mb-8 p-4 rounded-2xl"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}>
        {(es
          ? ['Clientes con pagos recurrentes o únicos', 'Recordatorios por WhatsApp o SMS', 'Sin cuenta, sin internet requerido']
          : ['Clients with recurring or one-time payments', 'Send reminders via WhatsApp or SMS', 'No account, no internet required']
        ).map((f, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <CheckCircle2 size={15} color="var(--lime)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>{f}</p>
          </div>
        ))}
      </div>

      {/* Role question — the main ask */}
      <p className="text-xs font-display font-medium uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-muted)' }}>
        {es ? '¿Cómo te describes?' : 'What best describes you?'}
      </p>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {roles.map(role => (
          <button key={role.key} onClick={() => setSelected(role.key)}
            className="flex flex-col items-start p-4 rounded-2xl border transition-all"
            style={{
              background: selected === role.key ? 'rgba(198,241,53,0.08)' : 'var(--surface-2)',
              borderColor: selected === role.key ? 'var(--lime)' : 'var(--surface-4)',
              color: selected === role.key ? 'var(--lime)' : 'var(--text-secondary)'
            }}>
            <span className="text-2xl mb-2">{role.emoji}</span>
            <span className="text-sm font-body font-medium">
              {es ? role.label_es : role.label_en}
            </span>
          </button>
        ))}
      </div>

      {/* CTA — disabled until role picked */}
      <button
        onClick={() => selected && onComplete(selected)}
        disabled={!selected}
        className="w-full py-4 rounded-2xl font-body font-medium text-base transition-all"
        style={{
          background: selected ? 'var(--lime)' : 'var(--surface-3)',
          color: selected ? '#111' : 'var(--text-muted)',
          cursor: selected ? 'pointer' : 'not-allowed'
        }}>
        {es ? 'Entrar a Cobrar →' : 'Enter Cobrar →'}
      </button>

      <p className="text-center text-xs mt-5 font-body" style={{ color: 'var(--text-muted)' }}>
        {es ? 'Privado. Sin servidor. Sin cuenta.' : 'Private. No server. No account.'}
      </p>
    </div>
  )
}
