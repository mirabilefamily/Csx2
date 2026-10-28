import { useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { InboxViewId, SavedView } from '@/types'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SavedViewMenu, ViewCount, viewRowCls } from './InboxViewsPanel'
import { INBOX_VIEWS } from '@/lib/inboxViews'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Props {
  active: InboxViewId
  counts: Record<InboxViewId, number> | undefined
  loading: boolean
  saved?: SavedView[]
  activeSaved?: string | null
  onViewsChange?: () => void
}

function useSetView() {
  const [params, setParams] = useSearchParams()
  return (id: InboxViewId | `saved:${string}`) => {
    const next = new URLSearchParams(params)
    next.delete('saved'); next.delete('view')
    if (id.startsWith('saved:')) next.set('saved', id.slice(6))
    else next.set('view', id)
    setParams(next)
  }
}

export function ViewsDropdown({ active, counts, saved = [], activeSaved }: Props) {
  const setView = useSetView()
  return (
    <Select value={activeSaved ? `saved:${activeSaved}` : active} onValueChange={(v) => setView(v as InboxViewId)}>
      <SelectTrigger className="h-9 whitespace-nowrap border-transparent bg-transparent px-2 text-sm font-semibold hover:bg-surface-muted [&>span]:truncate" aria-label="Inbox view" data-testid="views-dropdown">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {INBOX_VIEWS.map((v, i) => (
          <div key={v.id}>
            {v.group !== 'views' && INBOX_VIEWS[i - 1]?.group === 'views' && (
              <>
                {saved.length > 0 && <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-ink-subtle">Saved views</p>}
                {saved.map((s) => <SelectItem key={s.id} value={`saved:${s.id}`} className="data-[state=checked]:bg-tobacco-50 data-[state=checked]:font-semibold" data-testid={`views-dropdown-saved-${s.id}`}>{s.name} · {s.scope === 'shared' ? 'Shared' : 'Private'}</SelectItem>)}
                <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-ink-subtle">More</p>
              </>
            )}
            <SelectItem value={v.id} className="data-[state=checked]:bg-tobacco-50 data-[state=checked]:font-semibold" data-testid={`views-dropdown-${v.id}`}><span className="flex w-full min-w-[150px] items-center gap-3">{v.label}<ViewCount n={counts?.[v.id] ?? 0} active={active === v.id && !activeSaved} amber={v.id === 'needs_you'} /></span></SelectItem>
          </div>
        ))}
      </SelectContent>
    </Select>
  )
}

const chip = (on: boolean) => cn('inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'bg-tobacco-50 font-semibold text-ink' : 'font-medium text-ink hover:bg-surface-sunken')

// Phone: views as chips plus a "Views" sheet that also holds saved views (REQ-681).
export function ViewsChips({ active, counts, saved = [], activeSaved, onViewsChange }: Props) {
  const setView = useSetView()
  const [open, setOpen] = useState(false)
  const pick = (id: InboxViewId | `saved:${string}`) => { setView(id); setOpen(false) }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <nav aria-label="Inbox views" className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]" data-testid="inbox-view-chips">
        {INBOX_VIEWS.filter((v) => v.group === 'views').map((v) => (
          <button key={v.id} type="button" onClick={() => setView(v.id)} aria-current={!activeSaved && active === v.id ? 'page' : undefined} className={chip(!activeSaved && active === v.id)} data-testid={`view-chip-${v.id}`}>
            {v.label}
            {counts && <ViewCount n={counts[v.id]} active={!activeSaved && active === v.id} amber={v.id === 'needs_you'} />}
          </button>
        ))}
      </nav>
      <button type="button" onClick={() => setOpen(true)} className={cn(chip(!!activeSaved || !INBOX_VIEWS.find((v) => v.id === active && v.group === 'views')), 'px-3')} aria-label="All views and saved views" data-testid="views-sheet-trigger"><SlidersHorizontal className="h-4 w-4" aria-hidden /> Views</button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-sm" aria-describedby={undefined} data-testid="views-sheet">
          <div className="space-y-4 p-5">
            <SheetTitle className="text-base font-semibold text-ink">Views</SheetTitle>
            <ul className="space-y-0.5">{INBOX_VIEWS.map((v) => <li key={v.id}><button type="button" onClick={() => pick(v.id)} aria-current={!activeSaved && active === v.id ? 'page' : undefined} className={cn(viewRowCls(!activeSaved && active === v.id), 'w-full')} data-testid={`views-sheet-${v.id}`}><span className="truncate">{v.label}</span><ViewCount n={counts?.[v.id]} active={!activeSaved && active === v.id} amber={v.id === 'needs_you'} /></button></li>)}</ul>
            <p className="text-[11px] font-medium text-ink-subtle">Saved views</p>
            <ul className="space-y-0.5">{saved.map((s) => <li key={s.id} className="flex items-center gap-0.5"><button type="button" onClick={() => pick(`saved:${s.id}`)} aria-current={activeSaved === s.id ? 'page' : undefined} className={viewRowCls(activeSaved === s.id)} data-testid={`views-sheet-saved-${s.id}`}><span className="truncate">{s.name}</span><span className="ml-auto text-xs text-ink-muted">{s.scope === 'shared' ? 'Shared' : 'Private'}</span></button>{onViewsChange && <SavedViewMenu v={s} onChange={onViewsChange} />}</li>)}</ul>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
