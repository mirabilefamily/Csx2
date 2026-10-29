import { useState } from 'react'
import { ChevronDown, Copy, MoreHorizontal, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AIDraft } from '@/types'
import { Button, buttonVariants } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Props {
  draft: AIDraft
  titles: Record<string, string>
  busy: boolean
  onApprove: (then?: 'resolve' | 'handback') => void
  onEdit: () => void
  onDiscard: () => void
  onWriteOwn: () => void
}

const confTone = (pct: number) => (pct >= 80 ? 'bg-green-50 text-green-800' : pct >= 50 ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800')
const LINK = 'rounded text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Sources({ draft, titles }: { draft: AIDraft; titles: Record<string, string> }) {
  const orders = [...new Set(draft.body.match(/#GB\d+/g) ?? [])].map((o) => `Order ${o}`)
  const all = [...orders, ...draft.guidanceIds.map((id) => titles[id] ?? id)]
  if (!all.length) return null
  return (
    <span className="flex min-w-0 items-center gap-1.5 max-md:hidden" data-testid="draft-sources">
      {all.slice(0, 2).map((s) => <span key={s} className="truncate rounded-md bg-white px-1.5 py-0.5 text-xs text-ink-muted ring-1 ring-inset ring-border max-w-[220px]" title={s} data-testid="draft-source-chip">{s}</span>)}
      {all.length > 2 && <span className="shrink-0 text-xs text-ink-muted" title={all.slice(2).join(', ')} data-testid="draft-source-more">+{all.length - 2}</span>}
    </span>
  )
}

// Draft-first composer (REQ-653..655): header band, body, and actions inside one card.
export function DraftCard({ draft, titles, busy, onApprove, onEdit, onDiscard, onWriteOwn }: Props) {
  const [open, setOpen] = useState(false)
  const tier = draft.tier === 'claude' ? 'AI' : 'Grokbot'
  const pct = Math.round(draft.confidence * 100)
  const copy = async () => { await navigator.clipboard?.writeText(draft.body).catch(() => {}); toast('Draft copied') }
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card" data-testid={`draft-card-${draft.id}`} aria-label={`Draft by ${tier}`}>
      <div className="flex min-w-0 shrink-0 items-center gap-2 px-4 pt-3" data-testid="draft-header">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-brass-600" aria-hidden />
        <p className="shrink-0 text-[13px] font-semibold text-ink" data-testid="draft-label">AI draft <span className="font-normal text-ink-muted">·</span> <span className="font-medium tabular-nums text-ink-muted" data-testid="draft-confidence">{pct}%</span></p>
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'ml-auto shrink-0')} aria-label="More draft actions" data-testid="draft-more"><MoreHorizontal aria-hidden /></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={copy} data-testid="draft-copy"><Copy className="h-4 w-4" aria-hidden /> Copy draft</DropdownMenuItem>
            <DropdownMenuItem disabled={busy} onSelect={onDiscard} className="text-red-700" data-testid="draft-discard"><Trash2 className="h-4 w-4" aria-hidden /> Discard draft</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="px-4 pb-1 pt-1.5" data-testid="draft-body-wrap">
        <p className={cn('whitespace-pre-wrap text-[14px] leading-[1.6] text-ink', !open && 'line-clamp-3')} data-testid="draft-body">{draft.body}</p>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={cn(LINK, 'mt-0.5 inline-flex min-h-7 items-center max-sm:min-h-11')} data-testid="draft-expand">{open ? 'Show less' : 'Show all'}</button>
      </div>
      <div className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-1 max-sm:grid max-sm:grid-cols-2" data-testid="draft-actions">
        <div className="flex max-sm:col-span-2">
          <Button size="sm" className="rounded-r-none max-sm:flex-1" onClick={() => onApprove()} loading={busy} data-testid="draft-approve">Approve &amp; send</Button>
          <DropdownMenu>
            <DropdownMenuTrigger disabled={busy} className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'rounded-l-none border-l border-white/25 px-2')} aria-label="More approve options" data-testid="draft-approve-menu"><ChevronDown className="h-4 w-4" aria-hidden /></DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => onApprove('resolve')} data-testid="draft-approve-resolve">Send &amp; resolve</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onApprove('handback')} data-testid="draft-approve-handback">Send &amp; hand back to AI</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button size="sm" variant="outline" onClick={onEdit} disabled={busy} data-testid="draft-edit"><Pencil aria-hidden /> Edit</Button>
        <button type="button" onClick={onWriteOwn} className={cn(LINK, 'ml-auto min-h-8 max-sm:ml-0 max-sm:min-h-11 max-sm:rounded-md max-sm:border max-sm:border-border')} data-testid="draft-write-own">Write my own</button>
      </div>
    </section>
  )
}
