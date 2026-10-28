import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, MoreHorizontal, PanelRight, RotateCcw, SearchX, Sparkles, UserPlus, X } from 'lucide-react'
import { WhyBrief } from './WhyBrief'
import { SummaryPanel, SummaryRail } from './SummaryPanel'
import { TEAMS } from '@/api/inbox'
import type { Message, TeamId } from '@/types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AI_STATE_LABEL, aiState, shortId } from '@/lib/inboxViews'
import { AiRepliedBanner, SlaChip } from './TicketBanners'
import { useIsPhone, useVisualViewportHeight } from '@/hooks/useIsPhone'
import type { Priority, TicketDetail, User } from '@/types'
import { inboxApi, loopApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/components/auth/AuthContext'
import { useShellData } from '@/components/shell/ShellData'
import { StatusPill } from '@/components/StatusPill'
import { EmptyState, ErrorState } from '@/components/States'
import { Skeleton } from '@/components/ui/skeleton'
import { Button, buttonVariants, focusRing } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { MessageItem } from './MessageItem'
import { DraftCard } from './DraftCard'
import { Composer, type ComposerHandle, type ComposerMode } from './Composer'
import { DetailsSidebar } from './DetailsSidebar'
import { FraudBanner } from './FraudBanner'

export interface ConversationHandle {
  focusComposer: (mode: ComposerMode) => void
  closeTicket: () => void
  insertReply?: (text: string) => void
  approveDraft?: () => void
}

interface Props {
  ticketId: string
  users: User[]
  onBack: () => void
  crumb?: string
  onStep?: (dir: 1 | -1) => void
  canStep?: { prev: boolean; next: boolean }
  onAsk?: () => void
}

const SNOOZE: [string, number][] = [['Later today', 4], ['Tomorrow', 24], ['Next week', 168]]
const PRIORITIES: [Priority, string][] = [['low', 'Low'], ['normal', 'Normal'], ['high', 'High'], ['urgent', 'Urgent']]
const FULL_KEY = 'goorin.inbox.fullDetails'
const COLLAPSE_KEY = 'goorin.inbox.panelCollapsed'

// One centred column shared by header, thread and draft dock so their edges line up.
const COL = 'mx-auto box-content max-w-[clamp(720px,88%,1280px)] px-6 xl:px-8 min-[1600px]:px-12 max-sm:px-4'
const GUTTER = '[scrollbar-gutter:stable_both-edges]'

export const ConversationPane = forwardRef<ConversationHandle, Props>(({ ticketId, users, onBack, crumb, onStep, canStep, onAsk }, ref) => {
  const { user } = useAuth()
  const { tickets, upsert } = useShellData()
  const { data, loading, error, reload } = useApi(() => inboxApi.getTicketDetail(ticketId), [ticketId])
  const [detail, setDetail] = useState<TicketDetail | null | undefined>()
  const customerId = detail?.customer?.id
  const loop = useApi(() => (customerId ? loopApi.getCustomerReturns(customerId) : Promise.resolve([])), [customerId])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [full, setFull] = useState(() => sessionStorage.getItem(FULL_KEY) === '1')
  const [panelCollapsed, setPanelCollapsed] = useState(() => (sessionStorage.getItem(COLLAPSE_KEY) ?? (window.innerWidth < 1600 ? '1' : '0')) === '1')
  const togglePanelSaved = useCallback(() => setPanelCollapsed((c) => { sessionStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); return !c }), [])
  const [vw, setVw] = useState(() => window.innerWidth)
  useEffect(() => { const f = () => setVw(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  const mid = vw >= 1024 && vw < 1600
  const [drawer, setDrawer] = useState(false)
  useEffect(() => { if (!mid) setDrawer(false) }, [mid])
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setDrawer(false) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [drawer])
  // 1024–1599: rail by default; expanding opens an overlay drawer, so the expanded sidebar never squeezes the thread or header. ≥1600: docked + saved choice.
  const togglePanel = useCallback(() => (mid ? setDrawer((d) => !d) : togglePanelSaved()), [mid, togglePanelSaved])
  const collapsed = mid || panelCollapsed
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key !== ']' || e.metaKey || e.ctrlKey || el.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || window.innerWidth < 1024) return
      e.preventDefault(); togglePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePanel])
  const [, setEditingDraft] = useState<string | null>(null)
  const [writeOwn, setWriteOwn] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const approveRef = useRef<((id: string) => void) | undefined>(undefined)
  const [busyDraft, setBusyDraft] = useState<string | null>(null)
  const composer = useRef<ComposerHandle>(null)
  const thread = useRef<HTMLDivElement>(null)
  // Header content width drives which meta controls fit (priority: name > status > assignee > SLA > channel > Assign me).
  const [hw, setHw] = useState(9999)
  const ro = useRef<ResizeObserver | null>(null)
  const headRef = useCallback((el: HTMLDivElement | null) => { ro.current?.disconnect(); if (el) { ro.current = new ResizeObserver(([e]) => setHw(Math.round(e.contentRect.width))); ro.current.observe(el) } }, [])
  const isPhone = useIsPhone()
  const vvh = useVisualViewportHeight(isPhone)

  useEffect(() => {
    setDetail(data)
  }, [data])
  const seen = useRef<number | null>(null)
  useEffect(() => {
    const n = detail?.messages.length
    if (!thread.current || n === undefined) return
    // Open at the brief/top; only follow new messages after the first render.
    if (seen.current !== null && n > seen.current) thread.current.scrollTop = thread.current.scrollHeight
    else if (seen.current === null) thread.current.scrollTop = 0
    seen.current = n
  }, [detail?.messages.length])

  const run = useCallback(async (fn: () => Promise<TicketDetail>, success?: string) => {
    try {
      const d = await fn()
      setDetail(d)
      upsert([d.ticket])
      if (success) toast.success(success)
      return true
    } catch {
      toast.error("Couldn't update ticket. Try again.")
      return false
    }
  }, [upsert])

  useImperativeHandle(ref, () => ({
    focusComposer: (mode) => composer.current?.focus(mode),
    closeTicket: () => { if (user && detail) void run(() => inboxApi.updateTicket(ticketId, { status: 'closed' }, user), `${ticketId} closed`) },
    insertReply: (text) => { setWriteOwn(true); setTimeout(() => composer.current?.insertText(text), 0) },
    approveDraft: () => { const d = detail?.drafts[0]; if (d) approveRef.current?.(d.id) },
  }), [user, detail, run, ticketId])

  if (loading) return <div className="flex-1 space-y-4 p-6" data-testid="conversation-loading"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/3" />{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
  if (error) return <div className="flex-1"><ErrorState title="This conversation didn't load" onRetry={reload} testId="conversation-error" /></div>
  if (!detail)
    return (
      <div className="flex-1" data-testid="ticket-not-found">
        <EmptyState title="Ticket not found" description={`We couldn't find ${ticketId}.`} icon={<SearchX className="h-6 w-6" aria-hidden />} action={<Link to="/inbox" className={buttonVariants({ variant: 'outline' })} data-testid="back-to-inbox">Back to inbox</Link>} />
      </div>
    )

  const ticket = tickets?.find((t) => t.id === ticketId) ?? detail.ticket
  const order = detail.customer?.orders.find((o) => o.number === ticket.orderNumber) ?? detail.customer?.orders[0]
  const vars: Record<string, string> = {
    'customer.first_name': ticket.customer.name.split(' ')[0],
    'customer.name': ticket.customer.name,
    'order.number': order?.number ?? 'your order',
    'order.carrier': order?.carrier ?? 'our carrier',
    'order.tracking_url': order?.trackingUrl ?? '(tracking link to follow)',
    'agent.first_name': user?.name.split(' ')[0] ?? 'The Goorin team',
  }
  const reasoning = [...new Set(detail.attempts.flatMap((a) => a.guidanceIds ?? []).map((g) => detail.guidanceTitles[g]).filter(Boolean))].map((t) => `Used guidance: ${t}`)
  const update = (patch: Parameters<typeof inboxApi.updateTicket>[1]) => user && run(() => inboxApi.updateTicket(ticketId, patch, user))
  const aside = async (where: 'spam' | 'trash' | null) => {
    if (!user) return
    try {
      const t = await inboxApi.setAside(ticketId, where, user)
      upsert([t])
      if (where) {
        toast.success(`Moved to ${where === 'spam' ? 'Spam' : 'Trash'}`, { action: { label: 'Undo', onClick: () => void inboxApi.setAside(ticketId, null, user).then((r) => upsert([r])) } })
        onBack()
      } else {
        setDetail(await inboxApi.getTicketDetail(ticketId))
        toast.success('Ticket restored')
      }
    } catch { toast.error("Couldn't update ticket. Try again.") }
  }
  const approve = async (draftId: string, then?: 'resolve' | 'handback') => {
    if (!user) return
    setBusyDraft(draftId)
    const ok = await run(() => inboxApi.approveDraft(ticketId, draftId, user), then ? undefined : 'Reply sent')
    if (ok && then === 'resolve') await run(() => inboxApi.updateTicket(ticketId, { status: 'resolved' }, user), 'Sent and resolved')
    if (ok && then === 'handback') await run(() => inboxApi.handBack(ticketId, user), 'Sent and handed back to AI')
    setBusyDraft(null)
  }
  approveRef.current = (id) => void approve(id)
  const takeOver = async () => {
    if (!user) return
    try { const d = await inboxApi.takeOver(ticketId, user); setDetail(d); upsert([d.ticket]); toast.success('You took over this ticket') } catch { toast.error("Couldn't take over this ticket. Try again.") }
  }
  const ai = aiState(ticket)
  const aiBusy = ai === 'replying' || ai === 'waiting'
  const draft = detail.drafts[0]
  const resolved = ticket.status === 'resolved' || ticket.status === 'closed'
  const resolve = (
    <Button size="sm" className={cn('h-8', hw < 703 && 'w-8 px-0')} aria-label={hw < 703 ? (resolved ? 'Reopen' : 'Resolve') : undefined} title={hw < 703 ? (resolved ? 'Reopen' : 'Resolve') : undefined} onClick={() => update({ status: resolved ? 'open' : 'resolved' })} variant={resolved ? 'outline' : 'primary'} data-testid="ticket-resolve">
      {resolved ? (hw < 703 ? <RotateCcw aria-hidden /> : 'Reopen') : <><CheckCircle2 aria-hidden />{hw >= 610 && ' Resolve'}</>}
    </Button>
  )
  const assignee = (
    <Select value={ticket.assignee ?? 'unassigned'} onValueChange={(v) => update({ assignee: v === 'unassigned' ? null : v })}>
      <SelectTrigger className="h-8 w-auto min-w-[112px] gap-2 border-transparent text-xs max-sm:h-11 max-sm:w-full max-sm:border-border" aria-label="Assignee" data-testid="header-assignee"><SelectValue /></SelectTrigger>
      <SelectContent position="item-aligned">
        <SelectItem value="unassigned" data-testid="header-assignee-unassigned">Unassigned</SelectItem>
        {users.map((u) => <SelectItem key={u.id} value={u.id} data-testid={`header-assignee-${u.id}`}>{u.name}</SelectItem>)}
      </SelectContent>
    </Select>
  )
  const moreItems = (
    <>
      <DropdownMenuLabel>Priority</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={ticket.priority} onValueChange={(v) => update({ priority: v as Priority })}>
        {PRIORITIES.map(([p, l]) => <DropdownMenuRadioItem key={p} value={p} data-testid={`header-priority-${p}`}>{l}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Team</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={ticket.team ?? 'none'} onValueChange={(v) => update({ team: v === 'none' ? null : (v as TeamId) })}>
        <DropdownMenuRadioItem value="none" data-testid="header-team-none">No team</DropdownMenuRadioItem>
        {(Object.entries(TEAMS) as [TeamId, string][]).map(([id, l]) => <DropdownMenuRadioItem key={id} value={id} data-testid={`header-team-${id}`}>{l}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Snooze</DropdownMenuLabel>
      {SNOOZE.map(([l, h]) => <DropdownMenuItem key={l} onSelect={() => update({ snoozedUntil: new Date(Date.now() + h * 36e5).toISOString() })} data-testid={`snooze-${h}`}>{l}</DropdownMenuItem>)}
      {ticket.snoozedUntil && <DropdownMenuItem onSelect={() => update({ snoozedUntil: null })} data-testid="snooze-clear">Unsnooze</DropdownMenuItem>}
      <DropdownMenuSeparator />
      {onAsk && <DropdownMenuItem onSelect={onAsk} data-testid="ticket-ask-ai"><Sparkles className="mr-2 h-4 w-4" aria-hidden />Ask Goorin AI</DropdownMenuItem>}
      <DropdownMenuItem onSelect={() => aside('spam')} data-testid="ticket-move-spam">Move to spam</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => aside('trash')} data-testid="ticket-move-trash">Move to trash</DropdownMenuItem>
      <DropdownMenuItem disabled data-testid="ticket-merge">Merge… <span className="ml-auto pl-3 text-xs text-ink-muted">Coming soon</span></DropdownMenuItem>
    </>
  )
  const more = (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'h-8 w-8')} aria-label="More ticket actions" data-testid={isPhone ? 'ticket-actions-trigger' : 'ticket-more'}><MoreHorizontal className="h-4 w-4" aria-hidden /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto" data-testid={isPhone ? 'ticket-actions-sheet' : undefined}>
        {isPhone && <div className="p-2">{assignee}</div>}
        {isPhone && <DropdownMenuItem onSelect={() => update({ status: resolved ? 'open' : 'resolved' })} data-testid="ticket-resolve-phone">{resolved ? 'Reopen' : 'Resolve'}</DropdownMenuItem>}
        {moreItems}
      </DropdownMenuContent>
    </DropdownMenu>
  )
  const msgs = detail.messages
  const hidden = !showAll && msgs.length > 5 ? msgs.slice(0, msgs.length - 4).filter((m: Message) => m.authorType !== 'customer' || m !== msgs[0]).length : 0
  const visible = hidden ? [msgs[0], ...msgs.slice(msgs.length - 4)] : msgs
  const onSend = (html: string, isInternal: boolean, draftId?: string) => (user ? run(() => inboxApi.sendMessage(ticketId, { html, isInternal, draftId }, user), isInternal ? 'Note added' : 'Reply sent') : Promise.resolve(false))
  const toggleFull = () => setFull((f) => { sessionStorage.setItem(FULL_KEY, f ? '0' : '1'); return !f })

  const panelBody = (
    <>
      <SummaryPanel d={{ ...detail, ticket }} returns={loop.data} full={full} onToggle={toggleFull} onCollapse={isDesktop() ? togglePanel : undefined} onClose={isDesktop() ? undefined : () => setDetailsOpen(false)} />
      {full && (
        <div id="full-details" data-testid="full-details">
          <DetailsSidebar d={{ ...detail, ticket }} loop={{ data: loop.data, error: loop.error, reload: loop.reload }} onClose={() => setDetailsOpen(false)} onPatch={(p) => update(p)} allTags={[...new Set((tickets ?? []).flatMap((t) => t.tags))]} onOrdersChanged={async () => { const d = await inboxApi.getTicketDetail(ticketId); if (d) setDetail(d) }} />
        </div>
      )}
    </>
  )
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 bg-white max-sm:fixed max-sm:inset-x-0 max-sm:top-0 max-sm:z-40 max-sm:pt-[env(safe-area-inset-top)]" style={isPhone ? { height: vvh ?? '100dvh' } : undefined} data-testid="conversation">
      <section aria-label="Conversation" className="flex min-w-0 flex-1 flex-col">
        <header className={cn('shrink-0 overflow-hidden border-b border-border bg-white', GUTTER)} data-testid={isPhone ? 'conversation-phone-header' : 'conversation-header'}>
          <div ref={headRef} className={cn(COL, 'flex items-center gap-3 py-4 max-sm:h-14 max-sm:gap-2 max-sm:px-2 max-sm:py-0')} data-testid="conversation-header-inner">
            <Button variant="ghost" size={isPhone ? 'icon' : 'icon-sm'} className="md:hidden" onClick={onBack} aria-label="Back to inbox" data-testid="conversation-back"><ArrowLeft aria-hidden /></Button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold leading-5 text-ink max-sm:text-sm min-[1600px]:text-[17px] min-[1600px]:leading-6" title={ticket.subject} data-testid="conversation-subject">{ticket.subject}</h2>
              <div className="mt-1.5 flex min-w-0 items-center overflow-hidden whitespace-nowrap text-[13px] text-ink-muted max-sm:mt-0.5 max-sm:text-xs" data-testid="conversation-meta">
                <span className="flex h-7 shrink-0 items-center gap-1.5 max-sm:h-auto max-sm:min-w-0 max-sm:shrink" data-testid="conversation-identity">
                  <span className="min-w-[min(fit-content,160px)] max-w-[160px] shrink-0 truncate font-medium text-ink max-sm:min-w-0 max-sm:shrink" title={ticket.customer.name} data-testid="conversation-customer">{ticket.customer.name}</span>
                  {hw >= 770 && <><span aria-hidden>·</span><span data-testid="conversation-channel">{ticket.channel === 'email' ? 'Email' : 'Chat'}</span></>}
                  <span aria-hidden>·</span><span className="font-medium" title={ticket.id} data-testid="conversation-short-id">{shortId(ticket.id)}</span>
                </span>
                {crumb && <span className="sr-only" data-testid="breadcrumb-view">{crumb}</span>}
                <span aria-hidden className="mx-3 h-4 w-px shrink-0 bg-border max-sm:hidden" data-testid="meta-divider" />
                <span className="flex min-w-0 items-center gap-2 max-sm:ml-1.5" data-testid="conversation-controls">
                  {ticket.snoozedUntil && <span className="inline-flex h-7 shrink-0 items-center rounded-md bg-amber-50 px-2.5 font-medium text-amber-800" data-testid="snoozed-until">Snoozed until {new Date(ticket.snoozedUntil).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>}
                  <span className={cn('flex h-7 shrink-0 items-center max-sm:hidden [&>*]:h-7', hw < 480 && 'hidden')} data-testid="meta-status"><StatusPill status={ticket.status} /></span>
                  {!isPhone && hw >= 560 && <span className={cn('flex h-7 min-w-0 items-center [&_button]:h-7 [&_button]:min-w-0 [&_button]:max-w-full [&_button]:gap-1.5 [&_button]:rounded-md [&_button]:border-border [&_button]:bg-white [&_button]:px-2.5 [&_button]:text-[13px] [&_button]:font-medium [&_button]:text-ink [&_button:hover]:bg-surface-muted [&_button>span]:truncate', hw >= 600 && 'shrink-0')} data-testid="meta-assignee">{assignee}</span>}
                  {!isPhone && !ticket.assignee && hw >= 950 && <button type="button" onClick={() => update({ assignee: user!.id })} className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-[13px] font-medium text-ink hover:bg-surface-muted', focusRing)} data-testid="assign-me"><UserPlus className="h-3.5 w-3.5" aria-hidden />Assign me</button>}
                  {hw >= 640 && <span className="flex h-7 min-w-0 shrink-[3] items-center overflow-hidden max-sm:hidden" data-testid="meta-sla"><SlaChip d={{ ...detail, ticket }} compact={hw < 830} /></span>}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2" data-testid="conversation-actions">
              {aiBusy && !isPhone && <Button size="sm" variant="outline" onClick={takeOver} data-testid="header-take-over">Take over</Button>}
              {!isPhone && resolve}
              <Button variant="ghost" size="sm" className="lg:hidden" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((o) => !o)} data-testid="details-toggle"><PanelRight aria-hidden /><span className="max-sm:sr-only">Details</span></Button>
              {more}
              {onStep && !isPhone && (
                <div className="flex h-8 overflow-hidden rounded-md border border-border bg-white max-lg:hidden" data-testid="ticket-stepper">
                  <Button variant="ghost" size="icon-sm" className="h-[30px] w-8 rounded-none" aria-label="Previous ticket" disabled={!canStep?.prev} onClick={() => onStep(-1)} data-testid="ticket-prev"><ChevronLeft aria-hidden /></Button>
                  <Button variant="ghost" size="icon-sm" className="h-[30px] w-8 rounded-none border-l border-border" aria-label="Next ticket" disabled={!canStep?.next} onClick={() => onStep(1)} data-testid="ticket-next"><ChevronRight aria-hidden /></Button>
                </div>
              )}
            </div>
          </div>
        </header>
        {ticket.setAside && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-muted px-4 py-2.5 text-sm md:px-6" data-testid="set-aside-banner">
            <span>This ticket is in {ticket.setAside === 'spam' ? 'Spam' : 'Trash'}.</span>
            <Button size="sm" variant="outline" onClick={() => aside(null)} data-testid="set-aside-restore">Restore</Button>
          </div>
        )}
        {detail.fraudAlert && <FraudBanner a={detail.fraudAlert} />}
        <AiRepliedBanner d={{ ...detail, ticket }} />
        <div ref={thread} className={cn('min-h-0 flex-1 overflow-y-auto bg-background py-6 max-sm:py-4', GUTTER)} data-testid="thread-scroll">
          <div className={COL} data-testid="thread-column">
          <WhyBrief key={ticket.status} d={{ ...detail, ticket }} />
          <ol className="-my-2 max-sm:-my-1.5" aria-label="Messages" data-testid="message-thread">
            {visible.map((m, i) => (
              <li key={m.id} className="contents">
                {hidden > 0 && i === 1 && <button type="button" onClick={() => setShowAll(true)} className="mx-auto flex min-h-9 items-center rounded-full border border-border bg-white px-3 text-xs font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11" data-testid="thread-show-earlier">Show {hidden} earlier {hidden === 1 ? "message" : "messages"}</button>}
                <ul className="contents"><MessageItem m={m} channel={ticket.channel} email={ticket.customer.email} reasoning={reasoning} /></ul>
              </li>
            ))}
          </ol>
          </div>
        </div>
        {aiBusy ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-white px-4 py-3 md:px-6" data-testid="ai-handling-banner">
            <Sparkles className="h-4 w-4 text-ink-muted" aria-hidden />
            <p className="flex-1 text-[13px] text-ink" data-testid="ai-handling-text">{ticket.status === 'grok_handling' ? 'Grokbot' : 'AI'} is handling this conversation. <span className="text-ink-muted">{AI_STATE_LABEL[ai!]}</span></p>
            <Button size="sm" onClick={takeOver} data-testid="ai-banner-take-over">Take over</Button>
          </div>
        ) : draft && !writeOwn ? (
          <div className={cn('shrink-0 overflow-hidden border-t border-border bg-background py-4 max-sm:pb-[calc(12px+env(safe-area-inset-bottom))] max-sm:pt-3', GUTTER)} data-testid="draft-dock"><div className={COL}>
          <DraftCard
            draft={draft}
            titles={detail.guidanceTitles}
            busy={busyDraft === draft.id}
            onApprove={(then) => approve(draft.id, then)}
            onEdit={() => { setWriteOwn(true); setTimeout(() => composer.current?.loadDraft(draft.body, draft.id), 0) }}
            onDiscard={async () => {
              const ok = await run(() => inboxApi.discardDraft(ticketId, draft.id))
              if (ok) toast('Draft discarded', { action: { label: 'Undo', onClick: () => void run(() => inboxApi.restoreDraft(draft), 'Draft restored') } })
            }}
            onWriteOwn={() => { setWriteOwn(true); setTimeout(() => composer.current?.focus('reply'), 0) }}
          />
          </div></div>
        ) : (
          <Composer
            ref={composer}
            onDraftChange={setEditingDraft}
            to={ticket.customer.email}
            onResolve={() => update({ status: 'resolved' })}
            onHandBack={(html, draftId) => (user ? run(() => inboxApi.handBack(ticketId, user, { html, draftId }), 'Sent and handed back to AI') : Promise.resolve(false))}
            onSend={onSend}
            extra={draft ? (
              <button type="button" onClick={() => setWriteOwn(false)} className="min-h-8 rounded text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11" data-testid="composer-use-draft">Use AI draft</button>
            ) : (
              <Button size="sm" variant="outline" loading={drafting} onClick={async () => { setDrafting(true); const ok = await run(() => inboxApi.generateDraft(ticketId), 'Draft ready'); setDrafting(false); if (ok) setWriteOwn(false) }} data-testid="composer-ask-draft"><Sparkles aria-hidden /> Ask AI to draft</Button>
            )}
          />
        )}
      </section>
      <aside
        aria-label="Ticket details"
        className={cn('min-h-0 overflow-y-auto border-l border-border bg-white lg:static lg:block lg:shrink-0', collapsed ? 'lg:w-11' : 'lg:w-[280px] xl:w-[320px]', detailsOpen ? 'absolute inset-y-0 right-0 z-20 block w-[min(100%,360px)] shadow-popover max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:w-full max-sm:border-l-0 max-sm:pb-[env(safe-area-inset-bottom)] max-sm:pt-[env(safe-area-inset-top)]' : 'hidden')}
        data-testid={detailsOpen && !isDesktop() ? 'ticket-details-sheet' : 'customer-panel'}
      >
        {collapsed && isDesktop() ? <SummaryRail d={{ ...detail, ticket }} returns={loop.data} onExpand={togglePanel} /> : panelBody}
      </aside>
      {mid && drawer && (
        <>
          <div className="absolute inset-0 z-20 bg-ink/20" onClick={() => setDrawer(false)} aria-hidden data-testid="details-drawer-backdrop" />
          <div role="dialog" aria-modal="true" aria-label="Ticket details" className="absolute inset-y-0 right-0 z-30 w-[340px] overflow-y-auto border-l border-border bg-white shadow-popover" data-testid="details-drawer">{panelBody}</div>
        </>
      )}
    </div>
  )
})
const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024
ConversationPane.displayName = 'ConversationPane'
