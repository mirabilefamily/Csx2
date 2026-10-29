import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Link2, MessageCircleReply, MoreHorizontal, RotateCcw, SearchX, Sparkles, Tag, UserPlus, UserRound, X } from 'lucide-react'
import { WhyBrief } from './WhyBrief'
import { SummaryPanel } from './SummaryPanel'
import { AskGoorinAI } from './AskGoorinAI'
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
const CUST_KEY = 'goorin.inbox.customerPanel'

// One centred 760px column shared by header, thread and draft dock so their edges line up.
const COL = 'mx-auto box-content max-w-[760px] px-6 xl:px-8 max-sm:px-4'

// Consecutive system events collapse into one quiet line (REQ-1039).
const mergeEvents = (list: Message[]) => list.reduce<Message[]>((acc, m) => {
  const prev = acc[acc.length - 1]
  if (m.authorType === 'system' && prev?.authorType === 'system') acc[acc.length - 1] = { ...prev, body: `${prev.body} · ${m.body}` }
  else acc.push(m)
  return acc
}, [])
const GUTTER = '[scrollbar-gutter:stable_both-edges]'

export const ConversationPane = forwardRef<ConversationHandle, Props>(({ ticketId, users, onBack, crumb, onStep, canStep, onAsk }, ref) => {
  const { user } = useAuth()
  const { tickets, upsert } = useShellData()
  const { data, loading, error, reload } = useApi(() => inboxApi.getTicketDetail(ticketId), [ticketId])
  const [detail, setDetail] = useState<TicketDetail | null | undefined>()
  const customerId = detail?.customer?.id
  const loop = useApi(() => (customerId ? loopApi.getCustomerReturns(customerId) : Promise.resolve([])), [customerId])
  const [full, setFull] = useState(() => sessionStorage.getItem(FULL_KEY) === '1')
  // Customer panel is closed by default; the choice is remembered (REQ-1044).
  const [cust, setCust] = useState(() => localStorage.getItem(CUST_KEY) === '1')
  const [custTab, setCustTab] = useState<'customer' | 'ask'>('customer')
  const toggleCust = useCallback((v?: boolean) => setCust((c) => { const n = v ?? !c; localStorage.setItem(CUST_KEY, n ? '1' : '0'); return n }), [])
  const [vw, setVw] = useState(() => window.innerWidth)
  useEffect(() => { const f = () => setVw(window.innerWidth); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  const docked = vw >= 1280
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === 'Escape' && cust && !docked) { e.stopPropagation(); toggleCust(false); return }
      if (e.key !== ']' || e.metaKey || e.ctrlKey || el.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return
      e.preventDefault(); toggleCust()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [toggleCust, cust, docked])
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
  const pinned = useRef(true)
  const [replyEl, setReplyEl] = useState<HTMLDivElement | null>(null)
  const [colEl, setColEl] = useState<HTMLDivElement | null>(null)
  const [replyInView, setReplyInView] = useState(true)
  useEffect(() => {
    const n = detail?.messages.length
    if (!thread.current || n === undefined) return
    // Open at the latest message (REQ-972) and follow new messages.
    if (seen.current === null || n > seen.current) { pinned.current = true; thread.current.scrollTop = thread.current.scrollHeight }
    seen.current = n
  }, [detail?.messages.length])
  // Stay pinned to the bottom while the reply area grows (REQ-971).
  useEffect(() => {
    if (!colEl) return
    const r = new ResizeObserver(() => { const t = thread.current; if (t && pinned.current) t.scrollTop = t.scrollHeight })
    r.observe(colEl)
    return () => r.disconnect()
  }, [colEl])
  useEffect(() => {
    if (!replyEl || !thread.current) { setReplyInView(true); return }
    const io = new IntersectionObserver(([e]) => setReplyInView(e.isIntersecting), { root: thread.current, threshold: 0.15 })
    io.observe(replyEl)
    return () => io.disconnect()
  }, [replyEl])
  const onThreadScroll = () => { const t = thread.current; if (t) pinned.current = t.scrollHeight - t.scrollTop - t.clientHeight < 40 }
  const jumpToReply = (mode: ComposerMode = 'reply') => {
    if (replyEl) { pinned.current = true; replyEl.scrollIntoView({ behavior: 'smooth', block: 'end' }) }
    if (composer.current) composer.current.focus(mode)
    else (replyEl?.querySelector<HTMLElement>('[data-testid="draft-approve"]') ?? replyEl?.querySelector<HTMLElement>('button, textarea, [contenteditable="true"]'))?.focus({ preventScroll: true })
  }

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
    focusComposer: (mode) => jumpToReply(mode),
    closeTicket: () => { if (user && detail) void run(() => inboxApi.updateTicket(ticketId, { status: 'closed' }, user), `${ticketId} closed`) },
    insertReply: (text) => { setWriteOwn(true); setTimeout(() => composer.current?.insertText(text), 0) },
    approveDraft: () => { const d = detail?.drafts[0]; if (d) approveRef.current?.(d.id) },
  }), [user, detail, run, ticketId, replyEl]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const compactResolve = vw < 1280 && hw < 610
  const resolve = (
    <Button size="sm" className={cn('h-8 shrink-0', compactResolve && 'w-8 px-0')} aria-label={compactResolve ? (resolved ? 'Reopen' : 'Resolve') : undefined} title={compactResolve ? (resolved ? 'Reopen' : 'Resolve') : undefined} onClick={() => update({ status: resolved ? 'open' : 'resolved' })} variant={resolved ? 'outline' : 'primary'} data-testid="ticket-resolve">
      {resolved ? (compactResolve ? <RotateCcw aria-hidden /> : 'Reopen') : <><CheckCircle2 aria-hidden />{!compactResolve && ' Resolve'}</>}
    </Button>
  )
  const owner = users.find((u) => u.id === ticket.assignee)
  const initials = owner ? owner.name.split(' ').map((p) => p[0]).slice(0, 2).join('') : ''
  const assignee = (
    <Select value={ticket.assignee ?? 'unassigned'} onValueChange={(v) => update({ assignee: v === 'unassigned' ? null : v })}>
      {isPhone ? (
        <SelectTrigger className="h-11 w-full gap-2 text-xs" aria-label="Assignee" data-testid="header-assignee"><SelectValue /></SelectTrigger>
      ) : (
        <SelectTrigger className={cn('h-8 w-8 justify-center rounded-full border p-0 text-[11px] font-semibold [&>svg]:hidden', owner ? 'border-transparent bg-[#EFE7DC] text-ink' : 'border-dashed border-border text-ink-muted')} aria-label={owner ? `Assigned to ${owner.name}` : 'Unassigned — assign'} title={owner ? owner.name : 'Unassigned'} data-testid="header-assignee">
          {owner ? initials : <span className="flex"><UserPlus className="h-3.5 w-3.5" aria-hidden /></span>}
        </SelectTrigger>
      )}
      <SelectContent position="item-aligned">
        <SelectItem value="unassigned" data-testid="header-assignee-unassigned">Unassigned</SelectItem>
        {users.map((u) => <SelectItem key={u.id} value={u.id} data-testid={`header-assignee-${u.id}`}>{u.name}</SelectItem>)}
      </SelectContent>
    </Select>
  )
  const copyLink = () => { void navigator.clipboard?.writeText(`${window.location.origin}/inbox/${ticket.id}`).catch(() => {}); toast.success('Link copied') }
  const moreItems = (
    <>
      <DropdownMenuLabel>Snooze</DropdownMenuLabel>
      {SNOOZE.map(([l, h]) => <DropdownMenuItem key={l} onSelect={() => update({ snoozedUntil: new Date(Date.now() + h * 36e5).toISOString() })} data-testid={`snooze-${h}`}>{l}</DropdownMenuItem>)}
      {ticket.snoozedUntil && <DropdownMenuItem onSelect={() => update({ snoozedUntil: null })} data-testid="snooze-clear">Unsnooze</DropdownMenuItem>}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => { toggleCust(true); setCustTab('customer') }} data-testid="ticket-tags"><Tag className="mr-2 h-4 w-4" aria-hidden />Tags…</DropdownMenuItem>
      <DropdownMenuSeparator />
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
      {onStep && <DropdownMenuItem disabled={!canStep?.prev} onSelect={() => onStep(-1)} data-testid="ticket-prev"><ChevronLeft className="mr-2 h-4 w-4" aria-hidden />Previous ticket<span className="ml-auto pl-3 text-xs text-ink-muted">K</span></DropdownMenuItem>}
      {onStep && <DropdownMenuItem disabled={!canStep?.next} onSelect={() => onStep(1)} data-testid="ticket-next"><ChevronRight className="mr-2 h-4 w-4" aria-hidden />Next ticket<span className="ml-auto pl-3 text-xs text-ink-muted">J</span></DropdownMenuItem>}
      <DropdownMenuItem onSelect={copyLink} data-testid="ticket-copy-link"><Link2 className="mr-2 h-4 w-4" aria-hidden />Copy link</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => { toggleCust(true); setCustTab('ask') }} data-testid="ticket-ask-ai"><Sparkles className="mr-2 h-4 w-4" aria-hidden />Ask Goorin AI</DropdownMenuItem>
      <DropdownMenuSeparator />
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
  const msgs = mergeEvents(detail.messages)
  const hidden = !showAll && msgs.length > 5 ? msgs.slice(0, msgs.length - 4).filter((m: Message) => m.authorType !== 'customer' || m !== msgs[0]).length : 0
  const visible = hidden ? [msgs[0], ...msgs.slice(msgs.length - 4)] : msgs
  const onSend = (html: string, isInternal: boolean, draftId?: string) => (user ? run(() => inboxApi.sendMessage(ticketId, { html, isInternal, draftId }, user), isInternal ? 'Note added' : 'Reply sent') : Promise.resolve(false))
  const toggleFull = () => setFull((f) => { sessionStorage.setItem(FULL_KEY, f ? '0' : '1'); return !f })

  const inline = !isPhone
  const replyArea = aiBusy ? (
    <div className={cn('flex flex-wrap items-center gap-3 bg-white px-4 py-3', inline ? 'rounded-lg border border-border' : 'border-t border-border md:px-6')} data-testid="ai-handling-banner">
      <Sparkles className="h-4 w-4 text-ink-muted" aria-hidden />
      <p className="flex-1 text-[13px] text-ink" data-testid="ai-handling-text">{ticket.status === 'grok_handling' ? 'Grokbot' : 'AI'} is handling this conversation. <span className="text-ink-muted">{AI_STATE_LABEL[ai!]}</span></p>
      <Button size="sm" onClick={takeOver} data-testid="ai-banner-take-over">Take over</Button>
    </div>
  ) : draft && !writeOwn ? (
    <div className={inline ? undefined : cn('shrink-0 overflow-hidden border-t border-border bg-background py-4 max-sm:pb-[calc(12px+env(safe-area-inset-bottom))] max-sm:pt-3', GUTTER)} data-testid="draft-dock"><div className={inline ? undefined : COL}>
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
      inline={inline}
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
  )

  const panelBody = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-3" data-testid="customer-panel-head">
        <div role="tablist" aria-label="Customer panel" className="flex gap-1">
          {([['customer', 'Customer'], ['ask', 'Ask AI']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={custTab === k} onClick={() => setCustTab(k)} className={cn('h-8 rounded-md px-3 text-[13px] font-medium transition-colors', custTab === k ? 'bg-surface-muted text-ink' : 'text-ink-muted hover:text-ink', focusRing)} data-testid={`customer-tab-${k}`}>{l}</button>
          ))}
        </div>
        <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close customer panel" onClick={() => toggleCust(false)} data-testid="customer-panel-close"><X aria-hidden /></Button>
      </div>
      {custTab === 'customer' ? (
        <div className="min-h-0 flex-1 overflow-y-auto" data-testid="customer-panel-body">
          <SummaryPanel d={{ ...detail, ticket }} returns={loop.data} />
          <div id="full-details" className="border-t border-border" data-testid="full-details">
            <DetailsSidebar hideCard d={{ ...detail, ticket }} loop={{ data: loop.data, error: loop.error, reload: loop.reload }} onClose={() => toggleCust(false)} onPatch={(p) => update(p)} allTags={[...new Set((tickets ?? []).flatMap((t) => t.tags))]} onOrdersChanged={async () => { const d = await inboxApi.getTicketDetail(ticketId); if (d) setDetail(d) }} />
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1" data-testid="customer-panel-ask"><AskGoorinAI inline open onOpenChange={() => {}} ticketId={ticketId} onInsert={(t) => { setWriteOwn(true); setTimeout(() => composer.current?.insertText(t), 0) }} /></div>
      )}
    </div>
  )
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 bg-white max-sm:fixed max-sm:inset-x-0 max-sm:top-0 max-sm:z-40 max-sm:pt-[env(safe-area-inset-top)]" style={isPhone ? { height: vvh ?? '100dvh' } : undefined} data-testid="conversation">
      <section aria-label="Conversation" className="flex min-w-0 flex-1 flex-col">
        <header className={cn('shrink-0 overflow-hidden border-b border-border bg-white', GUTTER)} data-testid={isPhone ? 'conversation-phone-header' : 'conversation-header'}>
          <div ref={headRef} className="flex items-center gap-3 px-6 py-3.5 max-sm:h-14 max-sm:gap-2 max-sm:px-2 max-sm:py-0" data-testid="conversation-header-inner">
            <Button variant="ghost" size={isPhone ? 'icon' : 'icon-sm'} className="md:hidden" onClick={onBack} aria-label="Back to inbox" data-testid="conversation-back"><ArrowLeft aria-hidden /></Button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-semibold leading-5 text-ink max-sm:text-sm" title={ticket.subject} data-testid="conversation-subject">{ticket.subject}</h2>
              <p className="mt-0.5 truncate text-[13px] text-ink-muted max-sm:text-xs" data-testid="conversation-meta">
                <span title={ticket.customer.name} data-testid="conversation-customer">{ticket.customer.name}</span>
                <span aria-hidden> · </span><span data-testid="conversation-channel">{ticket.channel === 'email' ? ticket.customer.email : 'Chat'}</span>
                {ticket.orderNumber && <><span aria-hidden> · </span><span data-testid="conversation-order">#{ticket.orderNumber.replace(/^#/, '')}</span></>}
                <span className="sr-only" title={ticket.id} data-testid="conversation-short-id">{shortId(ticket.id)}</span>
                {ticket.snoozedUntil && <><span aria-hidden> · </span><span className="text-amber-800" data-testid="snoozed-until">Snoozed until {new Date(ticket.snoozedUntil).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span></>}
              </p>
              {crumb && <span className="sr-only" data-testid="breadcrumb-view">{crumb}</span>}
            </div>
            <div className="flex shrink-0 items-center gap-1.5" data-testid="conversation-actions">
              {!isPhone && <span data-testid="meta-assignee">{assignee}</span>}
              {!isPhone && resolve}
              <Button variant="ghost" size="icon-sm" className={cn('h-8 w-8', cust && 'bg-surface-muted text-ink')} aria-label="Customer info" aria-pressed={cust} title="Customer info  ]" onClick={() => toggleCust()} data-testid="customer-toggle"><UserRound aria-hidden /></Button>
              {more}
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
        <div className="relative flex min-h-0 flex-1 flex-col" data-testid="thread-wrap">
        <div ref={thread} onScroll={onThreadScroll} className={cn('min-h-0 flex-1 overflow-y-auto bg-white py-8 max-sm:py-4', GUTTER)} data-testid="thread-scroll">
          <div ref={setColEl} className={COL} data-testid="thread-column">
          <WhyBrief key={ticket.status} d={{ ...detail, ticket }} />
          <ol className="-my-2 max-sm:-my-1.5" aria-label="Messages" data-testid="message-thread">
            {visible.map((m, i) => (
              <li key={m.id} className="contents">
                {hidden > 0 && i === 1 && <button type="button" onClick={() => setShowAll(true)} className="mx-auto flex min-h-9 items-center rounded-full border border-border bg-white px-3 text-xs font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11" data-testid="thread-show-earlier">Show {hidden} earlier {hidden === 1 ? "message" : "messages"}</button>}
                <ul className="contents"><MessageItem m={m} channel={ticket.channel} email={ticket.customer.email} reasoning={reasoning} /></ul>
              </li>
            ))}
          </ol>
          {inline && <div ref={setReplyEl} className="mt-6 scroll-mb-6" data-testid="reply-area">{replyArea}</div>}
          </div>
        </div>
        {inline && !replyInView && (
          <button type="button" onClick={() => jumpToReply()} className={cn('absolute bottom-5 left-1/2 z-10 inline-flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-white px-4 text-[13px] font-medium text-ink shadow-popover transition-[background-color,transform] duration-150 animate-in fade-in slide-in-from-bottom-1 hover:-translate-y-0.5 hover:bg-surface-muted', focusRing)} data-testid="jump-to-reply">
            <MessageCircleReply className="h-4 w-4" aria-hidden />Reply
          </button>
        )}
        </div>
        {!inline && replyArea}
      </section>
      {cust && docked && (
        <aside aria-label="Customer info" className={cn('shrink-0 border-l border-border bg-white animate-in fade-in slide-in-from-right-2 duration-200', vw < 1600 ? 'w-[340px]' : 'w-[360px]')} data-testid="customer-panel">{panelBody}</aside>
      )}
      {cust && !docked && (
        <>
          <div className={cn('z-20 bg-ink/20 animate-in fade-in', isPhone ? 'fixed inset-0 z-50' : 'absolute inset-0')} onClick={() => toggleCust(false)} aria-hidden data-testid="customer-sheet-backdrop" />
          <div role="dialog" aria-modal="true" aria-label="Customer info" className={cn('bg-white shadow-popover', isPhone ? 'fixed inset-x-0 bottom-0 z-50 h-[78dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom-4' : 'absolute inset-y-0 right-0 z-30 w-[360px] border-l border-border animate-in slide-in-from-right-4')} data-testid="customer-sheet">
            {isPhone && <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />}
            {panelBody}
          </div>
        </>
      )}
    </div>
  )
})
const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024
ConversationPane.displayName = 'ConversationPane'
