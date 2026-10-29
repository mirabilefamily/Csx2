import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ArrowUpDown, Search } from 'lucide-react'
import { NewTicketDialog } from '@/components/inbox/NewTicketDialog'
import { SelectionBar, type BarMode } from '@/components/inbox/SelectionBar'
import { FolderColumn, FolderStrip } from '@/components/inbox/FolderColumn'
import { byGroup, folderById, folderCounts, folderEmpty, isUnread, type FolderId } from '@/lib/inboxFolders'
import type { BulkPatch, Priority, User } from '@/types'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
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
const PRIORITY_LABEL: Record<Priority, string> = { urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low' }
type Confirm = 'delete' | 'forever' | 'merge'
const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`

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
      if (selected.length && (e.key === '#' || e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); setConfirm(mode === 'trash' ? 'forever' : 'delete'); return }
      if (selected.length && e.key === 'e' && (mode === 'normal' || mode === 'done')) { e.preventDefault(); primaryAction(); return }
      if (selected.length && e.key === 'u' && (mode === 'normal' || mode === 'done')) { e.preventDefault(); toggleRead(); return }
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

  const mode: BarMode = saved ? 'normal' : folder.id === 'trash' ? 'trash' : folder.id === 'spam' ? 'spam' : folder.id === 'done' ? 'done' : 'normal'
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const sel = list.filter((t) => selected.includes(t.id))
  const n = sel.length
  // Every bulk action snapshots the selection so its toast can Undo (REQ: bulk toasts).
  const bulk = async (patch: BulkPatch, message: string, clear = false) => {
    if (!user || !n) return
    const prev = sel.map((t) => ({ ...t, tags: [...t.tags] }))
    try {
      upsert(await inboxApi.bulkUpdate(prev.map((t) => t.id), patch, user))
      if (clear) setSelected([])
      toast.success(message, { duration: 8000, action: { label: 'Undo', onClick: () => void inboxApi.restoreTickets(prev).then((r) => { upsert(r); toast.success(`Restored ${plural(r.length)}`) }) } })
    } catch {
      toast.error("Couldn't update tickets. Try again.")
    }
  }
  const primaryAction = () => {
    if (mode === 'trash') return bulk({ setAside: null }, `Restored ${plural(n)}`, true)
    if (mode === 'spam') return bulk({ setAside: null }, `${plural(n)} marked as not spam`, true)
    if (mode === 'done') return bulk({ status: 'open' }, `Reopened ${plural(n)}`, true)
    return bulk({ status: 'resolved' }, `Resolved ${plural(n)}`, true)
  }
  const anyUnread = sel.some(isUnread)
  const toggleRead = () => bulk({ unread: !anyUnread }, `Marked ${plural(n)} as ${anyUnread ? 'read' : 'unread'}`)
  const canMerge = n > 1 && sel.every((t) => t.customer.id === sel[0].customer.id)
  const oldest = [...sel].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
  const exportCsv = () => {
    const rows = [['Ticket', 'Subject', 'Customer', 'Email', 'Status', 'Priority', 'Tags', 'Updated'], ...sel.map((t) => [t.id, t.subject, t.customer.name, t.customer.email, t.status, t.priority, t.tags.join(' '), t.updatedAt])]
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `goorin-tickets-${n}.csv` })
    a.click(); URL.revokeObjectURL(url)
    toast.success(`Exported ${plural(n)} as CSV`)
  }
  const confirmed = async () => {
    const c = confirm
    setConfirm(null)
    if (c === 'delete') return bulk({ setAside: 'trash' }, `${plural(n)} moved to Trash`, true)
    if (c === 'merge') { setSelected([]); toast.success(`Merged ${plural(n)} into ${oldest.id}`); return }
    try { await inboxApi.deleteForeverMany(sel.map((t) => t.id)); setSelected([]); reload(); toast.success(`Deleted ${plural(n)} forever`) } catch { toast.error("Couldn't delete tickets. Try again.") }
  }
  const CONFIRM: Record<Confirm, [string, string, string]> = {
    delete: [`Delete ${plural(n)}?`, "They'll move to Trash for 30 days.", 'Delete'],
    forever: [`Delete ${plural(n)} forever?`, "This can't be undone.", 'Delete forever'],
    merge: [`Merge ${plural(n)}?`, `They'll be combined into ${oldest?.id ?? ''} for ${sel[0]?.customer.name ?? ''}.`, 'Merge'],
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
    <SelectionBar
      mode={mode} count={n} total={list.length} folderLabel={viewLabel} lead={selectAll} compact={!!ticketId || vw < 1280}
      users={users} meId={user?.id} tags={tags} anyUnread={anyUnread} canMerge={canMerge}
      tagState={(tag) => { const k = sel.filter((t) => t.tags.includes(tag)).length; return k === 0 ? false : k === n ? true : 'indeterminate' }}
      onSelectAll={() => setSelected(list.map((t) => t.id))}
      onClear={() => setSelected([])}
      onAssign={(id) => bulk({ assignee: id }, id ? `Assigned ${plural(n)} to ${id === user?.id ? 'you' : users.find((u) => u.id === id)?.name.split(' ')[0] ?? 'agent'}` : `Unassigned ${plural(n)}`)}
      onTag={(tag, on) => bulk(on ? { addTag: tag } : { removeTag: tag }, on ? `Tagged ${plural(n)} "${tag}"` : `Removed "${tag}" from ${plural(n)}`)}
      onRead={toggleRead}
      onPrimary={primaryAction}
      onPriority={(p) => bulk({ priority: p }, `Set ${plural(n)} to ${PRIORITY_LABEL[p]} priority`)}
      onMerge={() => setConfirm('merge')}
      onExport={exportCsv}
      onSpam={() => bulk({ setAside: 'spam' }, `${plural(n)} moved to Spam`, true)}
      onDelete={() => setConfirm(mode === 'trash' ? 'forever' : 'delete')}
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
          onAssign={(u: User) => bulk({ assignee: u.id }, `Assigned ${plural(n)} to ${u.name.split(' ')[0]}`)}
          onTag={(tag) => bulk({ addTag: tag }, `Tagged ${plural(n)} "${tag}"`)}
          onBulkClose={() => bulk({ status: 'closed' }, `Closed ${plural(n)}`, true)}
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
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        {confirm && (
          <AlertDialogContent data-testid={`bulk-confirm-${confirm}`}>
            <AlertDialogTitle className="text-base font-semibold text-ink" data-testid="bulk-confirm-title">{CONFIRM[confirm][0]}</AlertDialogTitle>
            <AlertDialogDescription className="mt-1 text-sm text-ink-muted">{CONFIRM[confirm][1]}</AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="bulk-confirm-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction className={confirm === 'merge' ? undefined : 'bg-red-700 hover:bg-red-700/90'} onClick={() => void confirmed()} data-testid="bulk-confirm-ok">{CONFIRM[confirm][2]}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
      <AskGoorinAI open={asking} onOpenChange={setAsking} ticketId={ticketId ?? null} onInsert={(text) => conv.current?.insertReply?.(text)} />
      <SaveViewDialog open={savingView} onOpenChange={setSavingView} filters={{ status: filters.status, tag: filters.tag, channel: filters.channel }} onSaved={(v) => { setSavingView(false); reloadViews(); setFilters({}); navigate({ pathname: '/inbox', search: `?saved=${v.id}` }) }} />
      <NewTicketDialog open={creating} onOpenChange={setCreating} onCreated={(t) => { setCreating(false); upsert([t]); navigate({ pathname: `/inbox/${t.id}`, search: '' }) }} />
    </div>
  )
}
