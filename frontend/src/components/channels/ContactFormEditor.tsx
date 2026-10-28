import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Paperclip, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { ContactField, ContactFormSettings } from '@/types'
import { channelsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/overlay'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/States'
import { PreviewPane } from '@/components/PreviewPane'
import { SaveBar } from '@/components/settings/SaveBar'
import { cn } from '@/lib/utils'

const CARD = 'rounded-2xl bg-surface p-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4'

function FieldRow({ f, i, count, set, move }: { f: ContactField; i: number; count: number; set: (p: Partial<ContactField>) => void; move: (d: -1 | 1) => void }) {
  const locked = f.id === 'email' || f.id === 'message'
  return (
    <li className="rounded-xl border border-border p-3" data-testid={`cf-field-${f.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Input aria-label={`${f.id} label`} className="h-10 min-w-0 flex-1 basis-40" value={f.label} onChange={(e) => set({ label: e.target.value })} data-testid={`cf-label-${f.id}`} />
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink"><Switch checked={f.enabled} disabled={locked} onCheckedChange={(v) => set({ enabled: v })} aria-label={`Show ${f.label}`} data-testid={`cf-enabled-${f.id}`} /> Show</label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink"><Switch checked={f.required} disabled={locked || !f.enabled || f.id === 'attachments'} onCheckedChange={(v) => set({ required: v })} aria-label={`${f.label} required`} data-testid={`cf-required-${f.id}`} /> Required</label>
        <div className="flex">
          <Button variant="ghost" size="icon" aria-label={`Move ${f.label} up`} disabled={i === 0} onClick={() => move(-1)} data-testid={`cf-up-${f.id}`}><ArrowUp aria-hidden /></Button>
          <Button variant="ghost" size="icon" aria-label={`Move ${f.label} down`} disabled={i === count - 1} onClick={() => move(1)} data-testid={`cf-down-${f.id}`}><ArrowDown aria-hidden /></Button>
        </div>
      </div>
      {f.id === 'topic' && f.enabled && (
        <div className="mt-3 space-y-2" data-testid="cf-topic-options">
          {(f.options ?? []).map((o, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <Input aria-label={`Topic option ${oi + 1}`} className="h-10" value={o} onChange={(e) => set({ options: f.options!.map((x, xi) => (xi === oi ? e.target.value : x)) })} data-testid={`cf-topic-${oi}`} />
              <Button variant="ghost" size="icon" aria-label={`Remove ${o || 'option'}`} onClick={() => set({ options: f.options!.filter((_, xi) => xi !== oi) })}><X aria-hidden /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set({ options: [...(f.options ?? []), ''] })} data-testid="cf-topic-add"><Plus aria-hidden /> Add topic</Button>
        </div>
      )}
    </li>
  )
}

function FormPreview({ s }: { s: ContactFormSettings }) {
  return (
    <div className="rounded-2xl bg-[#F4EFE8] p-6 ring-1 ring-black/[0.04] max-sm:p-3" data-testid="cf-preview">
      <div className="mx-auto max-w-[440px] rounded-xl bg-white p-6 shadow-card">
        <p className="text-xs text-ink-muted">goorin.com/pages/contact</p>
        <h3 className="mt-2 text-xl font-semibold text-ink" data-testid="cf-preview-heading">{s.heading || 'Contact us'}</h3>
        {s.intro && <p className="mt-1 text-sm text-ink-muted">{s.intro}</p>}
        <div className="mt-5 space-y-3.5">
          {s.fields.filter((f) => f.enabled).map((f) => (
            <div key={f.id} data-testid={`cf-preview-field-${f.id}`}>
              <p className="text-xs font-medium text-ink">{f.label}{f.required && <span className="text-red-700" aria-hidden> *</span>}</p>
              {f.id === 'topic' ? (
                <div className="mt-1 flex h-10 items-center rounded-lg border border-border-strong px-3 text-sm text-ink-muted">{f.options?.[0] || 'Choose a topic'}</div>
              ) : f.id === 'message' ? (
                <div className="mt-1 h-20 rounded-lg border border-border-strong" />
              ) : f.id === 'attachments' ? (
                <div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 text-sm text-ink-muted"><Paperclip className="h-4 w-4" aria-hidden /> Add photos</div>
              ) : (
                <div className="mt-1 h-10 rounded-lg border border-border-strong" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 flex h-11 items-center justify-center rounded-lg bg-[#1F1D1A] text-sm font-semibold text-white" data-testid="cf-preview-button">{s.buttonLabel || 'Send'}</div>
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800" data-testid="cf-preview-success">After sending: {s.successMessage}</p>
      </div>
    </div>
  )
}

function Loaded({ initial }: { initial: ContactFormSettings }) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])
  useUnsavedGuard('contact-form', dirty)
  const setField = (i: number, p: Partial<ContactField>) => setDraft((d) => ({ ...d, fields: d.fields.map((f, fi) => (fi === i ? { ...f, ...p } : f)) }))
  const move = (i: number, dir: -1 | 1) => setDraft((d) => { const f = [...d.fields]; [f[i], f[i + dir]] = [f[i + dir], f[i]]; return { ...d, fields: f } })
  const save = async () => {
    setSaving(true)
    try { const s = await channelsApi.saveContactForm(draft); setSaved(s); setDraft(s); toast.success('Contact form saved') } catch (e) { toast.error((e as Error).message) }
    setSaving(false)
  }
  return (
    <div className="grid gap-8 pb-24 lg:grid-cols-[minmax(0,640px)_minmax(0,440px)] lg:justify-between" data-testid="contact-form-editor">
      <div className="min-w-0 space-y-4">
        {(
          <section className={cn(CARD, 'space-y-5')} data-testid="cf-appearance">
            <div className="max-w-[480px]"><Label htmlFor="cf-heading">Heading</Label><Input id="cf-heading" className="mt-1.5" value={draft.heading} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} data-testid="cf-heading" /></div>
            <div className="max-w-[75ch]"><Label htmlFor="cf-intro">Intro</Label><Textarea id="cf-intro" className="mt-1.5" value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} data-testid="cf-intro" /></div>
            <div className="max-w-[480px]"><Label htmlFor="cf-button">Button label</Label><Input id="cf-button" className="mt-1.5" value={draft.buttonLabel} onChange={(e) => setDraft({ ...draft, buttonLabel: e.target.value })} aria-invalid={!draft.buttonLabel.trim()} data-testid="cf-button-label" />{!draft.buttonLabel.trim() && <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">Add a button label.</p>}</div>
            <div className="max-w-[75ch]"><Label htmlFor="cf-success">Success message</Label><Textarea id="cf-success" className="mt-1.5" value={draft.successMessage} onChange={(e) => setDraft({ ...draft, successMessage: e.target.value })} data-testid="cf-success" /></div>
          </section>
        )}
        {(
          <section className={CARD} data-testid="cf-preferences">
            <h3 className="text-[15px] font-semibold text-ink">Fields</h3>
            <p className="mt-0.5 text-sm text-ink-muted">Email and message are always on, so the desk can reply.</p>
            <ol className="mt-4 space-y-2">{draft.fields.map((f, i) => <FieldRow key={f.id} f={f} i={i} count={draft.fields.length} set={(p) => setField(i, p)} move={(d) => move(i, d)} />)}</ol>
          </section>
        )}
      </div>
      <PreviewPane label="Live form preview" testId="cf-preview-pane">
        <p className="mb-3 text-[15px] font-semibold text-ink max-lg:hidden">Preview</p>
        <FormPreview s={draft} />
      </PreviewPane>
      {dirty && (
        <SaveBar>
          <Button variant="ghost" size="sm" onClick={() => setDraft(saved)} data-testid="cf-discard">Discard</Button>
          <Button size="sm" onClick={save} loading={saving} disabled={!draft.buttonLabel.trim()} data-testid="cf-save">Save</Button>
        </SaveBar>
      )}
    </div>
  )
}

export function ContactFormEditor(_: { panel?: 'appearance' | 'preferences' } = {}) {
  const { data, loading, error, reload } = useApi(() => channelsApi.getContactForm(), [])
  if (loading) return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_500px]" data-testid="cf-loading"><Skeleton className="h-96 w-full rounded-2xl" /><Skeleton className="h-[560px] w-full rounded-2xl" /></div>
  if (error || !data) return <ErrorState title="Contact form didn't load" onRetry={reload} testId="cf-error" />
  return <Loaded initial={data} />
}
