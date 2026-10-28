import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, ListChecks, MessageSquareText, Package, PlayCircle, RotateCcw, SearchX, Send, Sparkles } from 'lucide-react'
import type { BrandVoice, TestTurn } from '@/types'
import { aiApi } from '@/api'
import { useApi, useDemoState } from '@/hooks/useApi'
import { useIsPhone } from '@/hooks/useIsPhone'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/States'
import { AuthorBadge } from '@/components/AuthorBadge'
import { cn } from '@/lib/utils'

const SCENARIOS: [string, string, string][] = [
  ['Sizing', 'Between sizes for a fedora', "My head measures 22.5 inches. Which size fedora should I order if I'm between sizes?"],
  ['Tracking', 'Tracking hasn’t updated', 'Where is my order? The tracking number has not updated in three days.'],
  ['Returns', 'Return a hat that doesn’t fit', 'How do I return a hat I bought last week? It does not fit.'],
  ['Damaged', 'Arrived crushed, wants a replacement', 'My fedora arrived crushed with a dent in the brim. Can you send a replacement?'],
  ['Wholesale', 'Boutique asking for terms', 'We run a boutique and want to stock your hats. What are your wholesale terms?'],
]
const GUEST = 'guest'
const tone = (c: number, t: number) => (c >= t ? 'bg-green-50 text-green-800 ring-green-200' : c >= t - 10 ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-red-50 text-red-800 ring-red-200')
const decision = (esc: boolean) => (esc ? 'Would hand to a person' : 'Would send')

// Compact insight row under each AI reply; expands to articles, data checked and reasoning (REQ-823).
function Insight({ turn, index }: { turn: TestTurn; index: number }) {
  const r = turn.result!
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 border-t border-border/70 pt-2.5" data-testid={`test-turn-insight-${index}`}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={cn('rounded-full px-2 py-0.5 font-semibold tabular-nums ring-1', tone(r.confidence, r.threshold))} data-testid="confidence-value">{r.confidence}% confident</span>
        <span className={cn('rounded-full px-2 py-0.5 font-medium ring-1', r.wouldEscalate ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-surface-muted text-ink ring-border')} data-testid="sandbox-verdict">{decision(r.wouldEscalate)}</span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-ink-muted ring-1 ring-border" data-testid="sandbox-article-count">{r.articles.length} article{r.articles.length === 1 ? '' : 's'}</span>
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-md px-2 font-medium text-tobacco-700 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11" data-testid={`test-insight-toggle-${index}`}>
          Details <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-3 rounded-xl bg-surface-sunken p-3 text-xs" data-testid={`test-insight-details-${index}`}>
          {r.articles.length === 0 ? <p className="flex items-center gap-1.5 text-ink-muted" data-testid="sandbox-no-articles"><SearchX className="h-3.5 w-3.5" aria-hidden /> No relevant articles found</p> : (
            <ol className="space-y-1" data-testid="sandbox-articles">{r.articles.map((a, i) => <li key={a.id} className="flex items-center gap-2" data-testid={`sandbox-article-${i}`}><span className="w-4 font-semibold text-ink-muted">{i + 1}</span><span className="min-w-0 flex-1 truncate text-ink">{a.title}</span><span className="font-semibold tabular-nums text-ink">{a.score}%</span></li>)}</ol>
          )}
          <p className="flex items-center gap-2 text-ink" data-testid="sandbox-order-context"><Package className="h-3.5 w-3.5 text-ink-muted" aria-hidden />{r.order ? `Checked order ${r.order.number} · ${r.order.status.replace('_', ' ')}` : r.orderNotFound ? `Order ${r.orderNotFound} not found. Tested without order context.` : 'No order checked'}</p>
          <p className="text-ink-muted" data-testid="sandbox-reasoning">Confidence {r.confidence}% vs the {r.threshold}% threshold, so it {r.wouldEscalate ? 'would go to Needs you for a person' : 'would send on its own'}.</p>
        </div>
      )}
    </div>
  )
}

function Turn({ t, i, customer }: { t: TestTurn; i: number; customer: string }) {
  const ai = t.role === 'ai'
  return (
    <article className={cn('w-[78%] rounded-2xl border px-4 py-3 shadow-[0_1px_2px_rgba(31,29,26,0.04)] max-sm:w-[90%]', ai ? 'ml-auto border-border bg-surface' : 'mr-auto border-transparent bg-surface-muted/70')} data-testid={`test-turn-${i}`}>
      <header className="flex items-center gap-2">
        {ai ? <AuthorBadge type="claude" label="AI" /> : <><span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink ring-1 ring-border" aria-hidden>{customer.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span><span className="text-[13px] font-semibold text-ink">{customer}</span></>}
      </header>
      <p className={cn('mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink')} data-testid={ai ? 'sandbox-draft' : undefined}>{t.text}</p>
      {ai && t.result && <Insight turn={t} index={i} />}
    </article>
  )
}

type Run = { label: string; turns: TestTurn[] }

export function ConversationTesting() {
  const demo = useDemoState()
  const isPhone = useIsPhone()
  const { state } = useLocation() as { state: { voice?: BrandVoice } | null }
  const draftVoice = state?.voice
  const customers = useApi(() => aiApi.listTestCustomers(), [])
  const [channel, setChannel] = useState<'email' | 'chat'>('chat')
  const [customerId, setCustomerId] = useState(GUEST)
  const [order, setOrder] = useState('')
  const [message, setMessage] = useState('')
  const [turns, setTurns] = useState<TestTurn[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [running, setRunning] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }) }, [turns, status])
  const customer = customers.data?.find((c) => c.id === customerId)
  const pickCustomer = (id: string) => { setCustomerId(id); setOrder(customers.data?.find((c) => c.id === id)?.orderNumber ?? '') }

  const ask = (history: TestTurn[], text: string) => aiApi.testConversation({ history, message: text, channel, orderNumber: order, voice: draftVoice })
  const send = async (text = message) => {
    if (!text.trim()) return setError('Type a customer message.')
    setError(null); setRuns(null)
    const history = turns
    setTurns([...history, { role: 'customer', text }])
    setMessage('')
    setStatus('loading')
    try { const reply = await ask(history, text); setTurns((t) => [...t, reply]); setStatus('idle') } catch { setStatus('error') }
  }
  const runAll = async () => {
    setRunning(true); setTurns([])
    const out: Run[] = []
    for (const [label, , q] of SCENARIOS) { try { out.push({ label, turns: [{ role: 'customer', text: q }, await ask([], q)] }) } catch { /* skip a failed run */ } }
    setRuns(out); setRunning(false)
  }
  const reset = () => { setTurns([]); setRuns(null); setStatus('idle'); setError(null) }

  const setup = (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-ink" id="test-channel-label">Channel</p>
        <div role="radiogroup" aria-labelledby="test-channel-label" className="mt-1.5 inline-flex gap-1 rounded-lg bg-surface-muted p-1">
          {(['chat', 'email'] as const).map((c) => <button key={c} type="button" role="radio" aria-checked={channel === c} onClick={() => setChannel(c)} className={cn('h-9 rounded-md px-3 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:h-11', channel === c ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`test-channel-${c}`}>{c}</button>)}
        </div>
      </div>
      <div className="max-w-[280px]">
        <Label htmlFor="test-customer">Customer</Label>
        <Select value={customerId} onValueChange={pickCustomer}>
          <SelectTrigger id="test-customer" className="mt-1.5" data-testid="test-customer"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={GUEST} data-testid="test-customer-guest">Guest (no account)</SelectItem>
            {(customers.data ?? []).map((c) => <SelectItem key={c.id} value={c.id} data-testid={`test-customer-${c.id}`}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {customer && <p className="mt-1.5 truncate text-[13px] text-ink-muted" data-testid="test-customer-context">{customer.email}{customer.orderNumber ? ` · latest order ${customer.orderNumber}` : ''}</p>}
      </div>
      <div className="max-w-[280px]">
        <Label htmlFor="sandbox-order">Order (optional)</Label>
        <Input id="sandbox-order" className="mt-1.5" placeholder="#GB20398" value={order} onChange={(e) => setOrder(e.target.value)} data-testid="sandbox-order" />
      </div>
      <p className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs ring-1 ring-border" data-testid="test-voice-source">
        <span className="inline-flex items-center gap-1.5 text-ink-muted"><Sparkles className="h-3.5 w-3.5" aria-hidden />Brand voice</span>
        <span className={cn('rounded-full px-2 py-0.5 font-semibold', draftVoice ? 'bg-amber-50 text-amber-900' : 'bg-green-50 text-green-800')}>{draftVoice ? 'Draft voice' : 'Saved voice'}</span>
      </p>
      <div>
        <p className="text-sm font-medium text-ink">Scenarios</p>
        <ul className="mt-2 grid gap-1.5" aria-label="Scenarios">
          {SCENARIOS.map(([label, desc, q]) => (
            <li key={label}><button type="button" onClick={() => send(q)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ring-1 ring-border transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`sandbox-example-${label.toLowerCase()}`}>
              <MessageSquareText className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              <span className="min-w-0"><span className="block text-[13px] font-semibold text-ink">{label}</span><span className="block truncate text-xs text-ink-muted">{desc}</span></span>
            </button></li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={runAll} loading={running} data-testid="test-run-all"><ListChecks aria-hidden /> Run all scenarios</Button>
        <Button variant="ghost" size="sm" onClick={reset} disabled={!turns.length && !runs} data-testid="test-reset"><RotateCcw aria-hidden /> Reset</Button>
      </div>
      {demo !== 'live' && <p className="text-xs text-ink-muted">Demo state: {demo}. Send a message to see that state.</p>}
    </div>
  )
  const who = customer?.name ?? 'Guest'

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]" data-testid="sandbox-tab">
      {isPhone ? (
        <details className="rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04]" data-testid="test-setup"><summary className="flex min-h-12 cursor-pointer items-center px-4 text-[15px] font-semibold text-ink">Test setup · {who}</summary><div className="px-4 pb-4">{setup}</div></details>
      ) : (
        <section className="self-start rounded-2xl bg-surface p-6 shadow-card ring-1 ring-black/[0.04] lg:sticky lg:top-6" data-testid="test-setup"><h2 className="mb-5 text-[15px] font-semibold text-ink">Test setup</h2>{setup}</section>
      )}
      <section className="flex min-h-[600px] flex-col overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04]" data-testid="sandbox-results">
        <div className="flex-1 space-y-3 overflow-y-auto bg-surface-sunken/50 p-5 max-sm:p-3" aria-live="polite" data-testid="test-thread">
          {runs && !turns.length && (
            <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-border" data-testid="test-runall-table">
              <p className="border-b border-border px-4 py-3 text-[15px] font-semibold text-ink">Results · {runs.length} scenarios</p>
              <div role="table" aria-label="Scenario results" className="text-sm">
                <div role="row" className="grid grid-cols-[minmax(0,1fr)_110px_170px_80px] gap-3 px-4 py-2 text-xs font-medium text-ink-muted max-sm:hidden"><span role="columnheader">Scenario</span><span role="columnheader">Confidence</span><span role="columnheader">Decision</span><span role="columnheader">Articles</span></div>
                {runs.map((r) => { const res = r.turns[1].result!; return (
                  <button key={r.label} type="button" role="row" onClick={() => setTurns(r.turns)} className="grid w-full grid-cols-[minmax(0,1fr)_110px_170px_80px] items-center gap-3 border-t border-border/70 px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring max-sm:grid-cols-2" data-testid={`test-runall-row-${r.label.toLowerCase()}`}>
                    <span role="cell" className="font-medium text-ink">{r.label}</span>
                    <span role="cell"><span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold ring-1', tone(res.confidence, res.threshold))}>{res.confidence}%</span></span>
                    <span role="cell" className="text-[13px] text-ink">{decision(res.wouldEscalate)}</span>
                    <span role="cell" className="text-[13px] tabular-nums text-ink-muted">{res.articles.length}</span>
                  </button>
                ) })}
              </div>
            </div>
          )}
          {turns.length === 0 && !runs && status === 'idle' && (
            <div className="mx-auto flex max-w-[460px] flex-col items-center py-16 text-center" data-testid="test-empty">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface shadow-card ring-1 ring-border"><PlayCircle className="h-5 w-5 text-tobacco-600" aria-hidden /></span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">Chat with the AI as a customer</h3>
              <p className="mt-1 text-sm text-ink-muted">See which guidance it uses, how confident it is, and whether it would hand over.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">{SCENARIOS.map(([l, , q]) => <button key={l} type="button" onClick={() => send(q)} className="min-h-9 rounded-full bg-surface px-3 text-xs font-medium text-ink ring-1 ring-border hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11" data-testid={`test-empty-${l.toLowerCase()}`}>{l}</button>)}</div>
            </div>
          )}
          {runs && turns.length > 0 && <button type="button" onClick={() => setTurns([])} className="text-xs font-medium text-tobacco-700 underline underline-offset-2" data-testid="test-runall-back">Back to results</button>}
          {turns.map((t, i) => <Turn key={i} t={t} i={i} customer={who} />)}
          {status === 'loading' && <div className="space-y-2" data-testid="sandbox-loading"><Skeleton className="h-24 w-full rounded-2xl" /></div>}
          {running && <Skeleton className="h-48 w-full rounded-xl" />}
          {status === 'error' && <ErrorState compact title="The AI didn't respond" onRetry={() => { const last = turns[turns.length - 1]; setTurns(turns.slice(0, -1)); send(last.text) }} testId="sandbox-error" />}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="border-t border-border p-3">
          <Label htmlFor="sandbox-question" className="sr-only">Customer message</Label>
          <div className="flex items-end gap-2">
            <Textarea id="sandbox-question" rows={2} className="min-h-[48px] flex-1 resize-none" placeholder={turns.length ? `Reply as ${who}…` : 'Type what the customer says…'} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} aria-invalid={!!error} data-testid="sandbox-question" />
            <Button type="submit" loading={status === 'loading'} data-testid="sandbox-run"><Send aria-hidden /> Send</Button>
          </div>
          <FieldError>{error}</FieldError>
        </form>
      </section>
    </div>
  )
}
