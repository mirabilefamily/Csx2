import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Info, Mail, MessageCircle, PenLine, X } from 'lucide-react'
import { toast } from 'sonner'
import { BRAND_VOICE_LIMITS, type BrandVoice, type VoiceSample } from '@/types'
import { aiApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useIsPhone } from '@/hooks/useIsPhone'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/overlay'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/States'
import { SaveState } from '@/components/PageTabs'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AiCard } from './AiCard'
import { SaveBar } from '@/components/settings/SaveBar'

type Key = keyof typeof BRAND_VOICE_LIMITS
const PRESETS: [string, string][] = [
  ['Warm', 'Warm and welcoming, like greeting a regular.'],
  ['Concise', 'Concise: short sentences, the answer first.'],
  ['Playful', 'Playful, with a light touch of wit.'],
  ['Formal', 'Formal and precise, never casual.'],
  ['Old-world craft', 'Old-world craft: the quiet pride of a hat shop since 1895.'],
]
const MAX_PHRASES = 12
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-')

function Counter({ id, value, max }: { id: string; value: string; max: number }) {
  return <span id={`${id}-count`} className={cn('text-xs tabular-nums', value.length > max ? 'font-semibold text-red-700' : 'text-ink-muted')} data-testid={`bv-count-${id}`}>{value.length.toLocaleString()} / {max.toLocaleString()}</span>
}

function VoiceField({ id, label, hint, value, onChange, rows, bare }: { id: Key; label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number; bare?: boolean }) {
  const max = BRAND_VOICE_LIMITS[id]
  const over = value.length > max
  const Field = rows ? Textarea : Input
  return (
    <div className="max-w-[640px]">
      {bare ? <Label htmlFor={`bv-${id}`} className="sr-only">{label}</Label> : <div className="flex items-baseline justify-between gap-3"><Label htmlFor={`bv-${id}`}>{label}</Label><Counter id={id} value={value} max={max} /></div>}
      {hint && <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p>}
      <Field id={`bv-${id}`} rows={rows} className={cn('mt-2', rows ? 'min-h-[96px]' : 'max-w-[480px]')} value={value} onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(e.target.value)} aria-invalid={over} aria-describedby={`${id}-count${over ? ` bv-${id}-error` : ''}`} data-testid={`bv-${id}`} />
      {over && <p id={`bv-${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-700" data-testid={`bv-error-${id}`}>Keep this under {max.toLocaleString()} characters.</p>}
    </div>
  )
}

// "Use" / "Avoid" chip input stored as one phrase per line.
function ChipInput({ id, label, value, onChange, tone }: { id: 'phrasesToUse' | 'phrasesToAvoid'; label: string; value: string; onChange: (v: string) => void; tone: 'use' | 'avoid' }) {
  const [text, setText] = useState('')
  const chips = value.split('\n').map((x) => x.trim()).filter(Boolean)
  const add = () => { const t = text.trim(); if (t && !chips.includes(t) && chips.length < MAX_PHRASES) onChange([...chips, t].join('\n')); setText('') }
  return (
    <div data-testid={`bv-${id}`}>
      <div className="flex items-baseline justify-between gap-3"><Label htmlFor={`bv-${id}-input`}>{label}</Label><span className="text-xs tabular-nums text-ink-muted" data-testid={`bv-count-${id}`}>{chips.length} phrase{chips.length === 1 ? '' : 's'} · max {MAX_PHRASES}</span></div>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`${label} phrases`}>
        {chips.map((c, i) => (
          <li key={c} className={cn('inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-[13px] ring-1', tone === 'use' ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-red-50 text-red-800 ring-red-200')} data-testid={`bv-chip-${id}-${i}`}>
            {c}
            <button type="button" onClick={() => onChange(chips.filter((x) => x !== c).join('\n'))} className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:h-8 max-sm:w-8" aria-label={`Remove ${c}`}><X className="h-3 w-3" aria-hidden /></button>
          </li>
        ))}
      </ul>
      <Input id={`bv-${id}-input`} className="mt-2 max-w-[480px]" placeholder={chips.length >= MAX_PHRASES ? `Limit of ${MAX_PHRASES} phrases reached` : 'Type a phrase and press Enter'} disabled={chips.length >= MAX_PHRASES} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} onBlur={add} data-testid={`bv-${id}-input`} />
    </div>
  )
}

function Preview({ draft, saved }: { draft: BrandVoice; saved: boolean }) {
  const nav = useNavigate()
  const [sample, setSample] = useState<VoiceSample['id']>('sizing')
  const [voice, setVoice] = useState(draft)
  useEffect(() => { const t = setTimeout(() => setVoice(draft), 250); return () => clearTimeout(t) }, [draft])
  const s = aiApi.VOICE_SAMPLES.find((x) => x.id === sample)!
  return (
    <AiCard title="Voice preview" description={saved ? 'Saved voice' : 'Draft voice, not saved yet'} testId="bv-preview">
      <div role="radiogroup" aria-label="Sample message" className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-muted/70 p-1">
        {aiApi.VOICE_SAMPLES.map((x) => <button key={x.id} type="button" role="radio" aria-checked={sample === x.id} onClick={() => setSample(x.id)} className={cn('min-h-8 rounded-lg px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11', sample === x.id ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`bv-preview-sample-${x.id}`}>{x.label}</button>)}
      </div>
      <div className="mt-4 space-y-3">
        <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-surface-muted px-4 py-2.5 text-sm text-ink" data-testid="bv-preview-customer">{s.customer}</div>
        <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-[0_1px_2px_rgba(31,29,26,0.04)]">
          <p className="text-xs font-semibold text-ink-muted">AI reply</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink" aria-live="polite" data-testid="bv-preview-reply">{aiApi.previewVoice(voice, sample)}</p>
        </div>
      </div>
      <Button variant="outline" className="mt-4 w-full" onClick={() => nav('/ai/testing', { state: { voice: draft } })} data-testid="bv-test-voice"><FlaskConical aria-hidden /> Test this voice</Button>
    </AiCard>
  )
}

function HowItWorks() {
  const where: [typeof Mail, string][] = [[FlaskConical, 'Conversation testing'], [PenLine, 'Agent drafts'], [Mail, 'Automatic email replies'], [MessageCircle, 'Widget chat']]
  return (
    <AiCard title={<span className="inline-flex items-center gap-2"><Info className="h-4 w-4 text-ink-muted" aria-hidden />How brand voice works</span>} testId="bv-how">
      <p className="text-[13px] font-medium text-ink">Applies to</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">{where.map(([I, l]) => <li key={l} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-ink"><I className="h-3.5 w-3.5 text-ink-muted" aria-hidden />{l}</li>)}</ul>
      <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">Voice shapes wording only. Refunds, returns and shipping rules come from Guidance, the AI never invents a promise to sound friendly, and handing over to a person always wins over style.</p>
    </AiCard>
  )
}

function Loaded({ initial }: { initial: BrandVoice }) {
  const isPhone = useIsPhone()
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])
  const over = (Object.keys(BRAND_VOICE_LIMITS) as Key[]).some((k) => draft[k].length > BRAND_VOICE_LIMITS[k])
  useUnsavedGuard('brand-voice', dirty)
  const set = (patch: Partial<BrandVoice>) => setDraft((d) => ({ ...d, ...patch }))
  const save = async () => {
    setSaving(true)
    try { const s = await aiApi.saveBrandVoice(draft); setSaved(s); setDraft(s); toast.success('Brand voice saved') } catch (e) { toast.error((e as Error).message) }
    setSaving(false)
  }
  const off = !draft.enabled && 'opacity-60'
  const side = <div className="space-y-4"><Preview draft={draft} saved={!dirty} /><HowItWorks /></div>
  return (
    <div className="grid gap-6 pb-6 lg:grid-cols-[minmax(0,720px)_minmax(320px,420px)] lg:justify-between" data-testid="brand-voice-tab">
      <div className="min-w-0 space-y-4">
        <AiCard title="Identity" description={`One voice for every AI reply. Last saved ${timeAgo(saved.updatedAt)}.`} testId="bv-card-identity"
          action={<label className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-ink"><Switch checked={draft.enabled} onCheckedChange={(v) => set({ enabled: v })} data-testid="bv-enabled" aria-label="Voice on" />Voice on</label>}>
          <VoiceField id="brandName" label="Brand name" hint="How the AI refers to the shop." value={draft.brandName} onChange={(v) => set({ brandName: v })} />
        </AiCard>
        <AiCard title="Tone" action={<Counter id="tone" value={draft.tone} max={BRAND_VOICE_LIMITS.tone} />} description={draft.enabled ? 'A few adjectives and a picture of the person writing.' : 'Voice is off. The AI uses a neutral, helpful style.'} className={cn(off)} testId="bv-card-tone">
          <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Tone presets">
            {PRESETS.map(([l, t]) => <button key={l} type="button" onClick={() => set({ tone: draft.tone.includes(t) ? draft.tone : `${draft.tone.trim()}${draft.tone.trim() ? ' ' : ''}${t}` })} className="min-h-8 rounded-full border border-border-strong bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11" data-testid={`bv-preset-${slug(l)}`}>+ {l}</button>)}
          </div>
          <VoiceField bare id="tone" label="Tone" value={draft.tone} onChange={(v) => set({ tone: v })} rows={4} />
        </AiCard>
        <AiCard title="How to respond" description="Structure, length and habits for every reply." className={cn(off)} testId="bv-card-respond">
          <div className="space-y-5">
            <VoiceField id="howToRespond" label="Habits and structure" value={draft.howToRespond} onChange={(v) => set({ howToRespond: v })} rows={4} />
            <VoiceField id="examples" label="Example replies" hint="Paste one or two replies you love. The AI copies the style, not the facts." value={draft.examples} onChange={(v) => set({ examples: v })} rows={5} />
          </div>
        </AiCard>
        <AiCard title="Words" description="Phrases the AI reaches for, and phrases it always rewrites around." className={cn(off)} testId="bv-card-words">
          <div className="space-y-5">
            <ChipInput id="phrasesToUse" label="Use" tone="use" value={draft.phrasesToUse} onChange={(v) => set({ phrasesToUse: v })} />
            <ChipInput id="phrasesToAvoid" label="Avoid" tone="avoid" value={draft.phrasesToAvoid} onChange={(v) => set({ phrasesToAvoid: v })} />
          </div>
        </AiCard>
        <AiCard title="Sign-off" action={<Counter id="signOff" value={draft.signOff} max={BRAND_VOICE_LIMITS.signOff} />} description="Added to the end of email replies." className={cn(off)} testId="bv-card-signoff">
          <VoiceField bare id="signOff" label="Sign-off" value={draft.signOff} onChange={(v) => set({ signOff: v })} rows={2} />
        </AiCard>
        {isPhone && <details className="rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04]" data-testid="bv-preview-collapsible"><summary className="flex min-h-12 cursor-pointer items-center px-4 text-[15px] font-semibold text-ink">Voice preview</summary><div className="p-2">{side}</div></details>}
        {dirty && (
          <SaveBar note={over ? <span className="text-xs font-medium text-red-700" data-testid="bv-over-note">Shorten the highlighted fields to save.</span> : null}>
            <Button variant="ghost" size="sm" onClick={() => setDraft(saved)} data-testid="bv-discard">Discard</Button>
            <Button size="sm" onClick={save} loading={saving} disabled={over} data-testid="bv-save">Save brand voice</Button>
          </SaveBar>
        )}
        <div className="sr-only" aria-live="polite"><SaveState dirty={dirty} testId="bv-save-state" /></div>
      </div>
      {!isPhone && <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start" aria-label="Voice preview" data-testid="bv-rail">{side}</aside>}
    </div>
  )
}

export function BrandVoiceTab() {
  const { data, loading, error, reload } = useApi(() => aiApi.getBrandVoice(), [])
  const [key, setKey] = useState(0)
  useEffect(() => setKey((k) => k + 1), [data])
  if (loading) return <div className="grid gap-6 lg:grid-cols-[minmax(0,720px)_380px] lg:justify-between" data-testid="bv-loading"><div className="space-y-4"><Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-96 w-full rounded-2xl" /></div><Skeleton className="h-80 w-full rounded-2xl" /></div>
  if (error || !data) return <ErrorState title="Brand voice didn't load" onRetry={reload} testId="bv-error" />
  return <Loaded key={key} initial={data} />
}
