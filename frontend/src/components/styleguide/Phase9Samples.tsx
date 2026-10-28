import { useState } from 'react'
import { Bot, MessageSquareQuote, Sparkles } from 'lucide-react'
import type { IntegrationStatus } from '@/types'
import { PageTabs, SaveState, SubTabs } from '@/components/PageTabs'
import { LogoTile, StatusPill } from '@/components/settings/IntegrationsTab'

const I = (p: Partial<IntegrationStatus>) => ({ id: 'loop', name: 'Loop Returns', status: 'connected', configured: true, ...p }) as IntegrationStatus

// Phase 9 patterns: page tabs, sub-tabs, save state, integration status, delivery dots, AI replied banner.
export function Phase9Samples() {
  const [sub, setSub] = useState<'appearance' | 'preferences'>('appearance')
  return (
    <div className="space-y-6" data-testid="sg-phase9">
      <PageTabs label="Sample tabs" testIdPrefix="sg-page-tab" current="voice" tabs={[{ id: 'voice', label: 'Brand voice', to: '/styleguide#phase9', Icon: MessageSquareQuote }, { id: 'replies', label: 'AI replies', to: '/styleguide#phase9', Icon: Sparkles }]} />
      <div className="max-w-md"><SubTabs label="Sample sub-tabs" testIdPrefix="sg-sub-tab" value={sub} onChange={setSub} tabs={[{ id: 'appearance', label: 'Appearance' }, { id: 'preferences', label: 'Preferences' }]} /></div>
      <div className="flex flex-wrap gap-6"><SaveState dirty={false} testId="sg-save-clean" /><SaveState dirty testId="sg-save-dirty" /></div>
      <div className="flex flex-wrap items-center gap-4">
        <LogoTile id="outlook" /><LogoTile id="claude" /><LogoTile id="resend" /><LogoTile id="loop" /><LogoTile id="grokbot" />
        <StatusPill i={I({})} /><StatusPill i={I({ attention: 'Mailbox syncing is turned off.' })} />
        <StatusPill i={I({ configured: false, status: 'not_configured' })} />
        <StatusPill i={I({ status: 'error', error: '401 Unauthorized: key rejected' })} />
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
        {[['bg-slate-400', 'Queued'], ['bg-brass-500', 'Sent'], ['bg-green-600', 'Delivered'], ['bg-red-600', 'Bounced']].map(([c, l]) => <span key={l} className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${c}`} aria-hidden />{l}</span>)}
      </div>
      <div className="flex items-start gap-2.5 rounded-xl bg-[#FAF5EE] px-4 py-2.5 text-sm text-ink ring-1 ring-[#EADFD2]">
        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-tobacco-600" aria-hidden />
        <p><span className="font-semibold">AI replied:</span> AI answered the latest customer message. No staff handoff yet. This ticket isn't resolved.</p>
      </div>
    </div>
  )
}
