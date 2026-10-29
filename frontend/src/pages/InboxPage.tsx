import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronDown, MessagesSquare, Plus, Search } from 'lucide-react'
import { NewTicketDialog } from '@/components/inbox/NewTicketDialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import type { BulkPatch, User } from '@/types'
import { directoryApi, inboxApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/components/auth/AuthContext'
import { useShellData } from '@/components/shell/ShellData'
import { EmptyState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { SaveViewDialog } from '@/components/inbox/InboxViewsPanel'
import { AskGoorinAI } from '@/components/inbox/AskGoorinAI'
import { viewsApi } from '@/api'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useIsPhone } from '@/hooks/useIsPhone'
import { TicketFilters, activeFilterCount, matchFilters, type Filters } from '@/components/inbox/TicketFilters'
import { TicketList } from '@/components/inbox/TicketList'
import { ConversationPane, type ConversationHandle } from '@/components/inbox/ConversationPane'
import { ShortcutHelp } from '@/components/inbox/ShortcutHelp'
import { sortNeeds, viewById, viewCounts, type NeedsSort } from '@/lib/inboxViews'
import type { Ticket } from '@/types'
import { cn } from '@/lib/utils'

const EXTRA_TAGS = ['vip', 'follow-up', 'priority-shipping']
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
  const variant = saved ? 'default' : view.id === 'needs_you' ? 'needs' : view.id === 'ai_handling' ? 'ai' : 'default'
  const list = filteredAll
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const setAside = view.group === 'set_aside'
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
  const tabs = [['needs_you', 'Needs you', counts?.needs_you], ['ai_handling', 'AI handling', counts?.ai_handling], ['resolved', 'Done', undefined]] as const
  const moreViews = [['mine', 'Assigned to me'], ['all', 'All tickets'], ['closed', 'Closed'], ['spam', 'Spam'], ['trash', 'Trash']] as const
  const go = (q: string) => navigate({ pathname: '/inbox', search: q })
  const header = (
    <div className="shrink-0 bg-white" data-testid="inbox-list-header">
      <div className="flex h-14 items-center gap-1 px-4">
        <h1 className="flex-1 text-[17px] font-semibold tracking-[-0.01em] text-ink" data-testid="page-title">Inbox</h1>
        <span className="sr-only" data-testid="page-view-label">{viewLabel}</span>
        <Button variant="ghost" size="icon-sm" aria-label="Search tickets" onClick={() => document.querySelector<HTMLElement>('[data-testid="ticket-search"], [data-testid="filters-trigger"]')?.focus()} data-testid="inbox-search"><Search aria-hidden /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setCreating(true)} aria-label="New ticket" data-testid="new-ticket-button"><Plus aria-hidden /></Button>
      </div>
      <div role="tablist" aria-label="Inbox views" className="flex items-center gap-3 whitespace-nowrap border-b border-border px-4 xl:gap-3.5" data-testid="inbox-tabs">
        {tabs.map(([id, l, n]) => {
          const on = !saved && view.id === id
          return (
            <button key={id} type="button" role="tab" aria-selected={on} onClick={() => go(`?view=${id}`)} className={cn('relative -mb-px flex h-10 items-center gap-1.5 border-b-2 text-[13px] font-medium transition-colors', on ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink')} data-testid={`inbox-tab-${id}`}>
              {l}{n !== undefined && n > 0 && <span className="text-xs font-normal text-ink-muted tabular-nums" data-testid={`inbox-tab-count-${id}`}>{n}</span>}
            </button>
          )
        })}
        <DropdownMenu>
          <DropdownMenuTrigger className={cn('ml-auto flex h-10 items-center gap-1 text-[13px] font-medium', !tabs.some(([id]) => id === view.id) || saved ? 'text-ink' : 'text-ink-muted hover:text-ink')} data-testid="inbox-views-menu">
            <span className={cn(!saved && tabs.some(([id]) => id === view.id) && 'md:max-xl:sr-only [[data-testid=inbox-page]:has([data-testid=customer-panel])_&]:max-[1599px]:sr-only')}>{saved ? saved.name : tabs.some(([id]) => id === view.id) ? 'Views' : view.label}</span><ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {moreViews.map(([id, l]) => <DropdownMenuItem key={id} onSelect={() => go(`?view=${id}`)} data-testid={`views-menu-${id}`}>{l}<span className="ml-auto pl-3 text-xs text-ink-muted tabular-nums">{counts?.[id] ?? ''}</span></DropdownMenuItem>)}
            {(savedViews ?? []).length > 0 && <><DropdownMenuSeparator /><DropdownMenuLabel>Saved views</DropdownMenuLabel></>}
            {(savedViews ?? []).map((v) => <DropdownMenuItem key={v.id} onSelect={() => go(`?saved=${v.id}`)} data-testid={`views-menu-saved-${v.id}`}>{v.name}<span className="ml-auto pl-3 text-xs text-ink-muted tabular-nums">{savedCounts[v.id] ?? ''}</span></DropdownMenuItem>)}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setAsking(true)} data-testid="views-menu-ask">Ask Goorin AI<span className="ml-auto pl-3 text-xs text-ink-muted">⌘G</span></DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setHelp(true)} data-testid="views-menu-shortcuts">Keyboard shortcuts<span className="ml-auto pl-3 text-xs text-ink-muted">?</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
  const SORT_LABEL: Record<NeedsSort, string> = { urgency: 'Most urgent', longest: 'Waiting longest', newest: 'Newest' }

  return (
    <div className="flex h-full min-h-0" data-testid="inbox-page">
      <section aria-label="Ticket list" data-testid="ticket-list-section" className={cn('min-h-0 w-full flex-col border-r border-border bg-white md:flex md:w-[300px] md:shrink-0 lg:w-[300px] xl:w-[340px] xl:max-[1599px]:has-[~div_[data-testid=customer-panel]]:w-[300px]', ticketId ? 'hidden' : 'flex')}>
        {header}
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
              {isPhone && <Button variant="ghost" size="sm" aria-pressed={selectMode} onClick={() => { setSelectMode((m) => !m); setSelected([]) }} data-testid="select-mode-toggle">{selectMode ? 'Done' : 'Select'}</Button>}
              {variant === 'needs' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-8 items-center gap-1 rounded-md px-1.5 text-xs text-ink-muted hover:text-ink" aria-label="Sort tickets" data-testid="needs-sort">Sort: <span className="font-medium text-ink">{SORT_LABEL[sort]}</span><ChevronDown className="h-3 w-3" aria-hidden /></DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Sort</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as NeedsSort)}>
                      <DropdownMenuRadioItem value="urgency" data-testid="needs-sort-urgency">Most urgent</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="longest" data-testid="needs-sort-longest">Waiting longest</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="newest" data-testid="needs-sort-newest">Newest</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : <span className="px-1.5 text-xs text-ink-muted" data-testid="list-shown">{loading ? '' : plural(filteredAll.length)}</span>}
              <div className="ml-auto flex shrink-0 items-center gap-1">
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
