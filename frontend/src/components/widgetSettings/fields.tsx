import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay'
import { ShopifyMark } from '@/components/brand/ShopifyMark'
import { useId, useRef, type ReactNode } from 'react'
import { ChevronDown, Upload, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { contrastWarning, isHex } from '@/lib/widgetRules'
import type { SettingSource } from '@/types'

export function Section({ id, title, description, summary, Icon, open, onToggle, children }: { id: string; title: string; description: string; summary: string; Icon: LucideIcon; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section id={id} className="cq scroll-mt-24 rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04]" data-testid={`ws-section-${id}`}>
      <h3>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-body`} className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-colors hover:bg-surface-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`ws-section-toggle-${id}`}>
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors', open ? 'bg-tobacco-50 text-tobacco-700' : 'bg-surface-muted text-ink-muted')} aria-hidden><Icon className="h-[18px] w-[18px]" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">{title}</span>
            {open
              ? <span className="block text-sm text-ink-muted">{description}</span>
              : <span className="block truncate text-sm text-ink-muted" data-testid={`ws-section-summary-${id}`}>{summary}</span>}
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </h3>
      {open && <div id={`${id}-body`} className="space-y-6 border-t border-border/70 px-5 pb-6 pt-5">{children}</div>}
    </section>
  )
}

export function FieldLabel({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">{children}</label>
      {hint}
    </div>
  )
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null
  return <p id={id} className="mt-1.5 text-sm text-red-600" role="alert" data-testid={id}>{children}</p>
}

export const PRESETS = [
  ['Tobacco', '#6B4F3A'],
  ['Espresso', '#3E2D21'],
  ['Brass', '#B08D57'],
  ['Saddle', '#8C6A35'],
  ['Sage', '#3F6B47'],
  ['Oxblood', '#86301F'],
  ['Charcoal', '#1F1D1A'],
  ['Cream', '#FAF8F5'],
  ['White', '#FFFFFF'],
] as const

export function SourceBadge({ source }: { source: SettingSource }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', source === 'desk' ? 'bg-tobacco-50 text-tobacco-700' : 'bg-white text-slate-700 ring-1 ring-inset ring-border')}>
      {source === 'theme' && <ShopifyMark size={12} decorative />}
      {source === 'desk' ? 'Goorin Support Desk' : 'Theme editor'}
    </span>
  )
}

interface ColorProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  contrast?: { against: string; label: string; fgIsThis?: boolean }
  source?: SettingSource
}

// Compact colour row: swatch (opens picker + brand presets) and a 120px hex input.
export function ColorField({ id, label, value, onChange, contrast }: ColorProps) {
  const err = isHex(value) ? null : 'Enter a 6-digit hex color like #6B4F3A.'
  const warn = contrast && contrastWarning(contrast.fgIsThis === false ? contrast.against : value, contrast.fgIsThis === false ? value : contrast.against)
  return (
    <div data-testid={`ws-color-${id}`}>
      <FieldLabel htmlFor={`ws-${id}`}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger className="h-9 w-9 shrink-0 rounded-lg border border-black/10 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ background: isHex(value) ? value : '#fff' }} aria-label={`Choose ${label.toLowerCase()} colour`} data-testid={`ws-${id}-swatch`} />
          <PopoverContent align="start" className="w-auto p-3" data-testid={`ws-${id}-popover`}>
            <input type="color" aria-label={`${label} picker`} value={isHex(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-24 w-full cursor-pointer rounded-md border border-border" data-testid={`ws-${id}-picker`} />
            <div className="mt-2 flex gap-1.5" role="group" aria-label={`${label} presets`}>
              {PRESETS.slice(0, 8).map(([name, hex]) => (
                <button key={hex} type="button" onClick={() => onChange(hex)} title={`${name} ${hex}`} aria-label={`${name} ${hex}`} className={cn('h-6 w-6 rounded-full border border-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', value.toUpperCase() === hex && 'ring-2 ring-ink ring-offset-1')} style={{ background: hex }} data-testid={`ws-${id}-preset-${hex.slice(1)}`} />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <input id={`ws-${id}`} value={value} onChange={(e) => onChange(e.target.value.trim())} aria-invalid={!!err} aria-describedby={err ? `ws-${id}-error` : undefined} spellCheck={false} className={cn('h-9 w-full min-w-0 flex-1 rounded-lg border bg-surface px-2.5 font-mono text-sm uppercase text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', err ? 'border-red-600' : 'border-border-strong')} data-testid={`ws-${id}-hex`} />
      </div>
      <FieldError id={`ws-${id}-error`}>{err}</FieldError>
      {!err && warn && <p className="mt-1.5 text-xs text-amber-700" data-testid={`ws-${id}-contrast`}>{contrast!.label}: {warn}</p>}
    </div>
  )
}

const OK_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

export function UploadField({ id, label, value, onChange, error, onError, thumbBg }: { id: string; label: string; value: string | null; onChange: (url: string | null) => void; error?: string; onError: (e?: string) => void; thumbBg?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const uid = useId()
  const pick = (f?: File) => {
    if (!f) return
    if (!OK_TYPES.includes(f.type) || f.size >= 1024 * 1024) return onError('Use a PNG, JPG or SVG under 1 MB.')
    onError(undefined)
    onChange(URL.createObjectURL(f))
  }
  return (
    <div>
      <FieldLabel htmlFor={uid}>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted" style={thumbBg ? { background: thumbBg } : undefined} data-testid={`ws-${id}-thumb-bg`}>
          {value ? <img src={value} alt={`${label} preview`} className={cn('h-full w-full', thumbBg ? 'object-contain p-1.5' : 'object-cover')} data-testid={`ws-${id}-thumb`} /> : <span className="text-xs text-ink-subtle">None</span>}
        </span>
        <input id={uid} ref={ref} type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml,image/gif" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} data-testid={`ws-${id}-input`} />
        <button type="button" onClick={() => ref.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`ws-${id}-upload`}>
          <Upload className="h-4 w-4" aria-hidden /> Upload
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm text-ink-muted hover:bg-surface-muted" aria-label={`Remove ${label}`} data-testid={`ws-${id}-remove`}>
            <X className="h-4 w-4" aria-hidden /> Remove
          </button>
        )}
      </div>
      <FieldError id={`ws-${id}-error`}>{error}</FieldError>
    </div>
  )
}

export function Segmented<T extends string>({ label, value, options, onChange, testId }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; testId: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink" id={`${testId}-label`}>{label}</p>
      <div role="radiogroup" aria-labelledby={`${testId}-label`} className="inline-flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1" data-testid={testId}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={cn('h-8 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', value === o.id ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`${testId}-${o.id}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RangeField({ id, label, value, min, max, unit = 'px', onChange }: { id: string; label: string; value: number; min: number; max: number; unit?: string; onChange: (n: number) => void }) {
  return (
    <div>
      <FieldLabel htmlFor={`ws-${id}`} hint={<span className="text-sm tabular-nums text-ink-muted" data-testid={`ws-${id}-value`}>{value}{unit}</span>}>{label}</FieldLabel>
      <input id={`ws-${id}`} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#6B4F3A]" data-testid={`ws-${id}`} />
    </div>
  )
}

export function TextField({ id, label, value, onChange, error, multiline, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; multiline?: boolean; placeholder?: string }) {
  const cls = cn('w-full rounded-md border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', error ? 'border-red-500' : 'border-border-strong')
  return (
    <div>
      <FieldLabel htmlFor={`ws-${id}`}>{label}</FieldLabel>
      {multiline ? (
        <textarea id={`ws-${id}`} rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} className={cn(cls, 'py-2')} data-testid={`ws-${id}`} />
      ) : (
        <input id={`ws-${id}`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} className={cn(cls, 'h-10')} data-testid={`ws-${id}`} />
      )}
      <FieldError id={`ws-${id}-error`}>{error}</FieldError>
    </div>
  )
}

export function Switch({ checked, onCheckedChange, className, ...rest }: { checked: boolean; onCheckedChange: (v: boolean) => void; className?: string; 'aria-label'?: string; 'data-testid'?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} className={cn('relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', checked ? 'bg-tobacco-600' : 'bg-border-strong', className)} {...rest}>
      <span className={cn('absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none', checked && 'translate-x-4')} />
    </button>
  )
}
