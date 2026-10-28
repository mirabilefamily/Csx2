import { useEffect, useRef, useState } from 'react'
import { Inbox, RotateCcw, Send, X } from 'lucide-react'
import type { TestRun, Workflow, WorkflowChannel } from '@/types'
import { viewsApi, workflowsApi } from '@/api'
import { startRun, replyRun } from '@/lib/workflowRuntime'
import { matchesTrigger } from '@/lib/workflowGraph'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PillTabs } from '@/components/dashboard/Panel'
import { usd } from '@/lib/format'
import { cn } from '@/lib/utils'

const deps = { findOrders: workflowsApi.findOrdersByEmail, resolve: workflowsApi.resolveDraft, get refundLimit() { return viewsApi.autoRefundLimit() } }
type W = Pick<Workflow, 'id' | 'steps' | 'edges'>

export function ChatThread({ run, onReply, testId, idle }: { run: TestRun; onReply: (t: string) => void; testId: string; idle?: { hint: string; quickReply?: string } }) {
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }) }, [run.chat.length])
  const last = idle ? (idle.quickReply ? { buttons: [idle.quickReply] } : undefined) : run.chat[run.chat.length - 1]
  const send = (t: string) => { if (t.trim()) { onReply(t.trim()); setText('') } }
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid={testId}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {idle && run.chat.length === 0 && <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs text-ink-muted" data-testid="test-idle-hint">{idle.hint}</p>}
        {run.chat.map((m) => (
          <div key={m.id} className={cn('flex', m.from === 'customer' ? 'justify-end' : 'justify-start')} data-testid={`run-msg-${m.from}`}>
            <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-[13px]', m.from === 'customer' ? 'bg-tobacco-700 text-white' : 'bg-surface-muted text-ink')}>
              {m.photos ? <span className="mb-1 flex gap-1" data-testid="run-photos">{Array.from({ length: m.photos }, (_, i) => <span key={i} className="h-10 w-10 rounded-md bg-white/30 ring-1 ring-white/40" aria-hidden />)}</span> : null}
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.link && <a href={m.link.url} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-tobacco-700 underline" data-testid="run-link">{m.link.label}</a>}
              {m.orders && (
                <ul className="mt-2 space-y-2" data-testid="run-orders">
                  {m.orders.map((o) => (
                    <li key={o.number} className="rounded-lg bg-surface p-2 text-xs text-ink" data-testid={`run-order-${o.number.replace('#', '')}`}>
                      <p className="font-semibold">{o.number} · {o.date} · {usd(o.total)}</p><p className="text-ink-muted">{o.items}</p><p className="text-ink-muted">{o.status}</p>
                      {o.trackingUrl && <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="font-medium text-tobacco-700 underline">Track package</a>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {typeof run.vars.switchedTo === 'string' && <p className="text-center text-xs font-medium text-tobacco-700" data-testid="test-switched">Switched to {run.vars.switchedTo}</p>}
        {run.ended && <p className="text-center text-xs text-ink-muted" data-testid="run-ended">Run {run.ended}</p>}
        <div ref={end} />
      </div>
      {last?.buttons && !run.ended && <div className="flex flex-wrap gap-1.5 px-3 pb-2">{last.buttons.map((b) => <Button key={b} size="sm" variant="outline" onClick={() => send(b)} data-testid={`run-button-${b.replace(/\W+/g, '-').toLowerCase()}`}>{b}</Button>)}</div>}
      <form className="flex gap-2 border-t border-border p-2" onSubmit={(e) => { e.preventDefault(); send(text) }}>
        <Input className="h-9" value={text} onChange={(e) => setText(e.target.value)} placeholder={run.ended ? 'Run ended' : idle ? 'Message as the customer' : 'Reply as the customer'} disabled={!!run.ended} aria-label="Reply as the customer" data-testid={`${testId}-input`} />
        <Button size="icon-sm" type="submit" className="h-9 w-9" aria-label="Send" disabled={!!run.ended} data-testid={`${testId}-send`}><Send aria-hidden /></Button>
      </form>
    </div>
  )
}

export function MockInbox({ run, testId = 'mock-inbox' }: { run: TestRun; testId?: string }) {
  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" data-testid={testId}>
      {run.inbox.length === 0 ? <p className="text-xs text-ink-muted" data-testid={`${testId}-empty`}>No emails yet.</p> : run.inbox.map((m, i) => (
        <article key={m.id} className={cn('rounded-lg border border-border bg-surface p-3 text-xs', i > 0 && 'opacity-70')} data-testid={`${testId}-email`}>
          <p className="font-semibold text-ink" data-testid={`${testId}-subject`}>{m.subject}</p>
          <p className="text-ink-muted">From {m.from} · to {m.to}</p>
          <p className="mt-1 whitespace-pre-wrap text-ink" data-testid={`${testId}-body`}>{m.body}</p>
        </article>
      ))}
    </div>
  )
}

// Test workflow panel (REQ-750..755): tests the unsaved editor state.
export function TestPanel({ wf, onCurrent, onClose, label = 'Testing draft' }: { wf: W & Pick<Workflow, 'trigger'>; onCurrent: (id: string | null) => void; onClose: () => void; label?: string }) {
  const [channel, setChannel] = useState<WorkflowChannel>('chat')
  const [sender, setSender] = useState('margaret.okonkwo@example.com')
  const blank = (ch: WorkflowChannel): TestRun => ({ workflowId: wf.id, channel: ch, vars: {}, current: null, waitingFor: null, attempts: 0, chat: [], inbox: [], log: [], ended: null })
  const [run, setRun] = useState<TestRun>(() => blank('chat'))
  const idle = run.channel === 'chat' && !run.log.length && !run.ended
  const reply = (t: string) => {
    if (!idle) return setRun(replyRun(wf, run, t, deps))
    if (matchesTrigger(wf.trigger, t)) return setRun(startRun(wf, 'chat', deps, undefined, t))
    setRun({ ...run, chat: [...run.chat, { id: `c${Date.now()}`, from: 'customer', text: t }, { id: `b${Date.now()}`, from: 'bot', text: `That message doesn't match this workflow's trigger. Try “${wf.trigger.phrases[0] ?? wf.trigger.quickReply ?? ''}”.` }] })
  }
  const [phoneTab, setPhoneTab] = useState<'chat' | 'inbox'>('chat')
  const reset = (ch = channel) => setRun(ch === 'chat' ? blank('chat') : startRun(wf, ch, deps, sender))
  useEffect(() => { onCurrent(run.ended && run.ended !== "completed" && !run.ended.startsWith("handed") ? null : run.current) }, [run.current, run.ended])
  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-border bg-surface" aria-label="Test workflow" data-testid="test-panel">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h3 className="flex-1 text-[15px] font-semibold text-ink">Test workflow <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900" data-testid="test-version">{label}</span></h3>
        <Button size="sm" variant="outline" onClick={() => reset()} data-testid="test-reset"><RotateCcw aria-hidden /> Reset</Button>
        <Button size="icon-sm" variant="ghost" aria-label="Close test panel" onClick={onClose} data-testid="test-close"><X aria-hidden /></Button>
      </div>
      <div className="space-y-2 border-b border-border px-4 py-3">
        <PillTabs tabs={[{ id: 'chat', label: 'Chat' }, { id: 'form', label: 'Contact form' }, { id: 'email', label: 'Email' }]} value={channel} onChange={(c) => { setChannel(c); reset(c) }} label="Test channel" testId="test-channel" />
        {channel !== 'chat' && <label className="flex items-center gap-2 text-xs text-ink-muted">From<Input className="h-8" value={sender} onChange={(e) => setSender(e.target.value)} onBlur={() => reset()} data-testid="test-sender" /></label>}
        <p className="text-xs text-ink-muted">Try margaret.okonkwo@example.com (orders) or new.customer@example.com (no orders).</p>
      </div>
      <div className="flex border-b border-border sm:hidden"><PillTabs tabs={[{ id: 'chat', label: 'Chat' }, { id: 'inbox', label: `Inbox (${run.inbox.length})` }]} value={phoneTab} onChange={setPhoneTab} label="Test view" testId="test-phone-tab" /></div>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,0.8fr)_auto] max-sm:grid-rows-[minmax(0,1fr)_auto]">
        <div className={cn('flex min-h-0 flex-col', phoneTab !== 'chat' && 'max-sm:hidden')}><ChatThread run={run} onReply={reply} testId="test-chat" idle={idle ? { hint: `Type a message a customer might send, e.g. '${(wf.trigger.phrases[0] ?? 'where is my order').toLowerCase()}'`, quickReply: wf.trigger.quickReply ?? undefined } : undefined} /></div>
        <section className={cn('flex min-h-0 flex-col border-t border-border bg-surface-sunken', phoneTab !== 'inbox' && 'max-sm:hidden')} aria-label="Customer inbox (mock)">
          <p className="flex items-center gap-1.5 px-3 pt-2 text-xs font-semibold text-ink"><Inbox className="h-4 w-4" aria-hidden />Customer inbox (mock)</p>
          <MockInbox run={run} />
        </section>
        <details className="border-t border-border px-4 py-2" data-testid="run-log"><summary className="cursor-pointer text-xs font-semibold text-ink">Run log ({run.log.length})</summary>
          <ol className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs">{run.log.map((l, i) => <li key={i} className={l.ok ? 'text-ink-muted' : 'text-red-700'}>{l.text}</li>)}</ol>
        </details>
      </div>
    </aside>
  )
}
