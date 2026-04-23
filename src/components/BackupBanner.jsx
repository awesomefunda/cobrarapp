import React from 'react'
import { Download } from 'lucide-react'
import { exportMonthCSV } from '../db'

export default function BackupBanner({ t, lang, onDismiss }) {
  const now = new Date()
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const handleExport = async () => {
    const csv = await exportMonthCSV(prevYear, prevMonth)
    const blob = new Blob([csv], { type: 'text/csv' })
    const monthName = new Date(prevYear, prevMonth, 1).toLocaleDateString(
      lang === 'es' ? 'es-MX' : 'en-US', { month: 'long', year: 'numeric' })
    const filename = `cobrar-${monthName.replace(/\s/g, '-')}.csv`

    if (navigator.share) {
      try {
        const file = new File([blob], filename, { type: 'text/csv' })
        await navigator.share({ files: [file], title: `Cobrar backup — ${monthName}` })
        onDismiss()
        return
      } catch {}
    }
    // Fallback download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    onDismiss()
  }

  return (
    <div className="mx-4 mb-3 p-4 rounded-2xl flex items-center gap-3"
      style={{ background: 'rgba(198,241,53,0.08)', border: '1px solid rgba(198,241,53,0.2)' }}>
      <div className="flex-1">
        <p className="text-xs font-body font-medium mb-0.5" style={{ color: 'var(--lime)' }}>{t.backupTitle}</p>
        <p className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>{t.backupMsg}</p>
      </div>
      <button onClick={handleExport}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-body font-medium flex-shrink-0"
        style={{ background: 'var(--lime)', color: '#111' }}>
        <Download size={13} />
        {t.backupBtn}
      </button>
    </div>
  )
}
