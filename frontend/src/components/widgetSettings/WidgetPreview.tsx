import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { EyeOff, Monitor, Smartphone } from 'lucide-react'
import type { WidgetSettings, WidgetState } from '@/types'
import { SupportWidget } from '@/components/widget/SupportWidget'
import { launcherSize } from '@/components/widget/Launcher'
import { Switch } from './fields'
import { WIDGET_STATES } from '@/components/storefront/DemoControls'
import { hiddenReason, PAGE_TYPE_LABELS } from '@/lib/widgetRules'
import { cn } from '@/lib/utils'
import { MiniStore, PREVIEW_PATHS, STORE_FONT } from './MiniStore'

export type PreviewPage = 'product' | 'collection' | 'cart'
export type Device = 'desktop' | 'tablet' | 'mobile'
export interface PreviewOptions { page: PreviewPage; device: Device; state: WidgetState; outsideHours: boolean }

function Seg<T extends string>({ label, value, options, onChange, testId }: { label: string; value: T; options: { id: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void; testId: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg p-0.5" data-testid={testId}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} aria-label={o.icon ? o.label : undefined} title={o.icon ? o.label : undefined} onClick={() => onChange(o.id)} className={cn('inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors', value === o.id ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`${testId}-${o.id}`}>
          {o.icon ?? o.label}
        </button>
      ))}
    </div>
  )
}

export function DeviceStage({ settings, opts, keyExtra = '' }: { settings: WidgetSettings; opts: PreviewOptions; keyExtra?: string }) {
  const isMobile = opts.device === 'mobile'
  const path = PREVIEW_PATHS[opts.page]
  const reason = hiddenReason(settings, { pageType: opts.page, pagePath: path, isMobile, outsideHours: opts.outsideHours })
  const key = [opts.state, opts.device, opts.page, opts.outsideHours, settings.launcher.animation, settings.launcher.bounceAfterSec, keyExtra].join('|')
  const screen = (
    <div className="relative h-full w-full overflow-hidden" style={{ fontFamily: STORE_FONT }} data-testid="preview-screen">
      <MiniStore page={opts.page} compact={opts.device !== 'desktop'} />
      <SupportWidget key={key} settings={settings} mode="contained" viewport={isMobile ? 'mobile' : 'desktop'} forcedState={opts.state} pageType={opts.page} pagePath={path} outsideHours={opts.outsideHours} />
      {reason && (
        <div className="absolute inset-x-3 bottom-3 z-20 flex items-start gap-3 rounded-lg border border-border bg-surface/95 p-3 shadow-popover backdrop-blur" role="status" data-testid="preview-hidden-overlay">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-ink" style={{ fontFamily: 'Inter, sans-serif' }}>{reason.title}</p>
            <p className="text-xs text-ink-muted" style={{ fontFamily: 'Inter, sans-serif' }}>{reason.detail}</p>
          </div>
        </div>
      )}
    </div>
  )
  if (opts.device === 'mobile')
    return (
      <div className="mx-auto h-[600px] w-[290px] rounded-[46px] bg-[#1F1D1A] p-[10px] shadow-popover" data-testid="device-frame-mobile">
        <div className="relative h-full overflow-hidden rounded-[36px] bg-white">
          <div className="absolute left-1/2 top-2 z-30 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-[#1F1D1A]" aria-hidden />
          <div className="h-full pt-8">{screen}</div>
        </div>
      </div>
    )
  if (opts.device === 'tablet')
    return (
      <div className="mx-auto h-[600px] w-full max-w-[460px] rounded-[28px] bg-[#2A2724] p-3 shadow-popover" data-testid="device-frame-tablet">
        <div className="h-full overflow-hidden rounded-[18px] bg-white">{screen}</div>
      </div>
    )
  return (
    <div className="overflow-hidden rounded-xl border border-border-strong bg-white shadow-card" data-testid="device-frame-desktop">
      <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-3 py-2">
        <span className="flex gap-1" aria-hidden>{['#E0675A', '#E9B44C', '#6DB46B'].map((c) => <i key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}</span>
        <span className="ml-2 flex-1 truncate rounded bg-surface px-2 py-0.5 text-[11px] text-ink-muted">goorin.myshopify.com{path}</span>
      </div>
      <div className="h-[calc(100vh-260px)] min-h-[560px] max-h-[760px]">{screen}</div>
    </div>
  )
}

const VIEWS: { id: WidgetState; label: string }[] = [{ id: 'home', label: 'Home' }, { id: 'active_chat', label: 'Conversation' }, { id: 'order_tracking', label: 'Order tracking' }]
const SURFACE = 'radial-gradient(120% 90% at 15% 0%, #F7F3EC 0%, #EEE8DF 55%, #E7E0D5 100%)'

// Scales a fixed-size stage down to fit the available width and viewport height.
function Fit({ w, h, children, testId }: { w: number; h: number; children: ReactNode; testId: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY)
    const on = () => setScale(Math.min(1, el.clientWidth / w, Math.max(360, window.innerHeight - top - 64) / h))
    on()
    const ro = new ResizeObserver(on)
    ro.observe(el)
    window.addEventListener('resize', on)
    return () => { ro.disconnect(); window.removeEventListener('resize', on) }
  }, [w, h])
  return (
    <div ref={ref} className="flex w-full justify-center" style={{ height: h * scale }} data-testid={testId} data-scale={scale.toFixed(2)}>
      <div className="relative shrink-0 origin-top" style={{ width: w, height: h, transform: `scale(${scale})` }}>{children}</div>
    </div>
  )
}

// Channels preview: just the widget on a quiet surface (no mock storefront).
function PreviewStage({ settings, opts, nonce }: { settings: WidgetSettings; opts: PreviewOptions; nonce: number }) {
  const isMobile = opts.device === 'mobile'
  const offline = opts.outsideHours && settings.display.outsideHours === 'offline_form'
  const state = offline ? 'offline' : opts.state
  const reason = hiddenReason(settings, { pageType: 'product', pagePath: PREVIEW_PATHS.product, isMobile, outsideHours: opts.outsideHours })
  const key = [state, opts.device, opts.outsideHours, nonce, settings.launcher.size, settings.launcher.position].join('|')
  const off = settings.launcher.offset
  const w = isMobile ? 300 : 400 + off.x * 2
  const h = isMobile ? 620 : (state === 'home' ? 580 : 680) + off.y + launcherSize(settings.launcher) + 32
  const widget = (
    <>
      <SupportWidget key={key} settings={settings} mode="contained" viewport={isMobile ? 'mobile' : 'desktop'} forcedState={state} pageType="product" pagePath={PREVIEW_PATHS.product} outsideHours={opts.outsideHours} />
      {reason && (
        <div className="absolute inset-x-3 bottom-3 z-20 flex items-start gap-3 rounded-lg border border-border bg-surface/95 p-3 shadow-popover backdrop-blur" role="status" data-testid="preview-hidden-overlay">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-ink">{reason.title}</p>
            <p className="text-xs text-ink-muted">{reason.detail}</p>
          </div>
        </div>
      )}
    </>
  )
  return (
    <div className="rounded-2xl px-3 py-5 ring-1 ring-black/[0.04]" style={{ background: SURFACE }} data-testid="preview-surface">
      <Fit w={w} h={h} testId="preview-stage">
        {isMobile ? (
          <div className="h-full w-full rounded-[44px] border-[1.5px] border-ink/20 bg-surface/40 p-[7px]" data-testid="device-frame-mobile">
            <div className="relative h-full w-full overflow-hidden rounded-[37px]" style={{ fontFamily: STORE_FONT, background: SURFACE }} data-testid="preview-screen">{widget}</div>
          </div>
        ) : (
          <div className="relative h-full w-full" style={{ fontFamily: STORE_FONT }} data-testid="preview-screen">{widget}</div>
        )}
      </Fit>
    </div>
  )
}

function AfterHours({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-muted">
      Outside business hours
      <Switch checked={value} onCheckedChange={onChange} aria-label="Outside business hours" data-testid="preview-outside-hours" />
    </label>
  )
}

export function WidgetPreview({ settings, opts, onChange, title }: { settings: WidgetSettings; opts: PreviewOptions; onChange: (o: PreviewOptions) => void; title?: string }) {
  const [nonce, setNonce] = useState(0)
  const set = <K extends keyof PreviewOptions>(k: K, v: PreviewOptions[K]) => { setNonce((n) => n + 1); onChange({ ...opts, [k]: v }) }
  return (
    <div className="space-y-3" data-testid="widget-preview">
      <div className="flex min-h-8 items-center justify-between gap-3" data-testid="preview-header">
        {title ? <p className="text-[15px] font-semibold text-ink">{title}</p> : <span />}
        <AfterHours value={opts.outsideHours} onChange={(v) => set('outsideHours', v)} />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted/70 p-1.5" role="toolbar" aria-label="Preview controls" data-testid="preview-toolbar">
        <Seg label="Preview device" testId="preview-device" value={opts.device === 'mobile' ? 'mobile' : 'desktop'} onChange={(v) => set('device', v)} options={[{ id: 'desktop', label: 'Desktop', icon: <Monitor className="h-3.5 w-3.5" aria-hidden /> }, { id: 'mobile', label: 'Phone', icon: <Smartphone className="h-3.5 w-3.5" aria-hidden /> }]} />
        <Seg label="Preview view" testId="preview-view" value={VIEWS.some((v) => v.id === opts.state) ? opts.state : 'home'} onChange={(v) => set('state', v)} options={VIEWS} />
      </div>
      <PreviewStage settings={settings} opts={opts} nonce={nonce} />
      <p className="text-xs text-ink-muted" data-testid="preview-caption">Uses the same code shoppers get. Shows your draft; nothing is sent from the preview.</p>
    </div>
  )
}
