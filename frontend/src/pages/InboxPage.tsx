import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ArrowUpDown, Search } from 'lucide-react'
import { NewTicketDialog } from '@/components/inbox/NewTicketDialog'
import { BulkBar } from '@/components/inbox/BulkBar'
import { FolderColumn, FolderStrip } from '@/components/inbox/FolderColumn'
import { byGroup, folderById, folderCounts, folderEmpty, type FolderId } from '@/lib/inboxFolders'
import type { BulkPatch, User } from '@/types'
import { directoryApi, inboxApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/components/auth/AuthContext'
import { useShellData } from '@/components/shell/ShellData'
import { Button, buttonVariants } from '@/components/ui/button'
import { SaveViewDialog } from '@/components/inbox/InboxViewsPanel'
import { AskGoorinAI } from '@/components/inbox/AskGoorinAI'
import { viewsApi } from '@/api'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useIsPhone } from '@/hooks/useIsPhone'
import { TicketFilters, activeFilterCount, matchFilters, type Filters } from '@/components/inbox/TicketFilters'
import { SelectAll, TicketList } from '@/components/inbox/TicketList'
import { ConversationPane, type ConversationHandle } from '@/components/inbox/ConversationPane'
import { ShortcutHelp } from '@/components/inbox/ShortcutHelp'
import { sortNeeds, type NeedsSort } from '@/lib/inboxViews'
import type { Ticket } from '@/types'
import { cn } from '@/lib/utils'

const EXTRA_TAGS = ['vip', 'follow-up', 'priority-shipping']
const FOLD_KEY = 'goorin.inbox.foldersCollapsed'
const plural = (n: number) => `${n} ticket${n === 1 ? '' : 's'}`

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  return !!el?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="dialog"], [role="menu"], [role="listbox"]')
}

export default function InboxPage() {
  const { ticketId } = useParams()
  const [params] = useSearchParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { tickets, loading, error, reload, upsert } = useShellData()
  const folderParam = params.get('folder')
  const folder = folderById(folderParam ?? params.get('view'))
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [vw, setVw] = useState(() => window.innerWidth)
  useEffect(() => { const f = () => setVw(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  // ≥1680 the list stays beside the ticket (REQ-1065); below, the ticket replaces the list (REQ-1064).
  const wide = vw >= 1680
  const [foldCollapsed, setFoldCollapsed] = useState(() => localStorage.getItem(FOLD_KEY) === '1')
  const setFold = (c: boolean) => { localStorage.setItem(FOLD_KEY, c ? '1' : '0'); setFoldCollapsed(c) }
  const stripOnly = foldCollapsed || vw < 1280
  const [filters, setFilters] = useState<Filters>({})
  const [selected, setSelected] = useState<string[]>([])
  const [help, setHelp] = useState(false)
  const isPhone = useIsPhone()
  const [selectMode, setSelectMode] = useState(false)
  const conv = useRef<ConversationHandle>(null)
  const { data: allUsers } = useApi(() => directoryApi.listUsers(), [])
  const users = useMemo(() => (allUsers ?? []).filter((u) => u.status === 'active'), [allUsers])

  const savedId = params.get('saved')
  const { data: savedViews, reload: reloadViews } = useApi(() => viewsApi.listSavedViews(user!), [user?.id])
  const saved = savedViews?.find((v) => v.id === savedId) ?? null
  const viewLabel = saved?.name ?? folder.label
  const savedCounts = useMemo(() => Object.fromEntries((savedViews ?? []).map((v) => [v.id, (tickets ?? []).filter((t) => viewsApi.matchSavedView(t, v)).length])), [savedViews, tickets])
  const [sort, setSort] = useState<NeedsSort>('urgency')
  const [asking, setAsking] = useState(false)
  const [savingView, setSavingView] = useState(false)
  const filteredAll = useMemo(() => {
    const f = (tickets ?? []).filter((t) => (saved ? viewsApi.matchSavedView(t, saved) : folder.match(t, user?.id)) && matchFilters(t, filters))
    return !saved && folder.id === 'needs-you' ? byGroup(sortNeeds(f, sort)) : f
  }, [tickets, folder, saved, user?.id, filters, sort])
  const takeOver = async (t: Ticket) => {
    if (!user) return
    try { const d = await inboxApi.takeOver(t.id, user); upsert([d.ticket]); toast.success(`You took over ${t.customer.name}'s ticket`); navigate({ pathname: `/inbox/${t.id}`, search: '?folder=needs-you' }) } catch { toast.error("Couldn't take over this ticket. Try again.") }
  }
  const variant = saved ? 'default' : folder.id === 'needs-you' ? 'needs' : folder.id === 'ai' ? 'ai' : 'default'
  const list = filteredAll
  const [creating, setCreating] = useState(false)
  const counts = useMemo(() => (tickets ? folderCounts(tickets, user?.id) : undefined), [tickets, user?.id])
  const tags = useMemo(() => [...new Set([...(tickets ?? []).flatMap((t) => t.tags), ...EXTRA_TAGS])].sort(), [tickets])

  useEffect(() => {
    setSelected([])
  }, [folder.id])
  useEffect(() => {
    if (!loading) setSelected((s) => s.filter((id) => list.some((t) => t.id === id)))
  }, [list, loading])

  const open = (id: string) => navigate({ pathname: `/inbox/${id}`, search })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') { e.preventDefault(); setAsking(true); return }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && !isTyping(e) && (!isPhone || selectMode) && list.length) { e.preventDefault(); setSelected(list.map((t) => t.id)); return }
      if (e.key === 'Escape' && selected.length && !isTyping(e)) { setSelected([]); return }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return
      if (e.key === 'N') { e.preventDefault(); setCreating(true); return }
      const idx = list.findIndex((t) => t.id === ticketId)
      if ((e.key === 'j' || e.key === 'ArrowRight') && list.length) open(list[Math.min(list.length - 1, idx + 1)].id)
      else if ((e.key === 'k' || e.key === 'ArrowLeft') && list.length) open(list[Math.max(0, idx - 1)].id)
      else if (e.key === 'a' && ticketId) conv.current?.approveDraft?.()
      else if (e.key === 'r' && ticketId) conv.current?.focusComposer('reply')
      else if (e.key === 'n' && ticketId) conv.current?.focusComposer('note')
      else if (e.key === 'e' && ticketId) conv.current?.closeTicket()
      else if (e.key === '?') setHelp(true)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const bulk = async (patch: BulkPatch, message: string) => {
    if (!user) return
    try {
      upsert(await inboxApi.bulkUpdate(selected, patch, user))
      toast.success(message)
      if (patch.status) setSelected([])
    } catch {
      toast.error("Couldn't update tickets. Try again.")
    }
  }

  const go = (q: string) => { setFoldersOpen(false); navigate({ pathname: '/inbox', search: q }) }
  const pickFolder = (id: FolderId) => go(`?folder=${id}`)
  const phoneFolders = isPhone && !ticketId && !folderParam && !savedId && !params.get('view')
  const folderProps = { active: saved ? null : folder.id, counts, onSelect: pickFolder, onNew: () => setCreating(true) }
  const viewProps = { views: savedViews ?? [], viewCounts: savedCounts, activeView: saved?.id ?? null, onPickView: (id: string) => go(`?saved=${id}`), onNewView: () => setSavingView(true) }
  const SORT_LABEL: Record<NeedsSort, string> = { urgency: 'Most urgent', longest: 'Waiting longest', newest: 'Newest' }
  const canSelect = !isPhone || selectMode
  const selectAll = canSelect && <SelectAll tickets={list} selected={selected} onSelect={setSelected} className={selected.length || isPhone ? 'opacity-100' : 'opacity-0 group-hover/lh:opacity-100 focus-visible:opacity-100'} />
  const header = selected.length > 0 ? (
    <BulkBar
      count={selected.length} users={users} tags={tags} lead={selectAll}
      onAssign={(u: User) => bulk({ assignee: u.id }, `${plural(selected.length)} assigned to ${u.name}`)}
      onTag={(tag) => bulk({ addTag: tag }, `Tag added to ${plural(selected.length)}`)}
      onResolve={() => bulk({ status: 'resolved' }, `${plural(selected.length)} resolved`)}
      onClose={() => bulk({ status: 'closed' }, `${plural(selected.length)} closed`)}
      onClear={() => setSelected([])}
    />
  ) : (
    <div className="group/lh shrink-0" data-testid="inbox-list-header">
      <div className="flex h-16 items-center gap-0.5 px-5 max-sm:h-14 max-sm:pl-1 max-sm:pr-3">
        {isPhone && <Button variant="ghost" size="icon" onClick={() => go('')} aria-label="Back to folders" data-testid="list-back"><ArrowLeft aria-hidden /></Button>}
        {selectAll && <span className="mr-2 flex w-4 justify-center">{selectAll}</span>}
        <h2 className="flex min-w-0 flex-1 items-baseline gap-2 text-[20px] font-semibold tracking-[-0.015em] text-ink max-sm:text-[17px]" data-testid="list-title">
          <span className="truncate">{viewLabel}</span>
          <span className="text-[15px] font-normal tabular-nums text-ink-muted" data-testid="list-count">{loading ? '' : filteredAll.length}</span>
        </h2>
        {isPhone && <Button variant="ghost" size="sm" aria-pressed={selectMode} onClick={() => { setSelectMode((m) => !m); setSelected([]) }} data-testid="select-mode-toggle">{selectMode ? 'Done' : 'Select'}</Button>}
        <Button variant="ghost" size="icon-sm" className="text-ink-muted hover:text-ink" aria-label="Search tickets" title="Search" onClick={() => document.querySelector<HTMLInputElement>('[data-testid="global-search-input"]')?.focus()} data-testid="inbox-search"><Search aria-hidden /></Button>
        {variant === 'needs' && (
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-ink-muted hover:text-ink')} aria-label={`Sort: ${SORT_LABEL[sort]}`} title={`Sort: ${SORT_LABEL[sort]}`} data-testid="needs-sort"><ArrowUpDown aria-hidden /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort · {SORT_LABEL[sort]}</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as NeedsSort)}>
                <DropdownMenuRadioItem value="urgency" data-testid="needs-sort-urgency">Most urgent</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="longest" data-testid="needs-sort-longest">Waiting longest</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="newest" data-testid="needs-sort-newest">Newest</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <TicketFilters filters={filters} onChange={setFilters} tags={tags} users={users} />
      </div>
    </div>
  )

  return (
    <div className="relative flex h-full min-h-0 bg-[#F6F3EE] max-md:bg-white" data-testid="inbox-page" data-folder={saved ? undefined : folder.id}>
      {phoneFolders && <FolderColumn {...folderProps} {...viewProps} phone />}
      {!isPhone && (
        <>
          {stripOnly ? (
            <FolderStrip {...folderProps} onExpand={() => (vw < 1280 ? setFoldersOpen(true) : setFold(false))} className="hidden md:flex" />
          ) : (
            <>
              <FolderStrip {...folderProps} className="hidden [[data-testid=inbox-page]:has([data-testid=customer-panel])_&]:max-[1599px]:flex" />
              <div className="flex [[data-testid=inbox-page]:has([data-testid=customer-panel])_&]:max-[1599px]:hidden"><FolderColumn {...folderProps} {...viewProps} onCollapse={() => setFold(true)} /></div>
            </>
          )}
          {foldersOpen && (
            <>
              <div className="absolute inset-0 z-20 bg-ink/15 animate-in fade-in" onClick={() => setFoldersOpen(false)} aria-hidden data-testid="folder-overlay-backdrop" />
              <FolderColumn {...folderProps} overlay />
            </>
          )}
        </>
      )}
      <div className={cn('flex min-h-0 min-w-0 flex-1 overflow-hidden bg-white md:my-2 md:mr-2 md:rounded-2xl md:shadow-[0_1px_2px_rgb(0_0_0/.04),0_8px_24px_rgb(0_0_0/.04)]', phoneFolders && 'hidden')} data-testid="inbox-surface">
      <section aria-label="Ticket list" data-testid="ticket-list-section" data-full={!ticketId || undefined} className={cn('min-h-0 flex-col bg-white animate-in fade-in duration-200', isPhone ? (ticketId || phoneFolders ? 'hidden' : 'flex w-full') : ticketId ? (wide ? 'flex w-[360px] shrink-0 border-r border-[#F0ECE6]' : 'hidden') : 'flex min-w-0 flex-1')}>
        {header}
        <TicketList
          title={viewLabel}
          emptyText={saved ? `Nothing in ${saved.name}` : folderEmpty(folder)}
          emptyAction={!saved && folder.id === 'needs-you' && activeFilterCount(filters) === 0 ? <Button size="sm" variant="outline" onClick={() => pickFolder('ai')} data-testid="watch-ai-handling">Watch AI handling</Button> : undefined}
          tickets={list}
          activeId={ticketId}
          loading={loading}
          error={error}
          onRetry={reload}
          filtered={activeFilterCount(filters) > 0}
          onClearFilters={() => setFilters({})}
          selected={selected}
          onSelect={setSelected}
          selectable={!isPhone || selectMode}
          users={users}
          tags={tags}
          onAssign={(u: User) => bulk({ assignee: u.id }, `${plural(selected.length)} assigned to ${u.name}`)}
          onTag={(tag) => bulk({ addTag: tag }, `Tag added to ${plural(selected.length)}`)}
          onBulkClose={() => bulk({ status: 'closed' }, `${plural(selected.length)} closed`)}
          variant={variant}
          full={!isPhone && !ticketId}
          grouped={!saved && folder.id === 'needs-you'}
          onTakeOver={takeOver}
          toolbar={null}
        />
      </section>
      {ticketId && (
        <div className="flex min-h-0 min-w-0 flex-1 animate-in fade-in duration-200" data-testid="ticket-surface">
          <ConversationPane key={ticketId} ref={conv} ticketId={ticketId} users={users} crumb={viewLabel} onAsk={() => setAsking(true)} onStep={(dir) => { const i = list.findIndex((t) => t.id === ticketId); const n = list[i + dir]; if (n) open(n.id) }} canStep={{ prev: list.findIndex((t) => t.id === ticketId) > 0, next: list.findIndex((t) => t.id === ticketId) < list.length - 1 }} onBack={() => navigate({ pathname: '/inbox', search })} />
        </div>
      )}
      </div>
      <ShortcutHelp open={help} onOpenChange={setHelp} />
      <AskGoorinAI open={asking} onOpenChange={setAsking} ticketId={ticketId ?? null} onInsert={(text) => conv.current?.insertReply?.(text)} />
      <SaveViewDialog open={savingView} onOpenChange={setSavingView} filters={{ status: filters.status, tag: filters.tag, channel: filters.channel }} onSaved={(v) => { setSavingView(false); reloadViews(); setFilters({}); navigate({ pathname: '/inbox', search: `?saved=${v.id}` }) }} />
      <NewTicketDialog open={creating} onOpenChange={setCreating} onCreated={(t) => { setCreating(false); upsert([t]); navigate({ pathname: `/inbox/${t.id}`, search: '' }) }} />
    </div>
  )
}
