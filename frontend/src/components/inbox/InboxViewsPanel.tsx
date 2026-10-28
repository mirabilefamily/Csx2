import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, HelpCircle, MoreHorizontal, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { InboxViewId, SavedView, SavedViewFilters } from '@/types'
import { viewsApi } from '@/api'
import { useAuth } from '@/components/auth/AuthContext'
import { Button, focusRing } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { INBOX_VIEWS } from '@/lib/inboxViews'
import { cn } from '@/lib/utils'
import { CountBadge } from './DetailParts'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const AI_HINT = isMac ? '⌘G' : 'Ctrl+G'

export const viewRowCls = (active: boolean) => cn('flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 text-left text-[13px] transition-colors max-sm:h-11', active ? 'bg-tobacco-50 font-semibold text-ink' : 'font-medium text-ink hover:bg-surface-sunken', focusRing)
export function ViewCount({ n, active, amber }: { n?: number; active: boolean; amber?: boolean }) {
  if (n === undefined) return null
  return <span className="ml-auto"><CountBadge n={n} tone={amber ? 'amber' : active ? 'active' : undefined} testId="view-count" /></span>
}

function Row({ label, count, active, onClick, testId, menu, amber }: { label: string; count?: number; active: boolean; onClick: () => void; testId: string; menu?: React.ReactNode; amber?: boolean }) {
  return (
    <div className="group flex items-center gap-0.5">
      <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={viewRowCls(active)} data-testid={testId}>
        <span className="truncate">{label}</span>
        <ViewCount n={count} active={active} amber={amber} />
      </button>
      {menu}
    </div>
  )
}

function Group({ title, children, testId, defaultOpen = true }: { title: string; children: React.ReactNode; testId: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div data-testid={testId}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={cn('flex min-h-8 w-full items-center gap-1 px-2.5 text-xs font-semibold text-ink-muted hover:text-ink', focusRing)} data-testid={`${testId}-toggle`}>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} aria-hidden />{title}
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  )
}

export function SaveViewDialog({ open, onOpenChange, filters, initial, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; filters: SavedViewFilters; initial?: SavedView; onSaved: (v: SavedView) => void }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'shared' | 'private'>('private')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (open) { setName(initial?.name ?? ''); setScope(initial?.scope ?? 'private'); setError(null) } }, [open, initial])
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Give this view a name.')
    try { const v = await viewsApi.saveView({ id: initial?.id, name, scope, filters: initial?.filters ?? filters }, user!); toast.success(initial ? 'View updated' : 'View saved'); onSaved(v) } catch (err) { setError((err as Error).message) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="save-view-dialog">
        <DialogTitle className="text-base font-semibold text-ink">{initial ? 'Rename view' : 'Save view'}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-muted">Saves the current filters, sort and search.</DialogDescription>
        <form onSubmit={submit} noValidate className="mt-4 space-y-4">
          <div>
            <Label htmlFor="sv-name">Name</Label>
            <Input id="sv-name" maxLength={40} className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!error} data-testid="save-view-name" />
            {error && <p role="alert" className="mt-1.5 text-xs font-medium text-red-700" data-testid="save-view-error">{error}</p>}
          </div>
          <div role="radiogroup" aria-label="Who can see it" className="inline-flex gap-1 rounded-lg bg-surface-muted p-1">
            {(['private', 'shared'] as const).map((s) => <button key={s} type="button" role="radio" aria-checked={scope === s} onClick={() => setScope(s)} className={cn('min-h-9 rounded-md px-3 text-sm', scope === s ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-muted', focusRing)} data-testid={`save-view-scope-${s}`}>{s === 'private' ? 'Private (only you)' : 'Shared (whole team)'}</button>)}
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" data-testid="save-view-submit">Save view</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SavedViewMenu({ v, onChange, onDeleted }: { v: SavedView; onChange: () => void; onDeleted?: () => void }) {
  const { user } = useAuth()
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const can = viewsApi.canManageView(v, user)
  const why = can ? undefined : 'Only the creator or an admin can change this view.'
  const act = async (what: 'duplicate' | 'scope' | 'delete') => {
    try {
      if (what === 'delete') { await viewsApi.deleteView(v.id, user!); toast.success('View deleted'); onDeleted?.() }
      else await viewsApi.saveView({ id: what === 'scope' ? v.id : undefined, name: what === 'duplicate' ? `${v.name} copy` : v.name, scope: what === 'scope' ? (v.scope === 'shared' ? 'private' : 'shared') : v.scope, filters: v.filters }, user!)
      onChange()
    } catch (e) { toast.error((e as Error).message) }
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className={cn('mr-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted max-sm:h-11 max-sm:w-11', focusRing)} aria-label={`${v.name} options`} data-testid={`saved-view-menu-${v.id}`}><MoreHorizontal className="h-4 w-4" aria-hidden /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!can} title={why} onSelect={() => setRenaming(true)} data-testid="saved-view-rename">Rename</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => act('duplicate')} data-testid="saved-view-duplicate">Duplicate</DropdownMenuItem>
          <DropdownMenuItem disabled={!can} title={why} onSelect={() => act('scope')} data-testid="saved-view-scope">{v.scope === 'shared' ? 'Make private' : 'Make shared'}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!can} title={why} className="text-red-700" onSelect={() => setDeleting(true)} data-testid="saved-view-delete">Delete</DropdownMenuItem>
          {!can && <p className="max-w-[220px] px-2 py-1.5 text-xs text-ink-muted" data-testid="saved-view-locked">{why}</p>}
        </DropdownMenuContent>
      </DropdownMenu>
      <SaveViewDialog open={renaming} onOpenChange={setRenaming} filters={{}} initial={v} onSaved={() => { setRenaming(false); onChange() }} />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent data-testid="delete-view-dialog">
          <AlertDialogTitle>Delete {v.name}?</AlertDialogTitle>
          <AlertDialogDescription>This removes the view for {v.scope === 'shared' ? 'the whole team' : 'you'}. Tickets aren't affected.</AlertDialogDescription>
          <AlertDialogFooter><AlertDialogCancel data-testid="delete-view-cancel">Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-700 hover:bg-red-700/90" onClick={() => act('delete')} data-testid="delete-view-confirm">Delete view</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface Props { counts: Record<InboxViewId, number>; savedCounts: Record<string, number>; views: SavedView[]; onViewsChange: () => void; onNew: () => void; onAsk: () => void; onHelp: () => void; activeSaved: string | null; activeView: InboxViewId }

// Docked views column (≥1600 only, REQ-636).
export function InboxViewsPanel(p: Props) {
  const [, setParams] = useSearchParams()
  const go = (next: Record<string, string>) => setParams(next)
  const row = (v: (typeof INBOX_VIEWS)[number]) => <Row key={v.id} label={v.label} count={p.counts[v.id]} amber={v.id === 'needs_you'} active={!p.activeSaved && p.activeView === v.id} onClick={() => go({ view: v.id })} testId={`view-${v.id}`} />
  const saved = (scope: SavedView['scope']) => {
    const list = p.views.filter((v) => v.scope === scope)
    return list.length ? list.map((v) => <Row key={v.id} label={v.name} count={p.savedCounts[v.id]} active={p.activeSaved === v.id} onClick={() => go({ saved: v.id })} testId={`saved-view-${v.id}`} menu={<SavedViewMenu v={v} onChange={p.onViewsChange} onDeleted={() => p.activeSaved === v.id && go({})} />} />) : <p className="px-2.5 py-1 text-xs text-ink-muted">No {scope} views yet</p>
  }
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-background" aria-label="Inbox views" data-testid="inbox-views-panel">
      <div className="flex items-center gap-1 px-3 pb-2 pt-3">
        <h2 className="flex-1 text-sm font-semibold text-ink">Inbox</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Keyboard shortcuts and help" onClick={p.onHelp} data-testid="views-help"><HelpCircle aria-hidden /></Button>
      </div>
      <div className="px-3"><Button variant="outline" size="sm" className="w-full justify-start bg-white" onClick={p.onNew} data-testid="views-new-ticket"><Plus aria-hidden /> New ticket <kbd className="ml-auto text-[11px] text-ink-muted">⇧N</kbd></Button></div>
      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5" data-testid="views-default">{INBOX_VIEWS.filter((v) => v.group === 'views').map(row)}</div>
        <Group title="Saved views" testId="views-saved">
          <p className="px-2.5 pt-1 text-[11px] font-medium text-ink-subtle">Shared</p>
          <div data-testid="views-shared">{saved('shared')}</div>
          <p className="px-2.5 pt-2 text-[11px] font-medium text-ink-subtle">Private</p>
          <div data-testid="views-private">{saved('private')}</div>
        </Group>
        <Group title="More" testId="views-more" defaultOpen={['closed', 'spam', 'trash'].includes(p.activeView) && !p.activeSaved}>{INBOX_VIEWS.filter((v) => v.group !== 'views').map(row)}</Group>
      </nav>
      <div className="border-t border-border p-3">
        <button type="button" onClick={p.onAsk} className={cn('flex min-h-9 w-full items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-white px-3 text-sm font-medium text-ink hover:bg-surface-muted', focusRing)} data-testid="ask-ai-pill">
          <Sparkles className="h-4 w-4 text-ink-muted" aria-hidden /> Ask Goorin AI <kbd className="ml-auto text-[11px] text-ink-muted">{AI_HINT}</kbd>
        </button>
      </div>
    </aside>
  )
}
