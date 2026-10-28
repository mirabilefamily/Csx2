import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, MessagesSquare, Plus } from 'lucide-react'
import { NewTicketDialog } from '@/components/inbox/NewTicketDialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { BulkPatch, User } from '@/types'
import { directoryApi, inboxApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/components/auth/AuthContext'
import { useShellData } from '@/components/shell/ShellData'
import { EmptyState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { ViewsChips, ViewsDropdown } from '@/components/inbox/ViewsNav'
import { InboxViewsPanel, SaveViewDialog } from '@/components/inbox/InboxViewsPanel'
import { AskGoorinAI } from '@/components/inbox/AskGoorinAI'
import { viewsApi } from '@/api'
import { ArrowUpDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button'
import { useIsPhone } from '@/hooks/useIsPhone'
import { TicketFilters, activeFilterCount, matchFilters, type Filters } from '@/components/inbox/TicketFilters'
import { TicketList } from '@/components/inbox/TicketList'
import { ConversationPane, type ConversationHandle } from '@/components/inbox/ConversationPane'
import { ShortcutHelp } from '@/components/inbox/ShortcutHelp'
import { sortNeeds, viewById, viewCounts, type NeedsSort } from '@/lib/inboxViews'
import { HANDLED_BY_AI_TODAY } from '@/api/inbox'
import type { Ticket } from '@/types'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/overlay'

const EXTRA_TAGS = ['vip', 'follow-up', 'priority-shipping']
const PAGE = 25
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
  const view = viewById(params.get('view'))
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
  const viewLabel = saved?.name ?? view.label
  const savedCounts = useMemo(() => Object.fromEntries((savedViews ?? []).map((v) => [v.id, (tickets ?? []).filter((t) => viewsApi.matchSavedView(t, v)).length])), [savedViews, tickets])
  const [sort, setSort] = useState<NeedsSort>('urgency')
  const [asking, setAsking] = useState(false)
  const [savingView, setSavingView] = useState(false)
  const filteredAll = useMemo(() => {
    const f = (tickets ?? []).filter((t) => (saved ? viewsApi.matchSavedView(t, saved) : view.match(t, user?.id)) && matchFilters(t, filters))
    return !saved && view.id === 'needs_you' ? sortNeeds(f, sort) : f
  }, [tickets, view, saved, user?.id, filters, sort])
  const takeOver = async (t: Ticket) => {
    if (!user) return
    try { const d = await inboxApi.takeOver(t.id, user); upsert([d.ticket]); toast.success(`You took over ${t.customer.name}'s ticket`); navigate({ pathname: `/inbox/${t.id}`, search: '?view=needs_you' }) } catch { toast.error("Couldn't take over this ticket. Try again.") }
  }
  const inProgress = (tickets ?? []).filter((t) => !t.setAside && (t.status === 'ai_handling' || t.status === 'grok_handling')).length
  const variant = saved ? 'default' : view.id === 'needs_you' ? 'needs' : view.id === 'ai_handling' ? 'ai' : 'default'
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(filteredAll.length / PAGE))
  const list = useMemo(() => filteredAll.slice((page - 1) * PAGE, page * PAGE), [filteredAll, page])
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const setAside = view.group === 'set_aside'
  useEffect(() => setPage(1), [view.id, savedId, filters])
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const counts = useMemo(() => (tickets ? viewCounts(tickets, user?.id) : undefined), [tickets, user?.id])
  const tags = useMemo(() => [...new Set([...(tickets ?? []).flatMap((t) => t.tags), ...EXTRA_TAGS])].sort(), [tickets])

  useEffect(() => {
    setSelected([])
  }, [view.id])
  useEffect(() => {
    if (!loading) setSelected((s) => s.filter((id) => list.some((t) => t.id === id)))
  }, [list, loading])

  const open = (id: string) => navigate({ pathname: `/inbox/${id}`, search })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') { e.preventDefault(); setAsking(true); return }
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

  const restore = async (id: string) => {
    if (!user) return
    try { upsert([await inboxApi.setAside(id, null, user)]); toast.success(`${id} restored`) } catch { toast.error("Couldn't restore. Try again.") }
  }
  const destroy = async () => {
    const id = deleting
    setDeleting(null)
    if (!id) return
    try { await inboxApi.deleteForever(id); reload(); toast.success(`${id} deleted forever`); if (ticketId === id) navigate({ pathname: '/inbox', search }) } catch { toast.error("Couldn't delete. Try again.") }
  }
  const panel = (onClose?: () => void) => (
    <InboxViewsPanel counts={counts!} savedCounts={savedCounts} views={savedViews ?? []} onViewsChange={reloadViews} onNew={() => { onClose?.(); setCreating(true) }} onAsk={() => setAsking(true)} onHelp={() => setHelp(true)} activeSaved={saved?.id ?? null} activeView={view.id} />
  )
  const first = filteredAll.length ? (page - 1) * PAGE + 1 : 0
  const footer = (
    <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs text-ink-muted" data-testid="inbox-pagination">
      <span data-testid="pagination-range">{first}–{Math.min(page * PAGE, filteredAll.length)} of {filteredAll.length}</span>
      <span className="ml-auto" data-testid="pagination-page">Page {page} of {pages}</span>
      <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="pagination-prev"><ChevronLeft aria-hidden /></Button>
      <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)} data-testid="pagination-next"><ChevronRight aria-hidden /></Button>
    </div>
  )

  return (
    <div className="flex h-full min-h-0" data-testid="inbox-page">
      {counts && !isPhone && (
        <div className="hidden min-[1600px]:flex">{panel()}</div>
      )}
      <section aria-label="Ticket list" className={cn('min-h-0 w-full flex-col border-r border-border bg-white md:flex md:w-[300px] md:shrink-0 lg:w-[256px] xl:w-[320px] min-[1600px]:w-[340px]', ticketId ? 'hidden' : 'flex')}>
        <div className="flex h-[72px] shrink-0 items-center gap-2 border-b border-border bg-white px-3 max-sm:h-14">
          <h1 className="sr-only min-[1600px]:not-sr-only min-[1600px]:flex-1 min-[1600px]:truncate min-[1600px]:text-base min-[1600px]:font-semibold min-[1600px]:text-ink" data-testid="page-title">{viewLabel}</h1>
          {isPhone ? <div className="min-w-0 flex-1"><ViewsChips active={view.id} counts={counts} loading={loading} saved={savedViews ?? []} activeSaved={saved?.id ?? null} onViewsChange={reloadViews} /></div> : <div className="min-w-0 flex-1 min-[1600px]:hidden"><ViewsDropdown active={view.id} counts={counts} loading={loading} saved={savedViews ?? []} activeSaved={saved?.id ?? null} /></div>}
          <Button size="sm" variant="outline" className="max-sm:h-11 max-sm:px-3" onClick={() => setCreating(true)} aria-label="New ticket" data-testid="new-ticket-button"><Plus aria-hidden /> <span aria-hidden>New</span></Button>
        </div>
        <TicketList
          title={viewLabel}
          emptyText={view.empty}
          emptyAction={!saved && view.id === 'needs_you' && activeFilterCount(filters) === 0 ? <Button size="sm" variant="outline" onClick={() => navigate({ pathname: '/inbox', search: '?view=ai_handling' })} data-testid="watch-ai-handling">Watch AI handling</Button> : undefined}
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
          footer={footer}
          status={counts && (
            <p className="min-w-0 flex-1 text-xs leading-4 text-ink-muted" data-testid="ai-status-line" title={`${HANDLED_BY_AI_TODAY} handled by AI today · ${counts.needs_you} need you · ${inProgress} in progress`}><span className="font-semibold text-ink">{HANDLED_BY_AI_TODAY}</span> by AI today · <span className="font-semibold text-ink">{counts.needs_you}</span> need you · <span className="font-semibold text-ink">{inProgress}</span> in progress</p>
          )}
          variant={variant}
          onTakeOver={takeOver}
          rowActions={setAside ? (t) => (
            <>
              <Button size="sm" variant="outline" onClick={() => restore(t.id)} data-testid={`restore-${t.id}`}>Restore</Button>
              {view.id === 'trash' && <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => setDeleting(t.id)} data-testid={`delete-forever-${t.id}`}>Delete forever</Button>}
            </>
          ) : undefined}
          toolbar={
            <>
              <span className="sr-only" data-testid="list-count">{loading ? '…' : `${filteredAll.length} shown`}</span>
              {isPhone && <Button variant="ghost" size="sm" className="ml-auto" aria-pressed={selectMode} onClick={() => { setSelectMode((m) => !m); setSelected([]) }} data-testid="select-mode-toggle">{selectMode ? 'Done' : 'Select'}</Button>}
              <div className={cn('flex shrink-0 items-center gap-1', !isPhone && 'ml-auto')}>
                {variant === 'needs' && (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })} aria-label="Sort tickets" data-testid="needs-sort"><ArrowUpDown aria-hidden /></DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Sort</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Sort</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as NeedsSort)}>
                        <DropdownMenuRadioItem value="urgency" data-testid="needs-sort-urgency">Most urgent</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="longest" data-testid="needs-sort-longest">Longest waiting</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="newest" data-testid="needs-sort-newest">Newest</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {activeFilterCount(filters) > 0 && <Button variant="ghost" size="sm" onClick={() => setSavingView(true)} data-testid="save-view-button">Save view</Button>}
                <TicketFilters filters={filters} onChange={setFilters} tags={tags} users={users} />
              </div>
            </>
          }
        />
      </section>
      <div className={cn('min-h-0 min-w-0 flex-1 lg:flex', ticketId ? 'flex' : 'hidden')}>
        {ticketId ? (
          <ConversationPane key={ticketId} ref={conv} ticketId={ticketId} users={users} crumb={viewLabel} onAsk={() => setAsking(true)} onStep={(dir) => { const i = list.findIndex((t) => t.id === ticketId); const n = list[i + dir]; if (n) open(n.id) }} canStep={{ prev: list.findIndex((t) => t.id === ticketId) > 0, next: list.findIndex((t) => t.id === ticketId) < list.length - 1 }} onBack={() => navigate({ pathname: '/inbox', search })} />
        ) : (
          <div className="flex flex-1 items-center justify-center" data-testid="conversation-placeholder">
            <EmptyState title="Select a ticket to view the conversation" description="Press j and k to move through the list, or ? for every shortcut." icon={<MessagesSquare className="h-6 w-6" aria-hidden />} />
          </div>
        )}
      </div>
      <ShortcutHelp open={help} onOpenChange={setHelp} />
      <AskGoorinAI open={asking} onOpenChange={setAsking} ticketId={ticketId ?? null} onInsert={(text) => conv.current?.insertReply?.(text)} />
      <SaveViewDialog open={savingView} onOpenChange={setSavingView} filters={{ status: filters.status, tag: filters.tag, channel: filters.channel }} onSaved={(v) => { setSavingView(false); reloadViews(); setFilters({}); navigate({ pathname: '/inbox', search: `?saved=${v.id}` }) }} />
      <NewTicketDialog open={creating} onOpenChange={setCreating} onCreated={(t) => { setCreating(false); upsert([t]); navigate({ pathname: `/inbox/${t.id}`, search: '' }) }} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent data-testid="delete-forever-dialog">
          <AlertDialogTitle>Delete {deleting} forever?</AlertDialogTitle>
          <AlertDialogDescription>The ticket and its messages are removed. This can't be undone.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-forever-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-700 hover:bg-red-800" onClick={destroy} data-testid="delete-forever-confirm">Delete forever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
