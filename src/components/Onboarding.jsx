import React, { useState } from 'react'

const roles = [
  { key: 'gardener', emoji: '🌿', label_en: 'Gardener', label_es: 'Jardinero/a' },
  { key: 'landlord', emoji: '🏠', label_en: 'Landlord', label_es: 'Arrendador/a' },
  { key: 'daycare', emoji: '⭐', label_en: 'Daycare', label_es: 'Guardería' },
  { key: 'other', emoji: '💼', label_en: 'Other', label_es: 'Otro' },
]

export default function Onboarding({ onComplete, lang }) {
  const [selected, setSelected] = useState(null)
  const es = lang === 'es'

  return (
    <div className="flex flex-col min-h-screen p-6" style={{ background: 'var(--surface-0)' }}>
      {/* Logo */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-medium text-sm" style={{ background: 'var(--lime)', color: '#111' }}>
              Co
            </div>
            <span className="text-2xl font-body font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Cobrar
            </span>
          </div>
          <h1 className="text-3xl font-body font-medium leading-tight mb-3" style={{ color: 'var(--text-primary)' }}>
            {es ? 'Cobra a tiempo,' : 'Get paid on time,'}
            <br />
            <span style={{ color: 'var(--lime)' }}>{es ? 'siempre.' : 'every time.'}</span>
          </h1>
          <p className="text-base font-body" style={{ color: 'var(--text-secondary)' }}>
            {es ? 'Tus clientes. Tu dinero. Tu teléfono.' : 'Your clients. Your money. Your phone.'}
          </p>
        </div>

        <div className="mb-8">
          <p className="text-xs font-display font-medium uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            {es ? '¿Cómo te describes?' : 'What best describes you?'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(role => (
              <button
                key={role.key}
                onClick={() => setSelected(role.key)}
                className="flex flex-col items-start p-4 rounded-2xl border transition-all"
                style={{
                  background: selected === role.key ? 'rgba(198,241,53,0.08)' : 'var(--surface-2)',
                  borderColor: selected === role.key ? 'var(--lime)' : 'var(--surface-4)',
                  color: selected === role.key ? 'var(--lime)' : 'var(--text-secondary)'
                }}
              >
                <span className="text-2xl mb-2">{role.emoji}</span>
                <span className="text-sm font-body font-medium">
                  {es ? role.label_es : role.label_en}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => selected && onComplete(selected)}
          disabled={!selected}
          className="w-full py-4 rounded-2xl font-body font-medium text-base transition-all"
          style={{
            background: selected ? 'var(--lime)' : 'var(--surface-3)',
            color: selected ? '#111' : 'var(--text-muted)',
            cursor: selected ? 'pointer' : 'not-allowed'
          }}
        >
          {es ? 'Comenzar →' : "Let's go →"}
        </button>
      </div>

      <p className="text-center text-xs mt-6 font-body" style={{ color: 'var(--text-muted)' }}>
        {es ? 'Privado. Sin servidor. Sin cuenta.' : 'Private. No server. No account.'}
      </p>
    </div>
  )
}
