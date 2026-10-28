import { Plus, Trash2, X } from 'lucide-react'
import type { AskKind, ConditionOp, Step, StepConfig, Trigger, Workflow, WorkflowChannel } from '@/types'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STEP_LABEL, stepNumbers, variablesBefore } from '@/lib/workflowGraph'
import { STEP_ICON } from './stepMeta'
import { NewStepFields } from './NewStepFields'

type W = Pick<Workflow, 'steps' | 'edges' | 'trigger'>
const CH: [WorkflowChannel, string][] = [['chat', 'Chat widget'], ['form', 'Contact form'], ['email', 'Email']]

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block space-y-1.5"><span className="block text-[13px] font-medium text-ink">{label}</span>{children}{hint && <span className="block text-xs text-ink-muted">{hint}</span>}</label>
)

function VarPicker({ vars, onPick }: { vars: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1" data-testid="var-picker">
      {vars.map((v) => <button key={v} type="button" onClick={() => onPick(v)} className="rounded bg-tobacco-50 px-1.5 py-0.5 font-mono text-[11px] text-tobacco-800 hover:bg-tobacco-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:py-2" data-testid={`var-insert-${v}`}>{`{{${v}}}`}</button>)}
    </div>
  )
}

export function TriggerSettings({ t, set }: { t: Trigger; set: (t: Trigger) => void }) {
  return (
    <div className="space-y-4" data-testid="trigger-settings">
      <Field label="Intent" hint="The AI starts this workflow when it detects this intent."><Input className="h-9" value={t.intent} onChange={(e) => set({ ...t, intent: e.target.value })} data-testid="trigger-intent" /></Field>
      <Field label="Example phrases" hint="One per line.">
        <Textarea rows={3} value={t.phrases.join('\n')} onChange={(e) => set({ ...t, phrases: e.target.value.split('\n') })} data-testid="trigger-phrases" />
      </Field>
      <fieldset className="space-y-1.5"><legend className="text-[13px] font-medium text-ink">Channels</legend>
        {CH.map(([c, l]) => (
          <label key={c} className="flex min-h-8 items-center gap-2 text-sm text-ink"><input type="checkbox" className="h-4 w-4 accent-tobacco-600" checked={t.channels.includes(c)} onChange={(e) => set({ ...t, channels: e.target.checked ? [...t.channels, c] : t.channels.filter((x) => x !== c) })} data-testid={`trigger-channel-${c}`} />{l}</label>
        ))}
      </fieldset>
      <Field label="Widget quick reply" hint="Leave empty for no quick-reply button."><Input className="h-9" value={t.quickReply ?? ''} onChange={(e) => set({ ...t, quickReply: e.target.value || null })} data-testid="trigger-quick-reply" /></Field>
    </div>
  )
}

export function StepSettings({ wf, step, onChange, onClose, onDelete }: { wf: W; step: Step; onChange: (c: StepConfig) => void; onClose: () => void; onDelete: () => void }) {
  const c = step.config
  const set = (p: Partial<StepConfig>) => onChange({ ...c, ...p })
  const vars = variablesBefore(wf, step.id)
  const I = STEP_ICON[step.type]
  const text = (label: string) => (
    <Field label={label}>
      <Textarea rows={3} value={c.text ?? ''} onChange={(e) => set({ text: e.target.value })} data-testid="step-text" />
      <VarPicker vars={vars} onPick={(v) => set({ text: `${c.text ?? ''}{{${v}}}` })} />
    </Field>
  )
  return (
    <div className="space-y-4" data-testid="step-settings">
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-center gap-2 border-b border-border bg-surface px-4 py-3"><I className="h-4 w-4 text-ink-muted" aria-hidden /><h3 className="flex-1 truncate text-[15px] font-semibold text-ink" data-testid="step-settings-title">Step {stepNumbers(wf).get(step.id)} · {STEP_LABEL[step.type]}</h3><Button size="icon-sm" variant="ghost" aria-label="Close step settings" onClick={onClose} data-testid="step-settings-close"><X aria-hidden /></Button></div>
      {step.type === 'message' && text('Message')}
      {step.type === 'ask' && (
        <>
          {text('Question')}
          <Field label="Answer type">
            <Select value={c.kind ?? 'text'} onValueChange={(v) => set({ kind: v as AskKind, options: v === 'buttons' && !c.options?.length ? [{ id: 'a', label: 'Yes' }] : c.options })}>
              <SelectTrigger className="h-9" data-testid="step-kind"><SelectValue /></SelectTrigger>
              <SelectContent>{(['text', 'email', 'number', 'buttons'] as AskKind[]).map((k) => <SelectItem key={k} value={k}>{k === 'buttons' ? 'Buttons' : k[0].toUpperCase() + k.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Save answer as" hint="Used later as {{variable}}."><Input className="h-9 font-mono" value={c.variable ?? ''} onChange={(e) => set({ variable: e.target.value.replace(/[^\w.]/g, '') })} data-testid="step-variable" /></Field>
          {c.kind === 'email' && <Field label="Validation message"><Input className="h-9" value={c.validation ?? ''} onChange={(e) => set({ validation: e.target.value })} data-testid="step-validation" /></Field>}
          {c.kind === 'buttons' && (
            <fieldset className="space-y-2"><legend className="text-[13px] font-medium text-ink">Buttons (each one is a path)</legend>
              {(c.options ?? []).map((o, i) => (
                <div key={o.id} className="flex items-center gap-2"><Input className="h-9" value={o.label} aria-label={`Button ${i + 1}`} onChange={(e) => set({ options: c.options!.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })} data-testid={`step-option-${i}`} /><Button size="icon-sm" variant="ghost" aria-label={`Remove button ${i + 1}`} onClick={() => set({ options: c.options!.filter((x) => x.id !== o.id) })}><Trash2 aria-hidden /></Button></div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set({ options: [...(c.options ?? []), { id: Math.random().toString(36).slice(2, 7), label: 'New option' }] })} data-testid="step-option-add"><Plus aria-hidden /> Add button</Button>
            </fieldset>
          )}
        </>
      )}
      {step.type === 'send_code' && <>{text('Message after sending')}<p className="rounded-lg bg-surface-sunken p-3 text-xs text-ink-muted">Email from Goorin Bros. &lt;support@goorin.com&gt;, subject "Your Goorin verification code", random 6-digit code. Resending invalidates the old code.</p></>}
      {step.type === 'check_code' && (
        <>
          <Field label="Attempts before handing over"><Input type="number" min={1} max={5} className="h-9 w-24" value={c.attempts ?? 3} onChange={(e) => set({ attempts: Number(e.target.value) || 1 })} data-testid="step-attempts" /></Field>
          <Field label="Wrong code message"><Input className="h-9" value={c.wrongText ?? ''} onChange={(e) => set({ wrongText: e.target.value })} data-testid="step-wrong-text" /></Field>
        </>
      )}
      {step.type === 'find_orders' && <Field label="Email variable"><Input className="h-9 font-mono" value={c.variable ?? 'email'} onChange={(e) => set({ variable: e.target.value })} data-testid="step-variable" /></Field>}
      {step.type === 'show_orders' && <Field label="Orders to show" hint="Only after the code is verified on chat."><Input type="number" min={1} max={5} className="h-9 w-24" value={c.limit ?? 3} onChange={(e) => set({ limit: Number(e.target.value) || 1 })} data-testid="step-limit" /></Field>}
      {step.type === 'condition' && (
        <div className="space-y-3">
          <Field label="If">
            <Select value={c.condVar || undefined} onValueChange={(v) => set({ condVar: v })}>
              <SelectTrigger className="h-9" data-testid="step-cond-var"><SelectValue placeholder="Pick a variable" /></SelectTrigger>
              <SelectContent>{vars.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="flex gap-2">
            <Select value={c.op ?? 'eq'} onValueChange={(v) => set({ op: v as ConditionOp })}>
              <SelectTrigger className="h-9 w-36" data-testid="step-cond-op"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="eq">is</SelectItem><SelectItem value="is">equals</SelectItem><SelectItem value="gt">is more than</SelectItem><SelectItem value="lt">is less than</SelectItem></SelectContent>
            </Select>
            <Input className="h-9" value={c.condValue ?? ''} onChange={(e) => set({ condValue: e.target.value })} aria-label="Value" data-testid="step-cond-value" />
          </div>
          <Field label="Path labels"><div className="flex gap-2"><Input className="h-9" value={c.yesLabel ?? ''} onChange={(e) => set({ yesLabel: e.target.value })} aria-label="If path label" data-testid="step-yes-label" /><Input className="h-9" value={c.noLabel ?? ''} onChange={(e) => set({ noLabel: e.target.value })} aria-label="Otherwise path label" data-testid="step-no-label" /></div></Field>
        </div>
      )}
      {step.type === 'add_tag' && <Field label="Tag"><Input className="h-9" value={c.tag ?? ''} onChange={(e) => set({ tag: e.target.value })} data-testid="step-tag" /></Field>}
      {step.type === 'set_field' && <div className="flex gap-2"><Input className="h-9" placeholder="Field" value={c.field ?? ''} onChange={(e) => set({ field: e.target.value })} aria-label="Field" /><Input className="h-9" placeholder="Value" value={c.fieldValue ?? ''} onChange={(e) => set({ fieldValue: e.target.value })} aria-label="Value" /></div>}
      {step.type === 'handover' && (
        <>
          <Field label="Team"><Input className="h-9" value={c.team ?? ''} onChange={(e) => set({ team: e.target.value })} data-testid="step-team" /></Field>
          <Field label="Note for the team"><Textarea rows={2} value={c.note ?? ''} onChange={(e) => set({ note: e.target.value })} data-testid="step-note" /></Field>
        </>
      )}
      {step.type === 'end' && <label className="flex min-h-8 items-center gap-2 text-sm text-ink"><input type="checkbox" className="h-4 w-4 accent-tobacco-600" checked={!!c.csat} onChange={(e) => set({ csat: e.target.checked })} data-testid="step-csat" />Ask the CSAT question</label>}
      <NewStepFields step={step} c={c} set={set} text={text} />
      {['update_address', 'find_returns', 'start_return'].includes(step.type) && <p className="rounded-lg bg-surface-sunken p-3 text-xs text-ink-muted">Runs in {step.type.startsWith('start') || step.type.includes('returns') ? 'Loop' : 'Shopify'}. No settings.</p>}
      <div className="mt-6 border-t border-border pt-4"><Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={onDelete} data-testid="step-settings-delete"><Trash2 aria-hidden /> Delete step</Button></div>
    </div>
  )
}
