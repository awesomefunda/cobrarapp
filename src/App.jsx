import React, { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Settings, LayoutGrid, History, Shield } from 'lucide-react'
import { db, getSetting, setSetting, addClient, deleteClient, FREE_CLIENT_LIMIT } from './db'
import { translations } from './i18n'
import Onboarding from './components/Onboarding'
import ClientRow from './components/ClientRow'
import ClientForm from './components/ClientForm'
import BackupBanner from './components/BackupBanner'
import LegalModal from './components/LegalModal'

const TABS = ['dashboard', 'history', 'settings']

export default function App() {
  const [ready, setReady] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [role, setRole] = useState('other')
  const [lang, setLang] = useState('en')
  const [isPro, setIsPro] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [mode, setMode] = useState('receivable') // 'receivable' | 'payable'
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClientState] = useState(null)
  const [showLegal, setShowLegal] = useState(false)
  const [showBackup, setShowBackup] = useState(false)

  const t = translations[lang]

  // Load settings on mount
  useEffect(() => {
    async function load() {
      const ob = await getSetting('onboarded', false)
      const r = await getSetting('role', 'other')
      const l = await getSetting('lang', 'en')
      const pro = await getSetting('isPro', false)
      setOnboarded(ob); setRole(r); setLang(l); setIsPro(pro)

      // Check if backup banner needed (1st of month, not dismissed this month)
      const now = new Date()
      if (now.getDate() >= 1 && now.getDate() <= 7) {
        const lastBackup = await getSetting('lastBackupMonth', null)
        const thisMonth = `${now.getFullYear()}-${now.getMonth()}`
        if (lastBackup !== thisMonth) setShowBackup(true)
      }
      setReady(true)
    }
    load()
  }, [])

  const handleOnboard = async (selectedRole) => {
    await setSetting('onboarded', true)
    await setSetting('role', selectedRole)
    setRole(selectedRole); setOnboarded(true)
  }

  const toggleLang = async () => {
    const next = lang === 'en' ? 'es' : 'en'
    setLang(next); await setSetting('lang', next)
  }

  // Live data from Dexie
  const allClients = useLiveQuery(() => db.clients.toArray(), []) || []
  const allHistory = useLiveQuery(() => db.history.orderBy('timestamp').reverse().limit(50).toArray(), []) || []

  const visibleClients = useMemo(() => {
    const filtered = allClients.filter(c => c.type === mode)
    return [...filtered].sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
      return new Date(a.nextDueDate) - new Date(b.nextDueDate)
    })
  }, [allClients, mode])

  const overdueCount = useMemo(() =>
    allClients.filter(c => !c.isPaid && new Date(c.nextDueDate) < new Date()).length,
    [allClients])

  const handleSaveClient = async (data) => {
    if (data.id) {
      await db.clients.update(data.id, data)
    } else {
      await addClient(data)
    }
    setShowForm(false); setEditClientState(null)
  }

  const handleDeleteClient = async (id) => {
    await deleteClient(id)
    setShowForm(false); setEditClientState(null)
  }

  const handleDismissBackup = async () => {
    const now = new Date()
    await setSetting('lastBackupMonth', `${now.getFullYear()}-${now.getMonth()}`)
    setShowBackup(false)
  }

  if (!ready) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--lime)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!onboarded) return <Onboarding onComplete={handleOnboard} lang={lang} />

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--surface-0)' }}>

      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex-shrink-0">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-display font-medium"
              style={{ background: 'var(--lime)', color: '#111' }}>Co</div>
            <span className="text-lg font-body font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>Cobrar</span>
            {isPro && (
              <span className="text-[9px] font-display font-medium px-1.5 py-0.5 rounded-md uppercase tracking-widest"
                style={{ background: 'rgba(198,241,53,0.15)', color: 'var(--lime)' }}>PRO</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang}
              className="text-xs font-display font-medium px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        {tab === 'dashboard' && (
          <div className="flex p-1 rounded-xl gap-1" style={{ background: 'var(--surface-2)' }}>
            {['receivable', 'payable'].map(m => (
              <button key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2.5 rounded-lg text-sm font-body font-medium transition-all"
                style={{
                  background: mode === m ? 'var(--surface-4)' : 'transparent',
                  color: mode === m ? 'var(--lime)' : 'var(--text-secondary)'
                }}>
                {m === 'receivable' ? t.modeReceivable : t.modePayable}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto pb-24">

        {/* Backup banner */}
        {showBackup && tab === 'dashboard' && (
          <BackupBanner t={t} lang={lang} onDismiss={handleDismissBackup} />
        )}

        {tab === 'dashboard' && (
          <div className="px-4">
            {/* Summary row */}
            <div className="flex gap-2 mb-4">
              {[
                { label: t.overdueCount(overdueCount), color: overdueCount > 0 ? 'var(--red)' : 'var(--text-muted)', bg: overdueCount > 0 ? 'rgba(255,92,92,0.06)' : 'var(--surface-2)' },
                { label: t.clientCount(visibleClients.length), color: 'var(--text-secondary)', bg: 'var(--surface-2)' },
              ].map((s, i) => (
                <div key={i} className="flex-1 px-3 py-2.5 rounded-xl"
                  style={{ background: s.bg }}>
                  <p className="text-xs font-body font-medium" style={{ color: s.color }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Client list */}
            <div className="space-y-2">
              {visibleClients.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-3xl mb-3">🌿</p>
                  <p className="text-sm font-body mb-1" style={{ color: 'var(--text-secondary)' }}>{t.noClients}</p>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{t.noClientsHint}</p>
                </div>
              ) : (
                visibleClients.map(c => (
                  <ClientRow key={c.id} client={c} t={t} role={role} lang={lang}
                    onEdit={(c) => { setEditClientState(c); setShowForm(true) }} />
                ))
              )}
            </div>

            {/* AD SLOT — Reserved for Google AdSense (320x50 banner) */}
            {/* AD_SLOT: GoogleAd placement="dashboard-footer" size="320x50" */}
            {/* To activate: uncomment the script tag in index.html and replace this comment with the ad unit div */}
            <div style={{ height: '50px', marginTop: '16px' }} />
            {/* END AD SLOT */}
          </div>
        )}

        {tab === 'history' && (
          <div className="px-4">
            <h2 className="text-xs font-display font-medium uppercase tracking-widest mb-4 mt-2"
              style={{ color: 'var(--text-muted)' }}>{t.history}</h2>
            {allHistory.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{t.noHistory}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allHistory.map(h => {
                  const client = allClients.find(c => c.id === h.clientId)
                  return (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: h.action === 'paid' ? 'var(--lime)' : 'var(--text-muted)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body truncate" style={{ color: 'var(--text-primary)' }}>
                          {client?.name || 'Deleted client'}
                        </p>
                        <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                          {h.action} · {new Date(h.timestamp).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {h.amount && <span className="text-sm font-body font-medium flex-shrink-0"
                        style={{ color: 'var(--lime)' }}>${h.amount}</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="px-4">
            <h2 className="text-xs font-display font-medium uppercase tracking-widest mb-4 mt-2"
              style={{ color: 'var(--text-muted)' }}>{t.settings}</h2>
            <div className="space-y-2">

              {/* Role */}
              <div className="p-4 rounded-2xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}>
                <p className="text-xs font-body mb-3" style={{ color: 'var(--text-muted)' }}>{t.settingsRole}</p>
                <div className="grid grid-cols-2 gap-2">
                  {['gardener', 'landlord', 'daycare', 'other'].map(r => (
                    <button key={r} onClick={async () => { setRole(r); await setSetting('role', r) }}
                      className="py-2.5 rounded-xl text-sm font-body font-medium"
                      style={{
                        background: role === r ? 'rgba(198,241,53,0.1)' : 'var(--surface-3)',
                        color: role === r ? 'var(--lime)' : 'var(--text-secondary)',
                        border: `1px solid ${role === r ? 'rgba(198,241,53,0.3)' : 'transparent'}`
                      }}>
                      {t[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pro */}
              {!isPro && (
                <div className="p-4 rounded-2xl" style={{ background: 'rgba(198,241,53,0.06)', border: '1px solid rgba(198,241,53,0.15)' }}>
                  <p className="text-sm font-body font-medium mb-1" style={{ color: 'var(--lime)' }}>{t.proTitle}</p>
                  <ul className="text-xs font-body mb-3 space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    {t.proFeatures.map(f => <li key={f}>· {f}</li>)}
                  </ul>
                  <a href="https://buy.stripe.com/PLACEHOLDER" target="_blank" rel="noopener noreferrer"
                    className="block text-center py-3 rounded-xl text-sm font-body font-medium"
                    style={{ background: 'var(--lime)', color: '#111' }}>
                    {t.proBtn}
                  </a>
                </div>
              )}

              {/* Legal */}
              <button onClick={() => setShowLegal(true)}
                className="w-full p-4 rounded-2xl text-left flex items-center gap-3"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}>
                <Shield size={16} color="var(--text-muted)" />
                <span className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{t.legalTitle}</span>
              </button>

              {/* Version */}
              <p className="text-center text-xs font-body pt-4" style={{ color: 'var(--text-muted)' }}>
                Cobrar v1.0 · cobrarapp.com
                <br />
                <span style={{ color: 'var(--surface-4)' }}>
                  {lang === 'es' ? 'Privado. Sin servidor. Sin cuenta.' : 'Private. No server. No account.'}
                </span>
              </p>
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      {tab === 'dashboard' && (
        <button
          onClick={() => { setEditClientState(null); setShowForm(true) }}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40"
          style={{ background: 'var(--lime)' }}>
          <Plus size={24} color="#111" strokeWidth={2.5} />
        </button>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto flex items-center justify-around px-6 pb-8 pt-3 z-30"
        style={{ background: 'var(--surface-0)', borderTop: '1px solid var(--surface-2)' }}>
        {[
          { key: 'dashboard', icon: LayoutGrid, label: t.dashboard },
          { key: 'history', icon: History, label: t.history },
          { key: 'settings', icon: Settings, label: t.settings },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex flex-col items-center gap-1 py-1 px-4">
            <Icon size={20} color={tab === key ? 'var(--lime)' : 'var(--surface-4)'} strokeWidth={tab === key ? 2 : 1.5} />
            <span className="text-[9px] font-display uppercase tracking-widest"
              style={{ color: tab === key ? 'var(--lime)' : 'var(--surface-4)' }}>
              {label}
            </span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      {showForm && (
        <ClientForm
          client={editClient}
          mode={mode}
          onSave={handleSaveClient}
          onDelete={handleDeleteClient}
          onClose={() => { setShowForm(false); setEditClientState(null) }}
          t={t} isPro={isPro}
          clientCount={allClients.length}
          FREE_LIMIT={FREE_CLIENT_LIMIT}
        />
      )}
      {showLegal && <LegalModal onClose={() => setShowLegal(false)} lang={lang} t={t} />}
    </div>
  )
}
