import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import type { Message } from '@/types'
import { cn } from '@/lib/utils'

export const richText = '[&_a]:text-tobacco-700 [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5'

const isAi = (m: Message) => m.authorType === 'claude' || m.authorType === 'grokbot'

export function stamp(iso: string) {
  const d = new Date(iso)
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 864e5)
  return days === 0 ? `Today at ${t}` : days === 1 ? `Yesterday at ${t}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${t}`
}

function Avatar({ m }: { m: Message }) {
  if (isAi(m)) return <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6EDF6] text-[#4A6382]" aria-hidden><Sparkles className="h-3.5 w-3.5" /></span>
  const initials = m.authorName.split(' ').map((w) => w[0]).join('').slice(0, 2)
  return <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold', m.authorType === 'customer' ? 'bg-surface-muted text-ink' : 'bg-brass-100 text-brass-700')} aria-hidden>{initials}</span>
}

function Reasoning({ m, reasoning }: { m: Message; reasoning?: string[] }) {
  const [open, setOpen] = useState(false)
  const items = reasoning?.length ? reasoning : ['Matched the question to published guidance.', 'Checked the order in Shopify before replying.']
  return (
    <div className="mt-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex items-center gap-0.5 rounded text-xs text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`ai-reasoning-toggle-${m.id}`}>
        {open ? 'Hide reasoning' : 'Show reasoning'}<ChevronDown className={cn('h-3 w-3 transition-transform duration-150', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] text-ink/80 animate-in fade-in" data-testid={`ai-reasoning-${m.id}`}>{items.map((r) => <li key={r}>{r}</li>)}</ul>}
    </div>
  )
}

// Customer left, AI and agents right as soft tinted blocks (REQ-1068..1069). Events: one centred single line.
export function MessageItem({ m, reasoning }: { m: Message; channel?: 'email' | 'chat'; email?: string; reasoning?: string[] }) {
  if (m.authorType === 'system') {
    const hand = /^AI handed over/.test(m.body)
    return (
      <li className="flex justify-center py-2" data-testid={`message-${m.id}`} data-author="system">
        <span className="flex min-w-0 max-w-[92%] items-center gap-1.5 text-xs text-ink-muted" title={m.body} data-testid={hand ? 'handoff-line' : 'event-line'}>
          {hand && <Sparkles className="h-3 w-3 shrink-0 text-[#4A6382]" aria-hidden />}
          <span className="truncate">{m.body}</span>
        </span>
      </li>
    )
  }
  const ai = isAi(m)
  const customer = m.authorType === 'customer'
  const tint = customer ? 'bg-[#F7F5F1] rounded-tl-md' : m.isInternal ? 'bg-[#FFF9EB] rounded-tr-md' : ai ? 'bg-[#F5F8FC] rounded-tr-md' : 'bg-[#F9F5EF] rounded-tr-md'
  return (
    <li data-testid={`message-${m.id}`} data-author={m.authorType} data-internal={m.isInternal || undefined} className={cn('flex gap-2.5 py-2', !customer && 'justify-end')}>
      {customer && <Avatar m={m} />}
      <div className={cn('min-w-0 max-w-[86%] rounded-2xl border border-[#EEE9E1] px-3.5 py-3', tint)} data-testid="message-block">
        <p className="flex flex-wrap items-center gap-x-2 text-[13px]" data-testid="message-meta">
          {!customer && (ai
            ? <Sparkles className="h-3.5 w-3.5 text-[#4A6382]" aria-hidden />
            : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brass-100 text-[9px] font-semibold text-brass-700" aria-hidden>{m.authorName.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>)}
          <span className="font-semibold text-ink">{ai ? 'AI' : m.authorName}</span>
          {m.isInternal && <span className="text-[11px] font-medium text-amber-800" data-testid="internal-note-label">Internal note</span>}
          <time dateTime={m.createdAt} title={new Date(m.createdAt).toLocaleString()} className="text-xs text-ink-muted">{stamp(m.createdAt)}</time>
        </p>
        {m.format === 'html'
          ? <div className={cn('mt-1 text-[14px] leading-[1.6] text-ink', richText)} dangerouslySetInnerHTML={{ __html: m.body }} />
          : <p className="mt-1 max-w-[84ch] whitespace-pre-wrap text-[14px] leading-[1.6] text-ink">{m.body}</p>}
        {ai && <Reasoning m={m} reasoning={reasoning} />}
        {m.approvedBy && <p className="mt-1.5 text-xs text-ink-muted" data-testid="approved-by">Approved by {m.approvedBy}</p>}
      </div>
    </li>
  )
}
