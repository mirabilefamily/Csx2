import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowUp, PanelRightOpen, PlayCircle, RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { BrandVoice, TestTurn } from '@/types'
import { aiApi, viewsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetCloseButton, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AuthorBadge } from '@/components/AuthorBadge'
import { cn } from '@/lib/utils'
import { chipTone, DECISION_SHORT, decisionKind, ScenarioCards, ScenariosMenu, SCENARIOS, strong } from './testing/parts'
import { InspectorBody } from './testing/Inspector'
import { Scorecard, type Run } from './testing/Scorecard'
import { GUEST, SetupRail } from './testing/SetupRail'

const useWidth = () => { const [w, setW] = useState(window.innerWidth); useEffect(() => { const on = () => setW(window.innerWidth); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, []); return w }

// Fills the viewport below its top edge so only the thread scrolls (REQ-976).
function useFillHeight() {
  const ref = useRef<HTMLDivElement>(null)
  const [h, setH] = useState<{ height: number; marginBottom: number }>()
  useLayoutEffect(() => {
    // Cancel the page's bottom padding so the workspace ends 24px above the fold without page scroll.
    const on = () => { const el = ref.current; if (!el) return; const pad = parseFloat(getComputedStyle(el.closest('main') ?? document.body).paddingBottom) || 0; setH({ height: Math.max(460, Math.floor(innerHeight - (el.getBoundingClientRect().top + scrollY) - 24)), marginBottom: Math.min(0, 24 - pad) }) }
    on(); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on)
  }, [])
  return [ref, h] as const
}

function MetaLine({ t, i, selected, onInspect, label }: { t: TestTurn; i: number; selected: boolean; onInspect: () => void; label: string }) {
  const r = t.result!
  const k = decisionKind(r)
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2.5 text-xs" data-testid={`test-turn-insight-${i}`}>
      <span className={cn('rounded-full px-2 py-0.5 font-semibold tabular-nums ring-1', chipTone(r.confidence, r.threshold))} data-testid="confidence-value">{r.confidence}%</span>
      <span className={cn('rounded-full px-2 py-0.5 font-medium ring-1', k === 'handoff' ? 'bg-amber-50 text-amber-900 ring-amber-200' : k === 'workflow' ? 'bg-sky-50 text-sky-900 ring-sky-200' : 'bg-surface-muted text-ink ring-border')} data-testid="sandbox-verdict">{r.workflow ? `Would start workflow: ${r.workflow.name}` : DECISION_SHORT[k]}</span>
      <span className="text-ink-muted" data-testid="sandbox-article-count">{strong(r).length} {strong(r).length === 1 ? 'source' : 'sources'}</span>
      <button type="button" aria-pressed={label === 'Inspect' ? selected : undefined} aria-expanded={label === 'Details' ? selected : undefined} onClick={onInspect} className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-md px-2 font-medium text-tobacco-700 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11" data-testid={`test-insight-toggle-${i}`}>
        <PanelRightOpen className="h-3.5 w-3.5" aria-hidden />{label}
      </button>
    </div>
  )
}

function Turn({ t, i, customer, selected, wide, children, onSelect }: { t: TestTurn; i: number; customer: string; selected: boolean; wide: boolean; children?: React.ReactNode; onSelect: () => void }) {
  const ai = t.role === 'ai'
  return (
    <article onClick={ai && wide ? onSelect : undefined} className={cn('w-[78%] rounded-2xl border px-4 py-3 shadow-[0_1px_2px_rgba(31,29,26,0.04)] transition-[box-shadow,border-color] duration-150 max-sm:w-[92%]', ai ? 'ml-auto border-border bg-surface' : 'mr-auto border-transparent bg-surface-muted/70', ai && wide && 'cursor-pointer hover:border-ink/20', selected && 'border-tobacco-600/60 ring-2 ring-tobacco-600/15')} data-testid={`test-turn-${i}`} data-selected={selected || undefined}>
      <header className="flex items-center gap-2">
        {ai ? <AuthorBadge type="claude" label="AI" /> : <><span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink ring-1 ring-border" aria-hidden>{customer.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span><span className="text-xs font-medium text-ink">{customer}</span></>}
      </header>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink" data-testid={ai ? 'sandbox-draft' : undefined}>{t.text}</p>
      {children}
    </article>
  )
}

function Composer({ onSend, busy, name }: { onSend: (t: string) => void; busy: boolean; name: string }) {
  const [v, setV] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(160, el.scrollHeight)}px` } }, [v])
  const go = () => { if (!v.trim() || busy) return; onSend(v.trim()); setV('') }
  return (
    <form onSubmit={(e) => { e.preventDefault(); go() }} className="shrink-0 border-t border-border bg-surface p-3 max-sm:pb-[calc(12px+env(safe-area-inset-bottom))]" data-testid="test-composer">
      <div className="flex items-end gap-2 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-ring">
        <label htmlFor="sandbox-question" className="sr-only">Customer message</label>
        <textarea ref={ref} id="sandbox-question" rows={1} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go() } }} placeholder={name === 'Guest' ? 'Reply as the customer…' : `Reply as ${name}…`} className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none max-sm:text-base" data-testid="sandbox-question" />
        <button type="submit" disabled={!v.trim() || busy} aria-label="Send as customer" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tobacco-700 text-white transition-[background-color,transform] duration-150 hover:bg-tobacco-800 active:scale-95 disabled:bg-surface-muted disabled:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-sm:h-11 max-sm:w-11" data-testid="sandbox-run"><ArrowUp className="h-4 w-4" aria-hidden /></button>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-ink-muted max-sm:hidden">Enter to send · Shift+Enter for a new line · Test chats are never saved to Inbox</p>
    </form>
  )
}

export function ConversationTesting() {
  const w = useWidth()
  const mode = w >= 1280 ? 'rail' : w >= 1024 ? 'sheet' : 'inline'
  const { state } = useLocation() as { state: { voice?: BrandVoice } | null }
  const draftVoice = state?.voice
  const customers = useApi(() => aiApi.listTestCustomers(), [])
  const threshold = viewsApi.aiThreshold()
  const [channel, setChannel] = useState<'email' | 'chat'>('chat')
  const [customerId, setCustomerId] = useState(GUEST)
  const [order, setOrder] = useState('')
  const [turns, setTurns] = useState<TestTurn[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [lastText, setLastText] = useState('')
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [fromRuns, setFromRuns] = useState(false)
  const [running, setRunning] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const [sheet, setSheet] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [wsRef, height] = useFillHeight()
  const thread = useRef<HTMLDivElement>(null)
  useEffect(() => { thread.current?.scrollTo?.({ top: thread.current.scrollHeight, behavior: 'smooth' }) }, [turns, status])
  // Newest AI reply is selected by default (REQ-990).
  useEffect(() => { const last = turns.map((t, i) => (t.role === 'ai' ? i : -1)).filter((i) => i >= 0).pop(); setSel(mode === 'inline' ? null : last ?? null) }, [turns.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const customer = customers.data?.find((c) => c.id === customerId)
  const pickCustomer = (id: string) => { setCustomerId(id); setOrder(customers.data?.find((c) => c.id === id)?.orderNumber ?? '') }

  const ask = (history: TestTurn[], text: string) => aiApi.testConversation({ history, message: text, channel, orderNumber: order, voice: draftVoice })
  const reply = async (history: TestTurn[], text: string) => {
    setStatus('loading'); setLastText(text)
    try { const r = await ask(history, text); setTurns((t) => [...t, r]); setStatus('idle') } catch { setStatus('error') }
  }
  const send = (text: string) => { setRuns(null); setFromRuns(false); const h = turns; setTurns([...h, { role: 'customer', text }]); void reply(h, text) }
  const retry = () => void reply(turns.slice(0, -1), lastText)
  const runAll = async () => {
    setRunning(true); setTurns([]); setFromRuns(false); setStatus('idle')
    const out: Run[] = []
    for (const [label, , q] of SCENARIOS) { try { out.push({ label, turns: [{ role: 'customer', text: q }, await ask([], q)] }) } catch { /* skip a failed run */ } }
    setRuns(out); setRunning(false)
  }
  const reset = () => { setTurns([]); setRuns(null); setFromRuns(false); setStatus('idle'); setSel(null) }
  const inspect = (i: number) => { if (mode === 'inline') setSel((s) => (s === i ? null : i)); else { setSel(i); if (mode === 'sheet') setSheet(true) } }

  const rail = <SetupRail channel={channel} setChannel={setChannel} customers={customers.data ?? []} customerId={customerId} pickCustomer={pickCustomer} order={order} setOrder={setOrder} draftVoice={!!draftVoice} threshold={threshold} />
  const selected = sel !== null ? turns[sel]?.result : undefined
  const showScore = runs && !fromRuns
  const name = customer?.name ?? 'Guest'

  return (
    <div ref={wsRef} style={mode === 'inline' ? undefined : height} className={cn('grid gap-4', mode === 'rail' ? 'grid-cols-[288px_minmax(0,1fr)_340px]' : mode === 'sheet' ? 'grid-cols-[280px_minmax(0,1fr)]' : 'grid-cols-1')} data-testid="test-workspace">
      {mode !== 'inline' && <aside className="min-h-0 overflow-y-auto rounded-xl bg-surface p-4 ring-1 ring-border" aria-label="Test setup" data-testid="test-setup">{rail}</aside>}

      <section className={cn('flex min-h-0 flex-col overflow-hidden rounded-xl bg-surface-sunken ring-1 ring-border', mode === 'inline' && 'h-[calc(100dvh-220px)] min-h-[520px]')} aria-label="Test chat" data-testid="test-chat">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
          <p className="mr-auto min-w-0 truncate text-sm text-ink" data-testid="test-chat-context"><span className="font-semibold capitalize">{channel}</span> <span className="text-ink-muted">· {name}{order.trim() ? ` · ${order.trim()}` : ''}</span></p>
          {mode === 'inline' && <Button size="sm" variant="ghost" onClick={() => setSetupOpen(true)} data-testid="test-setup-open"><SlidersHorizontal aria-hidden /> Test setup</Button>}
          <ScenariosMenu onPick={send} disabled={running || status === 'loading'} />
          <Button size="sm" variant="ghost" onClick={runAll} loading={running} data-testid="test-run-all"><PlayCircle aria-hidden /> Run all scenarios</Button>
          <Button size="sm" variant="ghost" onClick={reset} disabled={running || (!turns.length && !runs)} data-testid="test-reset"><RotateCcw aria-hidden /> Reset</Button>
        </header>
        <div ref={thread} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" data-testid="test-thread" aria-live="polite">
          {fromRuns && <button type="button" onClick={() => { setFromRuns(false); setTurns([]) }} className="mb-4 inline-flex min-h-8 items-center gap-1.5 rounded-md text-[13px] font-medium text-tobacco-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="test-runall-back"><ArrowLeft className="h-3.5 w-3.5" aria-hidden />Back to results</button>}
          {running ? <div className="space-y-2" data-testid="test-runall-loading">{SCENARIOS.map(([l]) => <Skeleton key={l} className="h-11 w-full" />)}</div>
            : showScore ? <Scorecard runs={runs} onOpen={(r) => { setTurns(r.turns); setFromRuns(true) }} />
            : turns.length === 0 && status === 'idle' ? <ScenarioCards onPick={send} />
            : (
              <div className="mx-auto flex max-w-[820px] flex-col gap-4">
                {turns.map((t, i) => (
                  <Turn key={i} t={t} i={i} customer={name} selected={mode !== 'inline' && sel === i} wide={mode !== 'inline'} onSelect={() => inspect(i)}>
                    {t.role === 'ai' && t.result && <MetaLine t={t} i={i} selected={sel === i} onInspect={() => inspect(i)} label={mode === 'rail' ? 'Inspect' : 'Details'} />}
                    {mode === 'inline' && sel === i && t.result && <div className="mt-3 rounded-xl bg-surface-sunken p-3"><InspectorBody r={t.result} testId={`test-insight-details-${i}`} /></div>}
                  </Turn>
                ))}
                {status === 'loading' && <div className="ml-auto flex items-center gap-1 rounded-2xl border border-border bg-surface px-4 py-3" role="status" aria-label="AI is typing" data-testid="sandbox-loading">{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted" style={{ animationDelay: `${d * 140}ms` }} />)}</div>}
                {status === 'error' && <div className="ml-auto flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-testid="sandbox-error">Couldn’t get a reply. Try again.<Button size="sm" variant="outline" onClick={retry} data-testid="sandbox-retry">Retry</Button></div>}
              </div>
            )}
        </div>
        <Composer onSend={send} busy={status === 'loading' || running} name={name} />
      </section>

      {mode === 'rail' && (
        <aside className="min-h-0 overflow-y-auto rounded-xl bg-surface p-4 ring-1 ring-border" aria-label="Reply details" data-testid="test-inspector-panel">
          <p className="mb-4 text-[15px] font-semibold text-ink">Reply details{sel !== null && selected ? <span className="ml-1.5 text-[13px] font-normal text-ink-muted">· reply {turns.slice(0, sel + 1).filter((t) => t.role === 'ai').length}</span> : null}</p>
          {selected ? <InspectorBody r={selected} /> : <p className="text-[13px] text-ink-muted" data-testid="test-inspector-empty">Send a message, then pick any AI reply to see its confidence, sources and decision.</p>}
        </aside>
      )}
      {mode === 'sheet' && (
        <Sheet open={sheet && !!selected} onOpenChange={setSheet}>
          <SheetContent className="sm:max-w-[400px]" aria-describedby={undefined} data-testid="test-inspector-sheet">
            <div className="flex items-center justify-between border-b border-border px-5 py-3"><SheetTitle className="text-[15px] font-semibold">Reply details</SheetTitle><SheetCloseButton /></div>
            <div className="overflow-y-auto p-5">{selected && <InspectorBody r={selected} />}</div>
          </SheetContent>
        </Sheet>
      )}
      {mode === 'inline' && (
        <Sheet open={setupOpen} onOpenChange={setSetupOpen}>
          <SheetContent className="sm:max-w-[400px]" aria-describedby={undefined} data-testid="test-setup">
            <div className="flex items-center justify-between border-b border-border px-5 py-3"><SheetTitle className="text-[15px] font-semibold">Test setup</SheetTitle><SheetCloseButton /></div>
            <div className="overflow-y-auto p-5">{rail}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
