import { useState } from 'react'
import { BookOpen, ChevronRight, RefreshCw, RotateCcw, ShoppingBag, Sparkles, Ticket as TicketIcon, ShieldAlert } from 'lucide-react'
import type { TicketDetail } from '@/types'
import { assistantApi } from '@/api'
import type { Source } from '@/api/assistant'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { stamp } from './MessageItem'

export const SOURCE_ICON: Record<Source, React.ComponentType<{ className?: string }>> = { guidance: BookOpen, shopify: ShoppingBag, loop: RotateCcw, ticket: TicketIcon, fraud: ShieldAlert }

// "Why you're here" brief (REQ-649..651).
export function WhyBrief({ d }: { d: TicketDetail }) {
  const [gen, setGen] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [how, setHow] = useState(false)
  const b = assistantApi.briefFor(d, gen)
  if (!b) return null
  const refresh = () => { setBusy(true); setTimeout(() => { setGen(new Date().toISOString()); setBusy(false) }, 600) }
  return (
    <section className="mb-5 w-full overflow-hidden rounded-xl border border-[#F1D9B0]/60 bg-surface shadow-glow-ai-sm" aria-label="Why you're here" data-testid="why-brief">
      <button type="button" aria-expanded={how} onClick={() => setHow(!how)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" data-testid="why-brief-header">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-brass-600" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-ink"><span className="text-ink-muted">AI handed this over:</span> <span className="font-medium" data-testid="why-brief-reason">{b.reason}</span></span>
        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-ink-muted">Details<ChevronRight className={cn('h-3.5 w-3.5 transition-transform', how && 'rotate-90')} aria-hidden /></span>
      </button>
      {how && (
      <div className="border-t border-border px-4 pb-4 pt-3">
      {b.summary === null ? (
        <div className="mt-2 flex items-center gap-3" data-testid="why-brief-short">
          <p className="text-[13px] text-ink-muted">Not enough conversation yet to summarize.</p>
          <Button size="sm" variant="outline" className="bg-white" loading={busy} onClick={refresh} data-testid="why-brief-retry">Try again</Button>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs font-medium text-ink-muted">What the AI did</p>
          <ul className="mt-2 space-y-2" data-testid="why-brief-did">
            {b.did.map((x) => {
              const Icon = SOURCE_ICON[x.source]
              const label = assistantApi.SOURCE_LABEL[x.source]
              return (
                <li key={x.text} className="flex items-start gap-2 text-[13px] text-ink">
                  <span className="mt-0.5 inline-flex shrink-0 rounded text-ink-muted" title={label} role="img" tabIndex={0} aria-label={`Source: ${label}`} data-testid={`why-source-${x.source}`}><Icon className="h-4 w-4" /></span>
                  <span>{x.text}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 border-t border-border pt-3 text-[13px] text-ink" data-testid="why-brief-next"><p className="text-xs font-medium text-ink-muted">Suggested next step</p><p className="mt-1">{b.next}</p></div>
        </>
      )}
      {b.stale && (
        <p className="mt-2 flex items-center gap-2 text-xs text-ink" data-testid="why-brief-stale">New messages since this summary.
          <Button size="sm" variant="ghost" className="h-7" loading={busy} onClick={refresh} data-testid="why-brief-refresh"><RefreshCw aria-hidden /> Refresh</Button>
        </p>
      )}
      <dl className="mt-4 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 border-t border-border pt-3 text-xs" data-testid="why-brief-how">
        <dt className="text-ink-muted">Intent</dt><dd className="text-ink">{b.how.intent}</dd>
        <dt className="text-ink-muted">Data checked</dt><dd className="text-ink">{b.how.data.join(' · ')}</dd>
        <dt className="text-ink-muted">Confidence</dt><dd className="text-ink">{b.how.confidence != null ? `${Math.round(b.how.confidence * 100)}%` : '—'}</dd>
      </dl>
      </div>
      )}
    </section>
  )
}
