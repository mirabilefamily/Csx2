import { useState } from 'react'
import { ChevronDown, FlaskConical } from 'lucide-react'
import type { WidgetState } from '@/types'
import { Switch } from '@/components/ui/overlay'
import { DemoStateSwitcher } from '@/components/DemoStateSwitcher'
import { cn } from '@/lib/utils'
import { STORE_PAGES, type StorePage } from './storeTypes'

export const WIDGET_STATES: { id: WidgetState; label: string }[] = [
  { id: 'launcher_closed', label: 'Launcher closed' },
  { id: 'home', label: 'Home' },
  { id: 'order_tracking', label: 'Order tracking' },
  { id: 'greeting_bubble', label: 'Greeting bubble' },
  { id: 'prechat', label: 'Pre-chat form' },
  { id: 'active_chat', label: 'Active chat' },
  { id: 'handoff', label: 'AI → human handoff' },
  { id: 'offline', label: 'Offline' },
  { id: 'csat', label: 'CSAT' },
  { id: 'transcript_sent', label: 'Transcript sent' },
]

interface Props {
  side: 'left' | 'right'
  page: StorePage
  onPage: (p: StorePage) => void
  current?: WidgetState
  onJump: (s: WidgetState) => void
  toggles: { loggedIn: boolean; outsideHours: boolean; hostile: boolean }
  onToggle: (k: 'loggedIn' | 'outsideHours' | 'hostile', v: boolean) => void
}

const TOGGLES = [
  ['loggedIn', 'Logged-in customer', 'Dev Patel, skips pre-chat'],
  ['outsideHours', 'Team offline', 'Offline form instead of chat'],
  ['hostile', 'Hostile store CSS', 'Aggressive global theme styles'],
] as const

export function DemoControls({ side, page, onPage, current, onJump, toggles, onToggle }: Props) {
  const [open, setOpen] = useState(() => window.innerWidth >= 1024)
  return (
    <aside
      data-demo-controls=""
      aria-label="Widget demo controls"
      className={cn('fixed top-[124px] z-30 w-[272px] max-w-[calc(100vw-32px)] rounded-[12px] border border-border-strong bg-surface font-sans text-ink shadow-popover', side === 'left' ? 'left-4' : 'right-4')}
      data-testid="demo-controls"
    >
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-semibold" data-testid="demo-controls-toggle">
        <FlaskConical className="h-4 w-4 text-brass-700" aria-hidden />
        Widget demo controls
        <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto border-t border-border px-4 pb-4 pt-3">
          <section>
            <p className="text-[11px] font-semibold text-ink-muted">Store page</p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1" role="radiogroup" aria-label="Store page">
              {STORE_PAGES.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={page === p.id} onClick={() => onPage(p.id)} className={cn('h-8 rounded-md text-[12px] font-medium', page === p.id ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`demo-page-${p.id}`}>{p.label}</button>
              ))}
            </div>
          </section>
          <section>
            <p className="text-[11px] font-semibold text-ink-muted">Jump to state</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {WIDGET_STATES.map((s) => (
                <button key={s.id} type="button" onClick={() => onJump(s.id)} aria-pressed={current === s.id} className={cn('min-h-8 rounded-md border px-2 py-1.5 text-left text-[12px] leading-tight', current === s.id ? 'border-tobacco-600 bg-tobacco-50 font-semibold text-tobacco-700' : 'border-border hover:bg-surface-muted')} data-testid={`demo-jump-${s.id}`}>{s.label}</button>
              ))}
            </div>
          </section>
          <section className="space-y-3">
            {TOGGLES.map(([key, label, hint]) => (
              <label key={key} className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-[13px] font-medium">{label}</span>
                  <span className="block text-[11.5px] text-ink-muted">{hint}</span>
                </span>
                <Switch checked={toggles[key]} onCheckedChange={(v) => onToggle(key, v)} aria-label={label} data-testid={`demo-toggle-${key}`} />
              </label>
            ))}
          </section>
          <section className="border-t border-border pt-3">
            <DemoStateSwitcher inline />
          </section>
        </div>
      )}
    </aside>
  )
}
