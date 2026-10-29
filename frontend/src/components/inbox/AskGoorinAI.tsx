import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, X } from 'lucide-react'
import { assistantApi, inboxApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { shortId } from '@/lib/inboxViews'
import { SOURCE_ICON } from './WhyBrief'
import type { AssistantAnswer } from '@/api/assistant'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Turn { q: string; a?: AssistantAnswer }

// "Ask Goorin AI" side panel (MOCKED). Answers come from the open ticket's seed data.
export function AskGoorinAI({ open, onOpenChange, ticketId, onInsert, inline }: { open: boolean; onOpenChange: (o: boolean) => void; ticketId: string | null; onInsert?: (text: string) => void; inline?: boolean }) {
  const { data, loading } = useApi(() => (ticketId && open ? inboxApi.getTicketDetail(ticketId) : Promise.resolve(null)), [ticketId, open])
  const detail = data ?? null
  const ready = !ticketId || !!detail || !loading
  const [turns, setTurns] = useState<Turn[]>([])
  const [q, setQ] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => setTurns([]), [ticketId])
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }) }, [turns])
  const ask = async (question: string) => {
    if (!question.trim()) return
    setQ('')
    setTurns((t) => [...t, { q: question }])
    const a = await assistantApi.ask(question, detail).catch(() => ({ text: "Goorin AI didn't respond. Try again.", sources: [] }))
    setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, a } : x)))
  }
  const prompts = detail ? assistantApi.PROMPTS_TICKET : assistantApi.PROMPTS_GLOBAL
  const header = (
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Sparkles className="h-4 w-4 text-ink-muted" aria-hidden />
          <SheetTitle className="flex-1 text-base font-semibold text-ink">Ask Goorin AI</SheetTitle>
          <Button variant="ghost" size="icon-sm" aria-label="Close Ask Goorin AI" onClick={() => onOpenChange(false)} data-testid="ask-ai-close"><X aria-hidden /></Button>
        </div>
  )
  const body = (
    <>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
          <p className="text-sm text-ink-muted">Context <span className="ml-1 inline-flex items-center rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-ink" data-testid="ask-ai-context">{detail ? `${shortId(detail.ticket.id)} · ${detail.ticket.customer.name}` : ticketId ? shortId(ticketId) : 'Whole inbox'}</span></p>
          {!ready ? <p className="text-sm text-ink-muted" role="status" data-testid="ask-ai-loading">Reading this ticket…</p> : <div className="flex flex-wrap gap-1.5">{prompts.map((p) => <button key={p} type="button" onClick={() => ask(p)} className="min-h-9 rounded-full border border-border-strong px-3 text-xs font-medium text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`ask-ai-prompt-${prompts.indexOf(p)}`}>{p}</button>)}</div>}
          {turns.map((t, i) => (
            <div key={i} className="space-y-2" data-testid={`ask-ai-turn-${i}`}>
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-surface-muted px-3.5 py-2 text-sm text-ink">{t.q}</p>
              {t.a ? (
                <div className="rounded-2xl rounded-tl-md border border-border bg-surface px-3.5 py-2.5">
                  <p className="whitespace-pre-wrap text-sm text-ink" data-testid="ask-ai-answer">{t.a.text}</p>
                  {t.a.sources.length > 0 && <div className="mt-2 flex flex-wrap gap-1" data-testid="ask-ai-sources">{t.a.sources.map((s) => { const Icon = SOURCE_ICON[s]; return <span key={s} className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-ink-muted" data-testid={`ask-ai-source-${s}`}><Icon className="h-3 w-3" />{assistantApi.SOURCE_LABEL[s]}</span> })}</div>}
                  {t.a.draft && onInsert && <Button size="sm" variant="outline" className="mt-2 bg-white" onClick={() => { onInsert(t.a!.draft!); onOpenChange(false) }} data-testid="ask-ai-insert">Insert into reply</Button>}
                </div>
              ) : <p className="text-sm text-ink-muted" role="status" data-testid="ask-ai-typing">Goorin AI is typing…</p>}
            </div>
          ))}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q) }} className="flex gap-2 border-t border-border p-3">
          <Input aria-label="Ask Goorin AI" placeholder="Ask anything about this ticket…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="ask-ai-input" />
          <Button type="submit" aria-label="Send question" data-testid="ask-ai-send"><Send aria-hidden /></Button>
        </form>
    </>
  )
  if (inline) return <div className="flex h-full min-h-0 flex-col" data-testid="ask-ai-inline">{body}</div>
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-[420px]" aria-describedby={undefined} data-testid="ask-ai-panel">{header}{body}</SheetContent>
    </Sheet>
  )
}
