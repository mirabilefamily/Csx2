import { useRef } from 'react'
import type { CsatMessages, CsatStyle, CsatSurvey } from '@/types'
import { Input, Label, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const VARS = ['{first_name}', '{ticket_subject}', '{agent_name}']
const FIELDS: { key: keyof CsatMessages; label: string; multiline?: boolean; error?: string }[] = [
  { key: 'subject', label: 'Email subject', error: 'Add a subject.' },
  { key: 'intro', label: 'Email intro', multiline: true },
  { key: 'chatPrompt', label: 'Chat prompt', error: 'Add a chat prompt.' },
  { key: 'thanks', label: 'Thank-you message', multiline: true },
]
export const STYLES: { id: CsatStyle; label: string }[] = [{ id: 'stars', label: 'Stars' }, { id: 'emoji', label: 'Emoji' }, { id: 'numeric', label: 'Numbers' }]
export const messageErrors = (m: CsatMessages) => FIELDS.filter((f) => f.error && !m[f.key].trim()).map((f) => f.key)

function Field({ f, value, onChange, invalid }: { f: (typeof FIELDS)[number]; value: string; onChange: (v: string) => void; invalid: boolean }) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const insert = (v: string) => {
    const el = ref.current, at = el?.selectionStart ?? value.length
    onChange(value.slice(0, at) + v + value.slice(el?.selectionEnd ?? at))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + v.length, at + v.length) })
  }
  const Comp = f.multiline ? Textarea : Input
  return (
    <div>
      <Label htmlFor={`csat-msg-${f.key}`}>{f.label}</Label>
      <Comp ref={ref} id={`csat-msg-${f.key}`} className={cn('mt-1.5', f.multiline && 'min-h-[72px]')} value={value} aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} data-testid={`csat-msg-${f.key}`} />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {VARS.map((v) => <button key={v} type="button" onClick={() => insert(v)} className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-ink-muted ring-1 ring-border transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`csat-var-${f.key}-${v.slice(1, -1)}`}>{v}</button>)}
      </div>
      {invalid && <p className="mt-1 text-xs font-medium text-red-700" role="alert" data-testid={`csat-msg-${f.key}-error`}>{f.error}</p>}
    </div>
  )
}

// Messages template + rating style (REQ-1006..1010).
export function MessagesSection({ draft, set, showErrors }: { draft: CsatSurvey; set: (s: CsatSurvey) => void; showErrors: boolean }) {
  const errs = showErrors ? messageErrors(draft.messages) : []
  return (
    <section aria-labelledby="csat-messages-heading" className="space-y-5" data-testid="csat-messages">
      <h3 id="csat-messages-heading" className="text-sm font-semibold text-ink">Messages</h3>
      <div>
        <p className="text-sm font-medium text-ink" id="csat-style-label">Rating style</p>
        <div role="radiogroup" aria-labelledby="csat-style-label" className="mt-1.5 inline-flex gap-1 rounded-lg bg-surface-muted p-1">
          {STYLES.map((s) => <button key={s.id} type="button" role="radio" aria-checked={draft.ratingStyle === s.id} onClick={() => set({ ...draft, ratingStyle: s.id })} className={cn('h-8 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', draft.ratingStyle === s.id ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`csat-style-${s.id}`}>{s.label}</button>)}
        </div>
        <p className="mt-1.5 text-xs text-ink-muted">Used in chat and email.</p>
      </div>
      <div className="grid gap-5 @[640px]:grid-cols-2">
        {FIELDS.map((f) => <Field key={f.key} f={f} value={draft.messages[f.key]} invalid={errs.includes(f.key)} onChange={(v) => set({ ...draft, messages: { ...draft.messages, [f.key]: v } })} />)}
      </div>
    </section>
  )
}
