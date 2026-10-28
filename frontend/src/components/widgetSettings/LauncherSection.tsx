import { Upload } from 'lucide-react'
import type { LauncherIcon, LauncherPosition, WidgetSettings } from '@/types'
import { LauncherGlyph } from '@/components/widget/icons'
import { cn } from '@/lib/utils'
import { ColorField, FieldError, FieldLabel, RangeField, Segmented, SourceBadge, TextField, UploadField } from './fields'
import type { Update, WidgetErrors } from './validate'

const ICONS: { id: LauncherIcon; label: string }[] = [
  { id: 'chat', label: 'Message' },
  { id: 'question', label: 'Help' },
  { id: 'hat', label: 'Hat' },
  { id: 'custom', label: 'Custom' },
]
const POSITIONS: { id: LauncherPosition; label: string }[] = [
  { id: 'top-left', label: 'Top left' },
  { id: 'top-right', label: 'Top right' },
  { id: 'bottom-left', label: 'Bottom left' },
  { id: 'bottom-right', label: 'Bottom right' },
]

interface Props {
  draft: WidgetSettings
  update: Update
  errors: WidgetErrors
  setUploadError: (key: string, e?: string) => void
}

export function LauncherSection({ draft, update, errors, setUploadError }: Props) {
  const l = draft.launcher
  return (
    <>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink" id="ws-icon-label">Launcher icon</p>
        <div role="radiogroup" aria-labelledby="ws-icon-label" className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-muted p-1" data-testid="ws-icon">
          {ICONS.map((i) => (
            <button key={i.id} type="button" role="radio" aria-checked={l.icon === i.id} onClick={() => update((d) => { d.launcher.icon = i.id })} className={cn('inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', l.icon === i.id ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`ws-icon-${i.id}`}>
              {i.id === 'custom' && !l.customIconUrl ? <Upload className="h-4 w-4" aria-hidden /> : <LauncherGlyph icon={i.id} customUrl={l.customIconUrl} size={18} />}
              {i.label}
            </button>
          ))}
        </div>
        {l.icon === 'custom' && (
          <div className="mt-3">
            <UploadField id="custom-icon" label="Custom icon (SVG or PNG)" value={l.customIconUrl} error={errors['custom-icon']} onError={(e) => setUploadError('custom-icon', e)} onChange={(v) => update((d) => { d.launcher.customIconUrl = v; d.launcher.icon = v ? 'custom' : 'chat' })} />
          </div>
        )}
      </div>
      <Segmented label="Button colour" testId="ws-button-colour" value={l.buttonColor ?? 'white'} onChange={(v) => update((d) => { d.launcher.buttonColor = v; if (v === 'white') d.launcher.backgroundColor = '#FFFFFF' })} options={[{ id: 'white', label: 'White' }, { id: 'panel', label: 'Panel colour' }]} />
      <div className="cq-pair">
        <ColorField id="iconColor" label="Icon color" value={l.iconColor} onChange={(v) => update((d) => { d.launcher.iconColor = v })} />
        {l.buttonColor !== 'panel' && <ColorField id="launcherBg" label="Background color" value={l.backgroundColor} onChange={(v) => update((d) => { d.launcher.backgroundColor = v })} contrast={{ against: l.iconColor, label: 'Icon on launcher', fgIsThis: false }} />}
        <ColorField id="badgeColor" label="Unread badge color" value={l.badgeColor} onChange={(v) => update((d) => { d.launcher.badgeColor = v })} />
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <Segmented label="Style" testId="ws-style" value={l.style} onChange={(v) => update((d) => { d.launcher.style = v })} options={[{ id: 'circle', label: 'Icon only' }, { id: 'pill', label: 'Pill with label' }]} />
        <Segmented label="Size" testId="ws-size" value={l.size} onChange={(v) => update((d) => { d.launcher.size = v })} options={[{ id: 's', label: 'S' }, { id: 'm', label: 'M' }, { id: 'l', label: 'L' }]} />
      </div>
      {l.style === 'pill' && (
        <div>
          <TextField id="launcher-label" label="Pill label" value={l.label} onChange={(v) => update((d) => { d.launcher.label = v })} error={errors['launcher-label']} />
        </div>
      )}
      <div>
        <div className="flex items-center gap-2"><SourceBadge source={draft.sources.launcherPosition} /></div>
        <div className="mt-2">
          <p className="mb-1.5 text-sm font-medium text-ink" id="ws-position-label">Position</p>
          <div role="radiogroup" aria-labelledby="ws-position-label" className="grid w-[104px] grid-cols-2 gap-1.5 rounded-xl border border-border bg-surface-muted/50 p-1.5" data-testid="ws-position">
            {POSITIONS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={l.position === p.id} onClick={() => update((d) => { d.launcher.position = p.id; d.sources.launcherPosition = 'desk' })} aria-label={p.label} title={p.label} className={cn('relative h-9 rounded-lg border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', l.position === p.id ? 'border-tobacco-600 bg-tobacco-50 font-medium text-tobacco-800' : 'border-border-strong text-ink-muted hover:bg-surface-muted')} data-testid={`ws-position-${p.id}`}>
                <span className={cn('absolute h-2 w-2 rounded-full', l.position === p.id ? 'bg-tobacco-600' : 'bg-ink-subtle', p.id.startsWith('top') ? 'top-2' : 'bottom-2', p.id.endsWith('left') ? 'left-2' : 'right-2')} aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2" data-testid="ws-spacing">
        <p className="text-sm font-medium text-ink">Spacing from the edge</p>
        {([['Desktop', 'offset', 64], ['Phone', 'mobileOffset', 48]] as const).map(([lab, k, max]) => (
          <div key={k} className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"><span className="w-16">{lab}</span>
            {(['x', 'y'] as const).map((ax) => (
              <label key={ax} className="inline-flex items-center gap-1.5">{ax === 'x' ? 'Side' : 'Bottom'}
                <span className="relative inline-flex w-[88px] items-center"><input type="number" min={0} max={max} value={l[k][ax]} onChange={(e) => update((d) => { d.launcher[k][ax] = Math.max(0, Math.min(max, Number(e.target.value) || 0)) })} className="h-9 w-full rounded-lg border border-border-strong bg-surface pl-2.5 pr-7 text-sm text-ink tabular-nums" data-testid={`ws-${k}-${ax}`} /><span className="pointer-events-none absolute right-2 text-xs">px</span></span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Segmented label="Attention animation" testId="ws-animation" value={l.animation} onChange={(v) => update((d) => { d.launcher.animation = v })} options={[{ id: 'none', label: 'None' }, { id: 'pulse_once', label: 'Pulse once' }, { id: 'bounce', label: 'Bounce after…' }]} />
        {l.animation === 'bounce' && (
          <div>
            <FieldLabel htmlFor="ws-bounce-after">Seconds</FieldLabel>
            <input id="ws-bounce-after" type="number" min={1} max={60} value={l.bounceAfterSec} onChange={(e) => update((d) => { d.launcher.bounceAfterSec = Number(e.target.value) })} aria-invalid={!!errors['bounce-after']} className="h-10 w-24 rounded-md border border-border-strong bg-surface px-3 text-sm" data-testid="ws-bounce-after" />
          </div>
        )}
      </div>
      <FieldError id="ws-bounce-after-error">{errors['bounce-after']}</FieldError>
    </>
  )
}
