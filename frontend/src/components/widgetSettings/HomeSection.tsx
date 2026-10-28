import { useState } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { StarterAction, WidgetSettings, WidgetStarter } from '@/types'
import { workflowsApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Switch, TextField } from './fields'
import type { Update } from './validate'


export const MAX_STARTERS = 8
// Validation copy per REQ-798.
export function starterError(st: WidgetStarter): string | null {
  if (!st.label.trim()) return 'Add a label.'
  if (st.label.length > 40) return 'Keep it to 40 characters.'
  if (st.action === 'workflow' && !st.workflowId) return 'Choose a workflow.'
  if (st.action === 'link' && !/^https?:\/\/\S+\.\S+/.test(st.url ?? '')) return 'Enter a valid URL.'
  return null
}

const SEL = 'h-9 w-full rounded-lg border border-border-strong bg-surface px-2 text-sm text-ink'

function StarterRow({ st, i, n, onChange, onRemove, onMove, drag }: { st: WidgetStarter; i: number; n: number; onChange: (s: WidgetStarter) => void; onRemove: () => void; onMove: (to: number) => void; drag: { from: number | null; set: (v: number | null) => void } }) {
  const err = starterError(st)
  const choices = workflowsApi.starterWorkflowChoices()
  return (
    <li onDragOver={(e) => { if (drag.from !== null && drag.from !== i) e.preventDefault() }} onDrop={(e) => { e.preventDefault(); if (drag.from !== null && drag.from !== i) onMove(i); drag.set(null) }} className={cn('rounded-xl border border-border bg-surface p-3', drag.from === i && 'opacity-60')} data-testid={`starter-row-${i}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(i)); drag.set(i) }} onDragEnd={() => drag.set(null)} className="flex h-9 w-5 cursor-grab items-center justify-center text-ink-subtle" title="Drag to reorder" aria-hidden data-testid={`starter-grip-${i}`}><GripVertical className="h-4 w-4" /></span>
        <Input value={st.label} maxLength={60} onChange={(e) => onChange({ ...st, label: e.target.value })} aria-label={`Starter ${i + 1} label`} aria-invalid={!!err && !st.label.trim() || st.label.length > 40} className="h-9 min-w-0 flex-1 basis-48 max-w-[480px]" data-testid={`starter-label-${i}`} />
        <select value={st.action} onChange={(e) => onChange({ ...st, action: e.target.value as StarterAction })} aria-label={`Starter ${i + 1} action`} className={cn(SEL, 'w-44')} data-testid={`starter-action-${i}`}>
          <option value="ai">Ask the AI</option><option value="workflow">Start a workflow</option><option value="link">Open a link</option>
        </select>
        <span className="ml-auto flex items-center">
          <Button variant="ghost" size="icon-sm" disabled={i === 0} aria-label={`Move starter ${i + 1} up`} onClick={() => onMove(i - 1)} data-testid={`starter-up-${i}`}>↑</Button>
          <Button variant="ghost" size="icon-sm" disabled={i === n - 1} aria-label={`Move starter ${i + 1} down`} onClick={() => onMove(i + 1)} data-testid={`starter-down-${i}`}>↓</Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Delete starter ${i + 1}`} onClick={onRemove} data-testid={`starter-delete-${i}`}><Trash2 aria-hidden /></Button>
        </span>
      </div>
      {st.action === 'workflow' && (
        <select value={st.workflowId ?? ''} onChange={(e) => onChange({ ...st, workflowId: e.target.value })} aria-label={`Starter ${i + 1} workflow`} className={cn(SEL, 'mt-2 ml-7')} data-testid={`starter-workflow-${i}`}>
          <option value="">Choose a workflow</option>{choices.map((w) => <option key={w.id} value={w.id}>{w.name}{w.active ? '' : ' (Off)'}</option>)}
        </select>
      )}
      {st.action === 'workflow' && st.workflowId && !choices.find((w) => w.id === st.workflowId)?.active && <p className="ml-7 mt-1 text-[13px] text-amber-800" data-testid={`starter-off-note-${i}`}>This workflow is off. It will ask the AI instead.</p>}
      {st.action === 'link' && <Input value={st.url ?? ''} onChange={(e) => onChange({ ...st, url: e.target.value })} placeholder="https://goorin.com/pages/wholesale" aria-label={`Starter ${i + 1} link`} className="ml-7 mt-2 h-9 max-w-[480px]" data-testid={`starter-url-${i}`} />}
      <p className="ml-7 mt-1 flex justify-between gap-2 text-xs"><span className="text-red-700" role={err ? 'alert' : undefined} data-testid={`starter-error-${i}`}>{err}</span><span className={st.label.length > 40 ? 'text-red-700' : 'text-ink-muted'}>{st.label.length}/40</span></p>
    </li>
  )
}

export function StartersEditor({ draft, update }: { draft: WidgetSettings; update: Update }) {
  const list = draft.home.starters
  const [from, setFrom] = useState<number | null>(null)
  const move = (a: number, b: number) => update((d) => { const [x] = d.home.starters.splice(a, 1); d.home.starters.splice(b, 0, x) })
  return (
    <div data-testid="starters-editor">
      <p className="mb-2 text-sm font-medium text-ink">Conversation starters</p>
      <ol className="space-y-2">
        {list.map((st, i) => <StarterRow key={st.id} st={st} i={i} n={list.length} drag={{ from, set: setFrom }} onChange={(n) => update((d) => { d.home.starters[i] = n })} onRemove={() => update((d) => { d.home.starters.splice(i, 1) })} onMove={(to) => move(from ?? i, to)} />)}
      </ol>
      <div className="mt-2 flex items-center gap-3">
        <Button variant="outline" size="sm" disabled={list.length >= MAX_STARTERS} onClick={() => update((d) => { d.home.starters.push({ id: `st-${Date.now()}`, label: '', action: 'ai' }) })} data-testid="starter-add"><Plus aria-hidden /> Add starter</Button>
        <span className="text-xs text-ink-muted" data-testid="starter-limit">{list.length >= MAX_STARTERS ? `You can have up to ${MAX_STARTERS} starters.` : `${list.length} of ${MAX_STARTERS}`}</span>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-ink"><Switch checked={draft.home.showLastConversation} onCheckedChange={(v) => update((d) => { d.home.showLastConversation = v })} data-testid="ws-show-last" />Show "See last conversation" once a chat exists</label>
    </div>
  )
}

function TopButton({ k, label, draft, update }: { k: 'cart' | 'track'; label: string; draft: WidgetSettings; update: Update }) {
  const b = draft.home[k]
  return (
    <div className="flex flex-wrap items-center gap-3" data-testid={`ws-top-${k}`}>
      <Switch checked={b.enabled} onCheckedChange={(v) => update((d) => { d.home[k].enabled = v })} aria-label={`Show ${label}`} data-testid={`ws-top-${k}-toggle`} />
      <span className="w-24 text-sm text-ink">{label}</span>
      <Input value={b.label} disabled={!b.enabled} maxLength={24} onChange={(e) => update((d) => { d.home[k].label = e.target.value })} aria-label={`${label} label`} className="h-9 w-full max-w-[240px]" data-testid={`ws-top-${k}-label`} />
    </div>
  )
}

export function HomeSection({ draft, update }: { draft: WidgetSettings; update: Update }) {
  return (
    <>
      <div>
        <TextField id="greeting" label="Greeting" value={draft.messaging.greeting} onChange={(v) => update((d) => { d.messaging.greeting = v })} multiline />
        <p className="mt-1.5 text-xs text-ink-muted" data-testid="ws-greeting-hint">Optional. Shown above the suggested questions.</p>
      </div>
      <div className="space-y-2"><p className="text-sm font-medium text-ink">Top buttons</p><TopButton k="cart" label="Cart" draft={draft} update={update} /><TopButton k="track" label="Track orders" draft={draft} update={update} /></div>
      <StartersEditor draft={draft} update={update} />
    </>
  )
}

export function ConversationSection({ draft, update }: { draft: WidgetSettings; update: Update }) {
  const c = draft.conversation
  const row = (label: string, checked: boolean, on: (v: boolean) => void, testId: string, hint?: string) => (
    <label className="flex items-start gap-3 text-sm text-ink"><Switch checked={checked} onCheckedChange={on} data-testid={testId} className="mt-0.5" /><span>{label}{hint && <span className="block text-xs text-ink-muted">{hint}</span>}</span></label>
  )
  return (
    <>
      <div><TextField id="bot-name" label="Chatbot name" value={c.botName} onChange={(v) => update((d) => { d.conversation.botName = v })} /></div>
      {row('Thumbs up / down on AI replies', c.thumbs, (v) => update((d) => { d.conversation.thumbs = v }), 'ws-thumbs')}
      {row('Ask for email before chat', c.askEmailFirst, (v) => update((d) => { d.conversation.askEmailFirst = v }), 'ws-ask-email', 'Off: shoppers start typing right away. Workflows and handoff ask for the email when they need it.')}
      <div className="space-y-4">
        <TextField id="handoff-message" label="Handoff message" value={draft.messaging.handoffMessage} onChange={(v) => update((d) => { d.messaging.handoffMessage = v })} />
        <TextField id="offline-message" label="Offline message" value={draft.messaging.offlineMessage} onChange={(v) => update((d) => { d.messaging.offlineMessage = v })} multiline />
      </div>
    </>
  )
}
