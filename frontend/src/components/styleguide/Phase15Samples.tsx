import { Mail, MessageCircle } from 'lucide-react'
import type { StepType } from '@/types'
import { AiCard, StatStrip } from '@/components/ai/AiCard'
import { CategoryTile } from '@/components/workflows/stepMeta'
import { Switch } from '@/components/ui/overlay'

const TILES: [StepType, string][] = [['message', 'Talk'], ['send_code', 'Verify'], ['find_orders', 'Shopify'], ['start_return', 'Loop'], ['condition', 'Logic'], ['handover', 'Ticket'], ['end', 'End']]

// Phase 15 AI & Workflows patterns: section card, stats strip, chips, insight row, category tiles.
export function Phase15Samples() {
  return (
    <div className="space-y-6" data-testid="sg-phase15">
      <StatStrip label="Sample stats" testId="sg-p15-strip" cells={[{ label: 'AI resolved', value: '78%', trend: 'Last 30 days' }, { label: 'Handed to a person', value: '22%', trend: 'Went to Needs you' }, { label: 'Auto-sent replies', value: '1,284', trend: 'Sent without review' }, { label: 'Auto-refunds', value: '37', trend: '$1,642.00 refunded' }]} />
      <AiCard title="Auto-send" description="One AI switch per channel." action={<span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">Active</span>}>
        <ul className="max-w-[560px] divide-y divide-border/70 rounded-xl ring-1 ring-border">
          {([['Email', Mail], ['Chat', MessageCircle]] as const).map(([l, I]) => <li key={l} className="flex items-center gap-3 px-4 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted"><I className="h-4 w-4 text-ink-muted" aria-hidden /></span><span className="flex-1 text-sm font-medium text-ink">{l}</span><Switch checked={l === 'Chat'} aria-label={`Sample ${l}`} /></li>)}
        </ul>
      </AiCard>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-green-50 px-3 py-1 text-[13px] text-green-800 ring-1 ring-green-200">Use: happy to help</span>
        <span className="rounded-full bg-red-50 px-3 py-1 text-[13px] text-red-800 ring-1 ring-red-200">Avoid: cheap</span>
        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">82% confident</span>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">Would hand to a person</span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted ring-1 ring-border">2 articles</span>
      </div>
      <ul className="flex flex-wrap gap-3" aria-label="Step category tiles">{TILES.map(([t, l]) => <li key={t} className="flex items-center gap-2 text-xs text-ink"><CategoryTile type={t} />{l}</li>)}</ul>
    </div>
  )
}
