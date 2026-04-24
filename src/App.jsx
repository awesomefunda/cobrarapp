import React, { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Settings, LayoutGrid, History, Shield, X, Trash2, Pencil, Archive, ChevronDown, ChevronUp, CheckSquare, Square, Sparkles, Download, AlertTriangle } from 'lucide-react'
import { db, getSetting, setSetting, addClient, deleteClient, deleteHistoryEntry, archivePaidClients, bulkDeleteClients, exportAllData, getDataCounts, factoryReset } from './db'
import { translations } from './i18n'
import Onboarding from './components/Onboarding'
import ClientRow from './components/ClientRow'
import ClientForm from './components/ClientForm'
import BackupBanner from './components/BackupBanner'
import LegalModal from './components/LegalModal'
import UpdatePrompt from './components/UpdatePrompt'

const TABS = ['dashboard', 'history', 'settings']

export default function App() {
  const [ready, setReady] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [role, setRole] = useState('other')
  const [lang, setLang] = useState('en')
  const [tab, setTab] = useState('dashboard')
  const [mode, setMode] = useState('receivable') // 'receivable' | 'payable'
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClientState] = useState(null)
  const [showLegal, setShowLegal] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [historyModal, setHistoryModal] = useState(null)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  // Non-persisted preview flag — shows the welcome screen to existing users
  // without flipping `onboarded` or touching any data.
  const [previewOnboarding, setPreviewOnboarding] = useState(false)
  // Factory-reset confirm sheet + loaded counts for the warning text.
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetCounts, setResetCounts] = useState({ clients: 0, history: 0 })
  const [resetting, setResetting] = useState(false)

  const t = translations[lang]

  // Load settings on mount
  useEffect(() => {
    async function load() {
      const ob = await getSetting('onboarded', false)
      const r = await getSetting('role', 'other')
      const l = await getSetting('lang', 'en')
      setOnboarded(ob); setRole(r); setLang(l)

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
    const filtered = allClients.filter(c => c.type === mode && !c.archived)
    return [...filtered].sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
      return new Date(a.nextDueDate) - new Date(b.nextDueDate)
    })
  }, [allClients, mode])

  const archivedClients = useMemo(() =>
    allClients.filter(c => c.archived),
  [allClients])

  const paidCount = useMemo(() =>
    visibleClients.filter(c => c.isPaid).length,
  [visibleClients])

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

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleSelectAll = () => {
    if (selectedIds.size === visibleClients.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visibleClients.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return
    await bulkDeleteClients([...selectedIds])
    exitSelectMode()
  }

  // Download a full backup as JSON. Safe to call anytime; no data is modified.
  const handleExportBackup = async () => {
    const snapshot = await exportAllData()
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `cobrar-backup-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Revoke on next tick so the download has started
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // Open the factory-reset confirmation sheet. Pulls counts so the warning
  // text shows the user exactly what they're about to lose.
  const handleOpenResetConfirm = async () => {
    const counts = await getDataCounts()
    setResetCounts(counts)
    setShowResetConfirm(true)
  }

  // Final irreversible step. Shows a brief "Resetting…" state, then reloads.
  const handleConfirmReset = async () => {
    setResetting(true)
    try {
      await factoryReset()
    } catch (e) {
      console.error('factoryReset failed', e)
      setResetting(false)
    }
    // factoryReset() calls window.location.replace on success, so we never
    // reach here unless it threw.
  }

  if (!ready) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--lime)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!onboarded) return <Onboarding onComplete={handleOnboard} lang={lang} />

  // Preview mode — existing users re-viewing the welcome screen.
  // Non-destructive: dismiss returns to the app with all state intact.
  if (previewOnboarding) {
    return <Onboarding preview lang={lang} onClose={() => setPreviewOnboarding(false)} />
  }

  return (
    <div className="flex flex-col" style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>

      {/* Service-worker update banner + "you're on the latest version" toast */}
      <UpdatePrompt lang={lang} />

      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex-shrink-0">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-display font-medium"
              style={{ background: 'var(--lime)', color: '#111' }}>Co</div>
            <span className="text-lg font-body font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>Cobrar</span>
            <span className="text-[9px] font-display font-medium px-1.5 py-0.5 rounded-md uppercase tracking-widest"
              style={{ background: 'rgba(198,241,53,0.1)', color: 'var(--lime)' }}>Free</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang}
              className="text-xs font-display font-medium px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
        </div>

        {/* Persistent tagline — keeps the brand promise visible for returning
            users, not just first-timers. Only shown on dashboard; history and
            settings have their own focused headers. */}
        {tab === 'dashboard' && (
          <p className="text-xs font-body mb-4" style={{ color: 'var(--text-muted)' }}>
            {lang === 'es' ? 'Cobra a tiempo, ' : 'Get paid on time, '}
            <span style={{ color: 'var(--lime)' }}>
              {lang === 'es' ? 'siempre.' : 'every time.'}
            </span>
          </p>
        )}

        {/* Mode toggle + Select button */}
        {tab === 'dashboard' && (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 p-1 rounded-xl gap-1" style={{ background: 'var(--surface-2)' }}>
              {['receivable', 'payable'].map(m => (
                <button key={m}
                  onClick={() => { setMode(m); exitSelectMode() }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-body font-medium transition-all"
                  style={{
                    background: mode === m ? 'var(--surface-4)' : 'transparent',
                    color: mode === m ? 'var(--lime)' : 'var(--text-secondary)'
                  }}>
                  {m === 'receivable' ? t.modeReceivable : t.modePayable}
                </button>
              ))}
            </div>
            {/* Select toggle */}
            <button
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
              className="h-10 px-3 rounded-xl text-xs font-body font-medium flex items-center gap-1.5"
              style={{
                background: selectMode ? 'rgba(198,241,53,0.15)' : 'var(--surface-2)',
                color: selectMode ? 'var(--lime)' : 'var(--text-secondary)',
                border: selectMode ? '1px solid rgba(198,241,53,0.3)' : '1px solid transparent'
              }}>
              {selectMode ? <X size={13} /> : <CheckSquare size={13} />}
              {selectMode ? t.cancelSelect : t.selectEntries}
            </button>
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

            {/* Archive paid button — only visible when paid entries exist */}
            {paidCount > 0 && (
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mb-3 text-xs font-body font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px dashed var(--surface-4)' }}
              >
                <Archive size={13} />
                {t.archivePaidBtn(paidCount)}
              </button>
            )}

            {/* Select All bar */}
            {selectMode && visibleClients.length > 0 && (
              <button onClick={handleSelectAll}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl mb-2 text-xs font-body font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                <span>{t.selectAll}</span>
                <span style={{ color: selectedIds.size > 0 ? 'var(--lime)' : 'var(--text-muted)' }}>
                  {selectedIds.size}/{visibleClients.length}
                </span>
              </button>
            )}

            {/* Client list */}
            <div className="space-y-2">
              {visibleClients.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-3xl mb-3">🌿</p>
                  <p className="text-sm font-body mb-1" style={{ color: 'var(--text-secondary)' }}>{t.noClients}</p>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{t.noClientsHint}</p>
                  {/* Discoverable "what is this?" link for users who skipped or forgot onboarding.
                      Shown only on empty state — disappears once they have clients. */}
                  <button
                    onClick={() => setPreviewOnboarding(true)}
                    className="mt-5 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-body"
                    style={{
                      background: 'rgba(198,241,53,0.08)',
                      color: 'var(--lime)',
                      border: '1px solid rgba(198,241,53,0.25)',
                    }}>
                    <Sparkles size={12} />
                    {t.whatIsCobrar}
                  </button>
                </div>
              ) : (
                visibleClients.map(c => (
                  <ClientRow key={c.id} client={c} t={t} role={role} lang={lang}
                    onEdit={(c) => { setEditClientState(c); setShowForm(true) }}
                    selectable={selectMode}
                    selected={selectedIds.has(c.id)}
                    onSelect={toggleSelect} />
                ))
              )}
            </div>

            {/* Archived section toggle */}
            {archivedClients.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowArchived(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-body font-medium"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                >
                  <span>{showArchived ? t.hideArchived : t.showArchived(archivedClients.length)}</span>
                  {showArchived ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showArchived && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs font-display uppercase tracking-widest px-1 mb-2"
                      style={{ color: 'var(--text-muted)' }}>{t.archivedSection}</p>
                    {archivedClients.map(c => (
                      <ClientRow key={c.id} client={c} t={t} role={role} lang={lang}
                        onEdit={() => {}} archived={true} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AD SLOT — Reserved for Google AdSense (320x50 banner) */}
            {/* AD_SLOT: GoogleAd placement="dashboard-footer" size="320x50" */}
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
                    <div key={h.id}
                      onClick={() => setHistoryModal({ ...h, clientName: client?.name || null, client })}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
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
                      <Pencil size={12} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.4 }} />
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

              {/* Preview welcome screen — NON-destructive, just re-renders Onboarding */}
              <button onClick={() => setPreviewOnboarding(true)}
                className="w-full p-4 rounded-2xl text-left flex items-center gap-3"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}>
                <Sparkles size={16} color="var(--lime)" />
                <span className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{t.previewOnboarding}</span>
              </button>

              {/* Legal */}
              <button onClick={() => setShowLegal(true)}
                className="w-full p-4 rounded-2xl text-left flex items-center gap-3"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}>
                <Shield size={16} color="var(--text-muted)" />
                <span className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{t.legalTitle}</span>
              </button>

              {/* Export backup — non-destructive; download all data as JSON */}
              <button onClick={handleExportBackup}
                className="w-full p-4 rounded-2xl text-left flex items-start gap-3"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)' }}>
                <Download size={16} color="var(--text-secondary)" style={{ marginTop: 2 }} />
                <div className="flex-1">
                  <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{t.exportBackup}</p>
                  <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.exportBackupHint}</p>
                </div>
              </button>

              {/* Factory reset — DESTRUCTIVE; opens confirm sheet */}
              <button onClick={handleOpenResetConfirm}
                className="w-full p-4 rounded-2xl text-left flex items-start gap-3"
                style={{ background: 'rgba(255,92,92,0.06)', border: '1px solid rgba(255,92,92,0.2)' }}>
                <AlertTriangle size={16} color="var(--red)" style={{ marginTop: 2 }} />
                <div className="flex-1">
                  <p className="text-sm font-body font-medium" style={{ color: 'var(--red)' }}>{t.factoryReset}</p>
                  <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.factoryResetHint}</p>
                </div>
              </button>

              {/* Version */}
              <p className="text-center text-xs font-body pt-4" style={{ color: 'var(--text-muted)' }}>
                Cobrar v1.0 · cobrarapp.com
                <br />
                {/* Was --surface-4 (#2a2a2a) which is invisible on Windows LCDs.
                    Upgraded to --text-muted for consistent legibility. */}
                <span style={{ color: 'var(--text-muted)' }}>
                  {lang === 'es'
                    ? 'Gratis. Privado. Sin servidor. Sin cuenta.'
                    : 'Free & open source. Private. No server. No account.'}
                </span>
                <br />
                <a href="https://github.com/awesomefunda/cobrarapp" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
                  MIT License · GitHub
                </a>
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Bulk delete bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-4 right-4 max-w-[398px] mx-auto z-40">
          <button onClick={handleBulkDelete}
            className="w-full py-4 rounded-2xl font-body font-medium flex items-center justify-center gap-2 shadow-lg"
            style={{ background: 'var(--red)', color: '#fff' }}>
            <Trash2 size={16} />
            {t.deleteSelected(selectedIds.size)}
          </button>
        </div>
      )}

      {/* FAB — wrapped in a fixed container that's capped at the app frame
          width (430px) and centered. Before this, `fixed right-5` anchored
          the FAB to the viewport edge, which on wide desktop monitors put
          it hundreds of pixels away from the actual content. Now it sits at
          the right edge of the centered app frame on any screen size.
          Also bumped to 64px on sm+ screens for easier mouse targeting. */}
      {tab === 'dashboard' && !selectMode && (
        <div className="fixed left-0 right-0 bottom-24 max-w-[430px] mx-auto pointer-events-none z-40 px-5">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditClientState(null); setShowForm(true) }}
              aria-label={t.addClient}
              className={`pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg ${
                visibleClients.length === 0 ? 'pulse' : ''
              }`}
              style={{ background: 'var(--lime)' }}>
              <Plus size={26} color="#111" strokeWidth={2.5} />
            </button>
          </div>
        </div>
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
            {/* Inactive tabs: use --text-secondary instead of --surface-4.
                --surface-4 (#2a2a2a) against --surface-0 (#0a0a0a) is only
                ~1.5:1 contrast, which renders invisible on typical Windows
                LCDs. --text-secondary (#888) gives ~6:1 and reads on every
                screen. */}
            <Icon size={20} color={tab === key ? 'var(--lime)' : 'var(--text-secondary)'} strokeWidth={tab === key ? 2 : 1.5} />
            <span className="text-[9px] font-display uppercase tracking-widest"
              style={{ color: tab === key ? 'var(--lime)' : 'var(--text-secondary)' }}>
              {label}
            </span>
          </button>
        ))}
      </nav>

      {/* History entry action sheet */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setHistoryModal(null)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6 pb-10 slide-up"
            style={{ background: 'var(--surface-1)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="font-body font-medium" style={{ color: 'var(--text-primary)' }}>
                  {historyModal.clientName || 'Deleted client'}
                </p>
                <p className="text-xs mt-0.5 font-body capitalize"
                  style={{ color: 'var(--text-muted)' }}>
                  {historyModal.action}
                  {historyModal.amount ? ` · $${historyModal.amount}` : ''}
                  {' · '}
                  {new Date(historyModal.timestamp).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setHistoryModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: 'var(--surface-3)' }}>
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>

            {/* Edit Client button — only if client still exists */}
            {historyModal.client && (
              <button
                onClick={() => {
                  setEditClientState(historyModal.client)
                  setShowForm(true)
                  setHistoryModal(null)
                  setTab('dashboard')
                }}
                className="w-full flex items-center gap-3 p-4 rounded-2xl mb-2 text-sm font-body font-medium"
                style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                <Pencil size={16} color="var(--text-secondary)" />
                {t.editThisClient}
              </button>
            )}

            {/* Delete entry button */}
            <button
              onClick={async () => {
                await deleteHistoryEntry(historyModal.id)
                setHistoryModal(null)
              }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-sm font-body font-medium"
              style={{ background: 'rgba(255,92,92,0.08)', color: 'var(--red)' }}>
              <Trash2 size={16} />
              {t.deleteEntry}
            </button>
          </div>
        </div>
      )}

      {/* Archive confirm sheet */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowArchiveConfirm(false)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6 pb-10 slide-up"
            style={{ background: 'var(--surface-1)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <Archive size={18} color="var(--text-secondary)" />
                <p className="font-body font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t.archiveConfirmTitle}
                </p>
              </div>
              <button onClick={() => setShowArchiveConfirm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: 'var(--surface-3)' }}>
                <X size={16} color="var(--text-secondary)" />
              </button>
            </div>

            <p className="text-sm font-body mb-6" style={{ color: 'var(--text-secondary)' }}>
              {t.archiveConfirmMsg}
            </p>

            <button
              onClick={async () => {
                await archivePaidClients()
                setShowArchiveConfirm(false)
                setShowArchived(false)
              }}
              className="w-full py-4 rounded-2xl font-body font-medium mb-2 text-sm"
              style={{ background: 'var(--surface-3)', color: 'var(--text-primary)' }}>
              {t.archiveConfirm}
            </button>
            <button
              onClick={() => setShowArchiveConfirm(false)}
              className="w-full py-3 rounded-2xl font-body text-sm"
              style={{ color: 'var(--text-secondary)' }}>
              {t.archiveCancel}
            </button>
          </div>
        </div>
      )}

      {/* Factory-reset confirm sheet — destructive action with export-first escape hatch */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => !resetting && setShowResetConfirm(false)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6 pb-10 slide-up"
            style={{ background: 'var(--surface-1)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} color="var(--red)" />
                <p className="font-body font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t.resetConfirmTitle}
                </p>
              </div>
              {!resetting && (
                <button onClick={() => setShowResetConfirm(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full"
                  style={{ background: 'var(--surface-3)' }}>
                  <X size={16} color="var(--text-secondary)" />
                </button>
              )}
            </div>

            <p className="text-sm font-body mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t.resetConfirmBody(resetCounts.clients, resetCounts.history)}
            </p>

            {/* Download backup first — clearly offered but not required */}
            <button
              onClick={handleExportBackup}
              disabled={resetting}
              className="w-full py-3 rounded-2xl font-body text-sm mb-2 flex items-center justify-center gap-2"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--text-primary)',
                opacity: resetting ? 0.5 : 1,
              }}>
              <Download size={15} />
              {t.resetBackupFirst}
            </button>

            {/* The irreversible action */}
            <button
              onClick={handleConfirmReset}
              disabled={resetting}
              className="w-full py-4 rounded-2xl font-body font-medium mb-2 text-sm"
              style={{
                background: 'var(--red)',
                color: '#fff',
                opacity: resetting ? 0.5 : 1,
                cursor: resetting ? 'not-allowed' : 'pointer',
              }}>
              {resetting ? t.resetInProgress : t.resetConfirmBtn}
            </button>

            {!resetting && (
              <button
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-3 rounded-2xl font-body text-sm"
                style={{ color: 'var(--text-secondary)' }}>
                {t.resetCancel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ClientForm
          client={editClient}
          mode={mode}
          onSave={handleSaveClient}
          onDelete={handleDeleteClient}
          onClose={() => { setShowForm(false); setEditClientState(null) }}
          t={t}
          lang={lang}
        />
      )}
      {showLegal && <LegalModal onClose={() => setShowLegal(false)} lang={lang} t={t} />}
    </div>
  )
}
