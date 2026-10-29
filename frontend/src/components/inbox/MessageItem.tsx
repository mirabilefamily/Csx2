import { useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import type { Message } from '@/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay'
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
  if (isAi(m)) return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1E6D3] text-brass-700" aria-hidden><Sparkles className="h-3.5 w-3.5" /></span>
  const initials = m.authorName.split(' ').map((w) => w[0]).join('').slice(0, 2)
  return <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold', m.authorType === 'customer' ? 'bg-surface-muted text-ink' : 'bg-brass-100 text-brass-700')} aria-hidden>{initials}</span>
}

function Why({ m, reasoning }: { m: Message; reasoning?: string[] }) {
  return (
    <Popover>
      <PopoverTrigger className="rounded px-1 text-xs font-medium text-ink-muted opacity-0 transition-opacity hover:text-ink hover:underline focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 max-sm:opacity-100" data-testid={`ai-reasoning-toggle-${m.id}`}>Why?</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-4 text-[13px]" data-testid={`ai-reasoning-${m.id}`}>
        <p className="font-semibold text-ink">Why the AI said this</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-ink">{(reasoning?.length ? reasoning : ['Matched the question to published guidance.', 'Checked the order in Shopify before replying.']).map((r) => <li key={r}>{r}</li>)}</ul>
        {m.approvedBy && <p className="mt-2 text-xs text-ink-muted">Approved by {m.approvedBy}</p>}
      </PopoverContent>
    </Popover>
  )
}

// Light chat-style message (REQ-1039..1042): no boxes; AI and notes softly tinted; events are one muted centred line.
export function MessageItem({ m, reasoning }: { m: Message; channel?: 'email' | 'chat'; email?: string; reasoning?: string[] }) {
  if (m.authorType === 'system') {
    return (
      <li className="flex justify-center py-2" data-testid={`message-${m.id}`} data-author="system">
        <span className="max-w-[90%] text-center text-xs text-ink-muted" data-testid="event-line">{m.body}</span>
      </li>
    )
  }
  const ai = isAi(m)
  return (
    <li data-testid={`message-${m.id}`} data-author={m.authorType} data-internal={m.isInternal || undefined} className={cn('group -mx-3 flex gap-3 rounded-xl px-3 py-3', ai && 'bg-[#FAF7F2]', m.isInternal && 'bg-[#FFF8E6]')}>
      <Avatar m={m} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]" data-testid="message-meta">
          <span className="font-semibold text-ink">{ai ? 'AI' : m.authorName}</span>
          {m.isInternal && <span className="text-[11px] font-medium text-amber-800" data-testid="internal-note-label">Internal note</span>}
          <time dateTime={m.createdAt} title={new Date(m.createdAt).toLocaleString()} className="text-xs text-ink-muted">{stamp(m.createdAt)}</time>
          {ai && <Why m={m} reasoning={reasoning} />}
        </p>
        {m.format === 'html'
          ? <div className={cn('mt-1 text-[14px] leading-[1.6] text-ink', richText)} dangerouslySetInnerHTML={{ __html: m.body }} />
          : <p className="mt-1 whitespace-pre-wrap text-[14px] leading-[1.6] text-ink">{m.body}</p>}
        {m.approvedBy && !ai && <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-green-700" data-testid="approved-by"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Approved by {m.approvedBy}</p>}
      </div>
    </li>
  )
}
