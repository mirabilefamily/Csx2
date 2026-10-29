import { useState } from 'react'
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Plus, Search } from 'lucide-react'
import { FOLDERS, type FolderId } from '@/lib/inboxFolders'
import type { SavedView } from '@/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

interface Props {
  active: FolderId | null
  counts?: Record<FolderId, number>
  onSelect: (id: FolderId) => void
  onNew: () => void
}

interface ViewProps {
  views?: SavedView[]
  viewCounts?: Record<string, number>
  activeView?: string | null
  onPickView?: (id: string) => void
  onNewView?: () => void
  onSearch?: () => void
  onCollapse?: () => void
}

const rowCls = (on: boolean, phone?: boolean) => cn('flex w-full items-center gap-2.5 rounded-lg text-left transition-[background-color,box-shadow,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', phone ? 'h-12 px-3 text-[15px]' : 'h-9 px-2.5 text-[13px]', on ? 'bg-white font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/.06),0_2px_8px_rgb(0_0_0/.05)]' : 'text-ink/75 hover:bg-white/60 hover:text-ink')

function Count({ id, n, on, phone }: { id: FolderId; n?: number; on: boolean; phone?: boolean }) {
  const kind = FOLDERS.find((f) => f.id === id)!.count
  if (kind === 'none' || !n) return null
  if (kind === 'badge') return <span className={cn('ml-auto min-w-[20px] rounded-full bg-tobacco-600 px-1.5 text-center font-semibold tabular-nums text-white', phone ? 'text-xs leading-6' : 'text-[11px] leading-5')} data-testid={`folder-count-${id}`}>{n}</span>
  return <span className={cn('ml-auto tabular-nums', phone ? 'text-sm' : 'text-xs', on ? 'text-ink' : 'text-ink-muted')} data-testid={`folder-count-${id}`}>{n}</span>
}

// Collapsible saved-view group, collapsed by default (REQ-1058).
function ViewGroup({ scope, title, p, phone }: { scope: 'shared' | 'private'; title: string; p: ViewProps; phone?: boolean }) {
  const [open, setOpen] = useState(false)
  const views = (p.views ?? []).filter((v) => v.scope === scope)
  return (
    <div className="mt-1" data-testid={`views-group-${scope}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-8 w-full items-center gap-1.5 rounded-md px-2.5 text-left text-[11px] font-medium text-ink-muted transition-colors duration-150 hover:text-ink" data-testid={`views-toggle-${scope}`}>
        <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} aria-hidden />{title}
        {views.length > 0 && <span className="ml-auto font-normal tabular-nums">{views.length}</span>}
      </button>
      {open && (
        <ul className="space-y-0.5 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {views.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => p.onPickView?.(v.id)} className={cn(rowCls(p.activeView === v.id, phone), 'pl-7')} data-testid={`saved-view-${v.id}`}>
                <span className="min-w-0 flex-1 truncate">{v.name}</span>
                <span className="text-xs tabular-nums text-ink-muted">{p.viewCounts?.[v.id] ?? ''}</span>
              </button>
            </li>
          ))}
          <li><button type="button" onClick={p.onNewView} className={cn(rowCls(false, phone), 'pl-7 text-ink-muted')} data-testid={`new-view-${scope}`}><Plus className="h-3.5 w-3.5" aria-hidden />New view</button></li>
        </ul>
      )}
    </div>
  )
}

// Folder column (REQ-1053..1058, REQ-1063); also the phone's first Inbox screen (REQ-1061).
export function FolderColumn({ active, counts, onSelect, onNew, phone, overlay, ...p }: Props & ViewProps & { phone?: boolean; overlay?: boolean }) {
  const t = overlay ? 'folder-overlay' : 'folder'
  return (
    <nav aria-label="Inbox folders" className={cn('flex min-h-0 shrink-0 flex-col overflow-y-auto', phone ? 'w-full flex-1 bg-white' : 'w-[220px]', overlay && 'absolute inset-y-0 left-0 z-30 bg-[#F6F3EE] shadow-popover animate-in fade-in slide-in-from-left-2 duration-200')} data-testid={overlay ? 'folder-overlay' : 'folder-column'}>
      <div className={cn('flex h-14 shrink-0 items-center gap-0.5', phone ? 'px-4' : 'pl-4 pr-2')}>
        <h1 className={cn('flex-1 font-semibold tracking-[-0.01em] text-ink', phone ? 'text-xl' : 'text-[17px]')} data-testid="page-title">Inbox</h1>
        {p.onSearch && <Button variant="ghost" size={phone ? 'icon' : 'icon-sm'} onClick={p.onSearch} aria-label="Search" data-testid={`${t}-search`}><Search aria-hidden /></Button>}
        {p.onCollapse && !phone && <Button variant="ghost" size="icon-sm" onClick={p.onCollapse} aria-label="Collapse folders" title="Collapse folders" data-testid="folder-collapse"><PanelLeftClose aria-hidden /></Button>}
      </div>
      <div className={phone ? 'px-3' : 'px-2'}>
        <button type="button" onClick={onNew} className={cn('flex w-full items-center gap-2 rounded-lg border border-transparent font-medium text-ink transition-[background-color,border-color] duration-150 hover:border-[#EAE5DD] hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', phone ? 'h-11 px-3 text-[15px]' : 'h-9 px-2.5 text-[13px]')} data-testid={overlay ? 'new-ticket-overlay' : 'new-ticket-button'}>
          <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />New ticket
          <kbd className="ml-auto rounded-md border border-[#E7E2DA] bg-white/70 px-1.5 font-sans text-[11px] leading-[18px] text-ink-muted max-sm:hidden">N</kbd>
        </button>
      </div>
      <p className="px-4 pb-1.5 pt-5 text-[11px] font-medium text-ink-muted" data-testid="folders-label">Folders</p>
      <ul className={cn('space-y-0.5', phone ? 'px-2' : 'px-2')}>
        {FOLDERS.map((f) => {
          const on = active === f.id
          return (
            <li key={f.id}>
              {f.id === 'spam' && <span className="mx-2.5 my-2 block h-px bg-[#ECE7DF]" aria-hidden data-testid={`${t}-secondary-divider`} />}
              <button type="button" aria-current={on ? 'page' : undefined} onClick={() => onSelect(f.id)} className={cn(rowCls(on, phone), f.secondary && !on && 'text-ink-muted')} data-testid={`${t}-${f.id}`}>
                <f.icon strokeWidth={1.75} className={cn('shrink-0', phone ? 'h-5 w-5' : 'h-4 w-4', on ? 'text-ink' : f.secondary ? 'text-ink-muted/70' : 'text-ink-muted')} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{f.label}</span>
                <Count id={f.id} n={counts?.[f.id]} on={on} phone={phone} />
                {phone && <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />}
              </button>
            </li>
          )
        })}
      </ul>
      {!overlay && (
        <div className="mt-4 border-t border-[#ECE7DF] px-2 pt-2 pb-4">
          <ViewGroup scope="shared" title="Shared views" p={p} phone={phone} />
          <ViewGroup scope="private" title="Private views" p={p} phone={phone} />
        </div>
      )}
    </nav>
  )
}

// 56px icon strip (REQ-1060): tooltips, counts as dots, toggle to expand.
export function FolderStrip({ active, counts, onSelect, onNew, onExpand, className }: Props & { onExpand?: () => void; className?: string }) {
  const tip = (label: string, el: React.ReactNode) => (
    <Tooltip><TooltipTrigger asChild>{el}</TooltipTrigger><TooltipContent side="right">{label}</TooltipContent></Tooltip>
  )
  return (
    <nav aria-label="Inbox folders" className={cn('w-14 shrink-0 flex-col items-center gap-1 py-2.5', className)} data-testid="folder-strip">
      {onExpand && tip('Show folders', <Button variant="ghost" size="icon-sm" onClick={onExpand} aria-label="Show folders" data-testid="folder-strip-expand"><PanelLeftOpen aria-hidden /></Button>)}
      {tip('New ticket  N', <Button variant="ghost" size="icon-sm" onClick={onNew} aria-label="New ticket" data-testid="new-ticket-strip"><Plus aria-hidden /></Button>)}
      <span className="my-1 h-px w-6 bg-border" aria-hidden />
      {FOLDERS.map((f) => {
        const on = active === f.id
        const n = counts?.[f.id] ?? 0
        return (
          <span key={f.id} className="contents">
            {f.id === 'spam' && <span className="my-1 h-px w-6 bg-border" aria-hidden />}
            {tip(`${f.label}${f.count !== 'none' && n ? ` · ${n}` : ''}`, (
              <button type="button" aria-label={f.label} aria-current={on ? 'page' : undefined} onClick={() => onSelect(f.id)} className={cn('relative flex h-9 w-9 items-center justify-center rounded-lg transition-[background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/.06),0_2px_8px_rgb(0_0_0/.05)]' : 'text-ink-muted hover:bg-white/60 hover:text-ink')} data-testid={`folder-strip-${f.id}`}>
                <f.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {f.count !== 'none' && n > 0 && <span className={cn('absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full', f.count === 'badge' ? 'bg-tobacco-600' : 'bg-ink-muted/60')} aria-hidden />}
              </button>
            ))}
          </span>
        )
      })}
      <ChevronDown className="hidden" aria-hidden />
    </nav>
  )
}
