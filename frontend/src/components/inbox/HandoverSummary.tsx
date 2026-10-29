import { useState } from 'react'
import { ChevronDown, RefreshCw, Sparkles } from 'lucide-react'
import type { TicketDetail } from '@/types'
import { assistantApi } from '@/api'
import { SOURCE_ICON } from './WhyBrief'
import { cn } from '@/lib/utils'

// Handover summary for Needs you tickets (REQ-1070): intent, the ask, what the AI checked.
export function HandoverSummary({ d }: { d: TicketDetail }) {
  const [gen, setGen] = useState<string | undefined>()
  const [open, setOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const b = assistantApi.briefFor(d, gen)
  if (!b) return null
  const handoff = [...d.messages].reverse().find((m) => m.authorType === 'system' && /hand|escalat/i.test(m.body))
  const since = gen ?? handoff?.createdAt
  const newer = !!since && d.messages.some((m) => m.authorType !== 'system' && m.createdAt > since)
  const intent = /damag/i.test(b.how.intent + d.ticket.tags.join(' ')) ? 'Damaged item / replacement' : b.how.intent
  const refresh = () => { setBusy(true); setTimeout(() => { setGen(new Date().toISOString()); setBusy(false) }, 600) }
  return (
    <section aria-label="Handover summary" className="mb-6 rounded-2xl bg-white px-5 py-4 shadow-[0_0_0_1px_rgba(201,150,60,.20),0_10px_30px_-10px_rgba(201,150,60,.35)]" data-testid="handover-summary">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="handover-toggle">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 text-[11px] font-semibold leading-5 text-amber-800 ring-1 ring-amber-200/70"><Sparkles className="h-3 w-3" aria-hidden />Handover</span>
        <span className="rounded-full bg-[#F5F2EE] px-2 text-xs leading-5 text-ink/80" data-testid="handover-intent">{intent}</span>
        <ChevronDown className={cn('ml-auto h-4 w-4 text-ink-muted transition-transform duration-150', !open && '-rotate-90')} aria-hidden />
      </button>
      {open && (
        <div className="animate-in fade-in duration-150">
          <p className="mt-3 text-[14px] font-semibold leading-6 text-ink" data-testid="handover-ask">{b.reason}</p>
          {b.did.length > 0 && (
            <ul className="mt-2.5 space-y-2" data-testid="handover-checked">
              {b.did.slice(0, 3).map((x) => {
                const Icon = SOURCE_ICON[x.source]
                return (
                  <li key={x.text} className="flex items-start gap-2.5 text-[13px] leading-5 text-ink/90">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F7F5F1] text-ink-muted" title={assistantApi.SOURCE_LABEL[x.source]}><Icon className="h-3 w-3" /></span>
                    <span>{x.text}</span>
                  </li>
                )
              })}
            </ul>
          )}
          {newer && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted" data-testid="handover-stale">
              New messages since this summary ·
              <button type="button" onClick={refresh} disabled={busy} className="inline-flex items-center gap-1 text-ink/80 underline-offset-2 transition-colors hover:text-ink hover:underline" data-testid="handover-refresh"><RefreshCw className={cn('h-3 w-3', busy && 'animate-spin')} aria-hidden />Refresh</button>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
