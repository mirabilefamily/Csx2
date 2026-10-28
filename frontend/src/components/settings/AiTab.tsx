import { useEffect, useState } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown, Copy, Mail, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { AiSettings } from '@/types'
import { aiApi, settingsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { Button, focusRing } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/overlay'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/States'
import { StatStrip } from '@/components/ai/AiCard'
import { usd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { FormSection, SaveBar } from './SaveBar'

type SetFn = (patch: Partial<AiSettings>) => void

// Threshold slider with value chip and live estimate (REQ-812, REQ-827: no backup-AI zone).
function Threshold({ value, set }: { value: number; set: SetFn }) {
  const est = aiApi.estimateAutoSend(value)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <SliderPrimitive.Root value={[value]} min={0} max={100} step={1} onValueChange={([v]) => set({ threshold: v })} className="relative flex h-6 w-full max-w-[560px] touch-none items-center" data-testid="threshold-slider">
          <SliderPrimitive.Track className="relative h-2 grow overflow-hidden rounded-full" style={{ background: `linear-gradient(to right, #E9C98F 0 ${value}%, #CFE3D2 ${value}% 100%)` }} data-testid="threshold-band" />
          <SliderPrimitive.Thumb aria-label="Confidence threshold" className="block h-5 w-5 rounded-full border-2 border-tobacco-600 bg-white shadow-card transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        </SliderPrimitive.Root>
        <span className="shrink-0 rounded-full bg-tobacco-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-tobacco-800 ring-1 ring-tobacco-200" data-testid="threshold-value">{value}%</span>
      </div>
      <div className="flex max-w-[560px] flex-wrap justify-between gap-2 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5" data-testid="threshold-zone-person"><i className="h-2 w-2 rounded-full bg-[#E9C98F]" aria-hidden /> Hand to a person · 0–{Math.max(value - 1, 0)}%</span>
        <span className="inline-flex items-center gap-1.5" data-testid="threshold-zone-ai"><i className="h-2 w-2 rounded-full bg-[#9CC5A3]" aria-hidden /> AI answers · {value}–100%</span>
      </div>
      <p className="text-sm text-ink" data-testid="threshold-line">At {value}%, about <strong className="font-semibold">{est}%</strong> of last month's replies would send on their own; the rest go to Needs you.</p>
    </div>
  )
}

// One AI switch per channel (REQ-827).
function AutoSend({ form, set }: { form: AiSettings; set: SetFn }) {
  const rows = [['email', 'Email', Mail, 'Replies go out from your mailbox.'], ['chat', 'Chat', MessageCircle, 'Answers appear in the widget right away.']] as const
  return (
    <ul className="max-w-[560px] divide-y divide-border/70 overflow-hidden rounded-xl ring-1 ring-border" data-testid="auto-send-matrix">
      {rows.map(([ch, label, I, hint]) => (
        <li key={ch} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted"><I className="h-4 w-4 text-ink-muted" aria-hidden /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink">{label}</span><span className="block text-[13px] text-ink-muted">{hint}</span></span>
          <Switch checked={form.autoSend[ch].claude} onCheckedChange={(v) => set({ autoSend: { ...form.autoSend, [ch]: { ...form.autoSend[ch], claude: v } } })} aria-label={`Auto-send ${label} replies from the AI`} data-testid={`auto-send-${ch}`} />
        </li>
      ))}
    </ul>
  )
}

function PromptViewer({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const lines = text.split('\n')
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="max-w-[720px] overflow-hidden rounded-xl ring-1 ring-border" data-testid="prompt-claude">
      <div className="flex items-center gap-2 px-3 py-2">
        <Collapsible.Trigger className={cn('inline-flex min-h-9 flex-1 items-center gap-2 rounded text-left text-sm font-medium text-ink', focusRing)} data-testid="prompt-toggle-claude">
          <ChevronDown className={cn('h-4 w-4 text-ink-muted transition-transform', !open && '-rotate-90')} aria-hidden />
          AI system prompt
          <span className="text-xs font-normal text-ink-subtle">{lines.length} lines</span>
        </Collapsible.Trigger>
        <Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard?.writeText(text).catch(() => undefined); toast.success('Prompt copied') }} data-testid="prompt-copy-claude"><Copy aria-hidden /> Copy</Button>
      </div>
      <Collapsible.Content>
        <pre className="max-h-72 overflow-auto border-t border-border bg-surface-sunken py-3 font-mono text-xs leading-relaxed text-ink" data-testid="prompt-text-claude">
          {lines.map((l, n) => <div key={n} className="flex"><span className="w-10 shrink-0 select-none pr-3 text-right text-ink-subtle" aria-hidden>{n + 1}</span><span className="min-w-0 flex-1 whitespace-pre-wrap pr-4">{l || ' '}</span></div>)}
        </pre>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

const limitInvalid = (n: number) => !(n >= 0 && n <= 500)

function AutoRefunds({ form, set }: { form: AiSettings; set: SetFn }) {
  const v = form.autoRefund
  const bad = limitInvalid(v.limit)
  return (
    <div className="max-w-[560px] space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 ring-1 ring-border">
        <span className="text-sm font-medium text-ink" id="auto-refund-toggle-label">Let the AI issue refunds automatically</span>
        <Switch checked={v.enabled} onCheckedChange={(enabled) => set({ autoRefund: { ...v, enabled } })} aria-labelledby="auto-refund-toggle-label" data-testid="auto-refund-toggle" />
      </div>
      <div className="w-[120px]">
        <Label htmlFor="auto-refund-limit" className="text-xs text-ink-muted">Max amount (USD)</Label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted" aria-hidden>$</span>
          <Input id="auto-refund-limit" type="number" inputMode="decimal" min={0} max={500} className="pl-7" value={Number.isNaN(v.limit) ? '' : v.limit} onChange={(e) => set({ autoRefund: { ...v, limit: e.target.value === '' ? NaN : Number(e.target.value) } })} aria-invalid={bad} aria-describedby="auto-refund-error auto-refund-note" data-testid="auto-refund-limit" />
        </div>
      </div>
      <FieldError id="auto-refund-error">{bad ? 'Enter an amount between $0 and $500.' : null}</FieldError>
      <p id="auto-refund-note" className="text-[13px] text-ink-muted" data-testid="auto-refund-note">Refunds above this amount, or with an open fraud alert, wait for human approval.</p>
    </div>
  )
}

function Impact() {
  const { data } = useApi(() => aiApi.getReplyImpact(), [])
  const d = data
  return (
    <StatStrip label="AI impact, last 30 days" testId="ai-impact" cells={[
      { label: 'AI resolved', value: d ? `${d.resolvedPct}%` : '…', trend: 'Last 30 days', testId: 'ai-impact-resolved' },
      { label: 'Handed to a person', value: d ? `${d.handedPct}%` : '…', trend: 'Went to Needs you', testId: 'ai-impact-handed' },
      { label: 'Auto-sent replies', value: d ? d.autoSent.toLocaleString() : '…', trend: 'Sent without review', testId: 'ai-impact-autosent' },
      { label: 'Auto-refunds', value: d ? `${d.autoRefunds}` : '…', trend: d ? `${usd(d.autoRefundTotal)} refunded` : '', testId: 'ai-impact-refunds' },
    ]} />
  )
}

function AiSkeleton() {
  return <div className="space-y-4" data-testid="ai-settings-loading"><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-[480px] w-full rounded-2xl" /></div>
}

export function AiTab() {
  const { data, loading, error, reload } = useApi(() => settingsApi.getAiSettings(), [])
  const [saved, setSaved] = useState<AiSettings | null>(null)
  const [form, setForm] = useState<AiSettings | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (data) { setSaved(data); setForm(data) } }, [data])
  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(saved)
  useUnsavedGuard('ai-settings', dirty)

  if (loading) return <AiSkeleton />
  if (error || !form) return <Card><ErrorState title="AI settings didn't load" onRetry={reload} testId="ai-settings-error" /></Card>

  const set: SetFn = (patch) => setForm({ ...form, ...patch })
  const save = async () => {
    if (limitInvalid(form.autoRefund.limit)) return toast.error('Enter an amount between $0 and $500.')
    setSaving(true)
    try { const s = await settingsApi.saveAiSettings(form); setSaved(s); setForm(s); toast.success('AI settings saved') } catch (e) { toast.error((e as Error).message) }
    setSaving(false)
  }

  return (
    <div className="space-y-6" data-testid="ai-tab">
      <Impact />
      <div className="divide-y divide-border/70 rounded-2xl bg-surface px-6 py-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4">
        <FormSection title="Confidence threshold" description="The AI only answers on its own when it's at least this confident. Below it, the ticket goes to a person." testId="ai-section-threshold"><Threshold value={form.threshold} set={set} /></FormSection>
        <FormSection title="Auto-send" description="When off, the AI drafts a reply for an agent to approve." testId="ai-section-auto-send"><AutoSend form={form} set={set} /></FormSection>
        <FormSection title="Auto-refunds" description="Small refunds the AI can issue without a person. The limit also shows in the Inbox and on the Dashboard." testId="ai-section-auto-refunds"><AutoRefunds form={form} set={set} /></FormSection>
        <FormSection title="System prompt" description="Managed in code. Read only." testId="ai-section-prompts"><PromptViewer text={form.prompts.claude} /></FormSection>
      </div>
      {dirty && (
        <SaveBar>
          <Button variant="ghost" size="sm" onClick={() => setForm(saved)} data-testid="ai-discard">Discard</Button>
          <Button size="sm" onClick={save} loading={saving} data-testid="ai-save">Save AI settings</Button>
        </SaveBar>
      )}
    </div>
  )
}
