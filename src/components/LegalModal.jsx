import React, { useState } from 'react'
import { X } from 'lucide-react'

const PRIVACY_EN = `PRIVACY POLICY
Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

1. DATA WE COLLECT — NONE
Cobrar does not collect, transmit, or store any personal data on any server. All information you enter — client names, addresses, payment amounts, and history — is stored exclusively on your device using your browser's local storage (IndexedDB). We have no servers, no database, and no ability to access your data.

2. DATA THAT NEVER LEAVES YOUR DEVICE
Your client data, payment records, and usage history remain entirely on your device. We cannot see it. We cannot access it. If you uninstall the app or clear your browser data, it is permanently deleted.

3. THIRD-PARTY SERVICES
Cobrar currently uses no third-party analytics, advertising, or tracking services. In the future, if advertising is introduced, this policy will be updated before any such service is activated, and users will be notified.

4. CHILDREN
Cobrar is not directed at children under 13. We do not knowingly collect any information from children.

6. CHANGES
If this policy changes materially, we will update the "Last updated" date above. Continued use after changes constitutes acceptance.

7. CONTACT
Questions? Email: privacy@cobrarapp.com`

const TERMS_EN = `TERMS OF SERVICE
Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

1. ACCEPTANCE
By using Cobrar ("the App"), you agree to these Terms. If you do not agree, do not use the App.

2. DESCRIPTION
Cobrar is a personal payment tracking tool. It is a local-only app — your data is stored on your device. It does not send, receive, or process payments on your behalf.

3. NO WARRANTIES — DISCLAIMER OF LIABILITY
THE APP IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. THE DEVELOPER MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

THE DEVELOPER IS NOT RESPONSIBLE FOR ANY LOSS OF DATA, LOSS OF INCOME, MISSED PAYMENTS, DISPUTES WITH CLIENTS, OR ANY OTHER DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP.

YOU ASSUME ALL RISK FOR YOUR USE OF THE APP AND ANY DECISIONS MADE BASED ON DATA WITHIN IT.

4. YOUR RESPONSIBILITY
You are solely responsible for:
- The accuracy of data you enter
- Acting on payment reminders
- Maintaining your own backups
- Any communications sent using the reminder feature

5. FREE & OPEN SOURCE
Cobrar is free and open source (MIT License). There are no paid tiers, subscriptions, or in-app purchases. The source code is available at https://github.com/awesomefunda/cobrarapp.

6. INTELLECTUAL PROPERTY
Cobrar and its branding are the property of the developer. You may not copy, reverse-engineer, or redistribute the App without permission.

7. GOVERNING LAW
These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles.

8. CHANGES
We may update these Terms. Continued use after changes means you accept the new Terms.

9. CONTACT
Questions? Email: legal@cobrarapp.com`

export default function LegalModal({ onClose, lang, t }) {
  const [tab, setTab] = useState('privacy')

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-[430px] mx-auto rounded-t-3xl flex flex-col slide-up"
        style={{ background: 'var(--surface-1)', maxHeight: '85vh' }}>

        <div className="flex justify-between items-center p-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-body font-medium" style={{ color: 'var(--text-primary)' }}>
            {t.legalTitle}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'var(--surface-3)' }}>
            <X size={16} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pb-4 flex-shrink-0">
          {['privacy', 'terms'].map(tab_key => (
            <button key={tab_key}
              onClick={() => setTab(tab_key)}
              className="px-4 py-2 rounded-xl text-sm font-body font-medium"
              style={{
                background: tab === tab_key ? 'var(--surface-4)' : 'transparent',
                color: tab === tab_key ? 'var(--text-primary)' : 'var(--text-muted)'
              }}>
              {tab_key === 'privacy' ? t.privacy : t.terms}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 pb-10 flex-1">
          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-body"
            style={{ color: 'var(--text-secondary)' }}>
            {tab === 'privacy' ? PRIVACY_EN : TERMS_EN}
          </pre>
        </div>
      </div>
    </div>
  )
}
