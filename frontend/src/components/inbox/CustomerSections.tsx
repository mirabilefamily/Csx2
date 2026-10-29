import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowUpDown, ChevronDown, ExternalLink, Filter, Mail, MessageCircle, Plus, X } from 'lucide-react'
import type { LoopReturn, ShopifyOrder, Ticket, TicketDetail, TicketPatch, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { StatusChip, type Tone } from '@/components/StatusChip'
import { ShopifyMark } from '@/components/brand/ShopifyMark'
import { LoopReturnsSection } from './LoopReturns'
import { timeAgo, usd } from '@/lib/format'
import { lifetimeSpend, paidOrders } from '@/lib/customerFacts'
import { cn } from '@/lib/utils'

interface Props {
  d: TicketDetail
  returns?: LoopReturn[]
  loopError?: unknown
  onLoopRetry: () => void
  users: User[]
  allTags: string[]
  onPatch: (p: TicketPatch) => void
}

const REASONS: [RegExp, string][] = [[/damag/, 'Damaged item'], [/order-status|shipping/, 'Order status'], [/sizing/, 'Sizing'], [/return|exchange/, 'Returns & exchanges'], [/wholesale|custom/, 'Wholesale & custom'], [/care/, 'Product care']]
const reasonOf = (t: Ticket) => REASONS.find(([re]) => re.test(t.tags.join(' ')))?.[1] ?? 'General question'
const isOpen = (t: Ticket) => t.status !== 'resolved' && t.status !== 'closed'
const resolutionOf = (t: Ticket) => (isOpen(t) ? 'Unresolved' : t.resolvedBy === 'human' ? 'Answered by team' : 'Answered by AI')
const msgCount = (t: Ticket) => 2 + (Number(t.id.replace(/\D/g, '')) % 6)
const notYet = (what: string) => () => toast(`${what} isn't available in this demo.`)
const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('')

function Section({ id, title, count, action, icon, defaultOpen = true, children }: { id: string; title: string; count?: number; action?: React.ReactNode; icon?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-border/70 px-5 py-4" data-testid={`cp-section-${id}`}>
      <div className="flex min-h-7 items-center gap-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`cp-toggle-${id}`}>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-muted transition-transform', !open && '-rotate-90')} aria-hidden />
          {icon}{title}
          {count !== undefined && <span className="rounded-full bg-surface-muted px-1.5 text-[11px] font-medium leading-5 text-ink-muted">{count}</span>}
        </button>
        {action}
      </div>
      {open && <div className="mt-3 space-y-3 pl-6 animate-in fade-in duration-150">{children}</div>}
    </section>
  )
}

function Field({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 text-[13px]" data-testid={testId}>
      <span className="text-ink-muted">{label}</span>
      <span className="min-w-0 text-ink">{children}</span>
    </div>
  )
}

function FieldSelect({ id, value, options }: { id: string; value: string; options: string[] }) {
  const [v, setV] = useState(value)
  return (
    <Select value={v} onValueChange={setV}>
      <SelectTrigger className="-ml-2 h-8 w-full justify-between gap-1 border-transparent bg-transparent px-2 text-left text-[13px] hover:bg-surface-muted [&>span]:truncate" data-testid={`ticket-field-${id}`}><SelectValue /></SelectTrigger>
      <SelectContent>{[...new Set([value, ...options])].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  )
}

const Chip = ({ children, onRemove, testId }: { children: React.ReactNode; onRemove?: () => void; testId?: string }) => (
  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-muted pl-2.5 pr-1.5 text-xs text-ink" data-testid={testId}>
    {children}
    {onRemove && <button type="button" onClick={onRemove} aria-label={`Remove ${children}`} className="rounded-full p-0.5 text-ink-muted hover:bg-white hover:text-ink"><X className="h-3 w-3" aria-hidden /></button>}
  </span>
)

function TicketDetails({ d, allTags, onPatch }: Pick<Props, 'd' | 'allTags' | 'onPatch'>) {
  const t = d.ticket
  const product = d.customer?.orders.find((o) => o.number === t.orderNumber)?.lineItems[0]?.title ?? '—'
  const add = allTags.filter((x) => !t.tags.includes(x))
  return (
    <Section id="ticket" title="Ticket details">
      <div className="flex flex-wrap items-center gap-1.5" data-testid="ticket-tags">
        {t.tags.map((x) => <Chip key={x} testId={`ticket-tag-${x}`} onRemove={() => onPatch({ tags: t.tags.filter((y) => y !== x) })}>{x}</Chip>)}
        <Popover>
          <PopoverTrigger className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border text-ink-muted hover:text-ink" aria-label="Add tag" data-testid="ticket-tag-add"><Plus className="h-3 w-3" aria-hidden /></PopoverTrigger>
          <PopoverContent align="start" className="max-h-64 w-48 overflow-y-auto p-1">
            {add.map((x) => <button key={x} type="button" onClick={() => onPatch({ tags: [...t.tags, x] })} className="block w-full rounded px-2 py-1.5 text-left text-[13px] hover:bg-surface-muted" data-testid={`ticket-tag-option-${x}`}>{x}</button>)}
          </PopoverContent>
        </Popover>
      </div>
      <Field label="Contact reason"><FieldSelect id="reason" value={reasonOf(t)} options={REASONS.map(([, l]) => l)} /></Field>
      <Field label="Resolution"><FieldSelect id="resolution" value={isOpen(t) ? 'Not yet' : resolutionOf(t)} options={['Not yet', 'Replacement sent', 'Refund issued', 'Answered by team']} /></Field>
      <Field label="Product"><FieldSelect id="product" value={product} options={(d.customer?.orders ?? []).flatMap((o) => o.lineItems.map((l) => l.title))} /></Field>
    </Section>
  )
}

function CustomerInfo({ d }: { d: TicketDetail }) {
  const [note, setNote] = useState(d.customer?.note ?? '')
  const [editing, setEditing] = useState(false)
  return (
    <Section id="customer" title="Customer">
      <Field label="Email"><span className="block truncate" title={d.ticket.customer.email}>{d.ticket.customer.email}</span></Field>
      <Field label="Phone">{d.customer?.phone ?? <span className="text-ink-muted">—</span>}</Field>
      <Field label="Note" testId="customer-note">
        {editing ? (
          <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => { setEditing(false); if (note) toast.success('Note saved') }} rows={2} className="w-full rounded-md border border-border px-2 py-1 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring" data-testid="customer-note-input" />
        ) : note ? (
          <button type="button" onClick={() => setEditing(true)} className="text-left hover:underline">{note}</button>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-ink-muted hover:text-ink" data-testid="customer-note-add"><Plus className="h-3.5 w-3.5" aria-hidden />Add</button>
        )}
      </Field>
    </Section>
  )
}

// Past-ticket card (REQ-1073).
function TicketCard({ t, current, users }: { t: Ticket; current?: boolean; users: User[] }) {
  const owner = users.find((u) => u.id === t.assignee)
  const Icon = t.channel === 'chat' ? MessageCircle : Mail
  const extra = Math.max(0, t.tags.length - 1)
  return (
    <div className={cn('rounded-xl border bg-white p-3.5 transition-shadow hover:shadow-xs', current ? 'border-transparent ring-2 ring-brass-400/70' : 'border-border/70')} data-testid={`past-ticket-${t.id}`} data-current={current || undefined}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink" title={t.subject}>{t.subject}</p>
        <span className="shrink-0 text-xs text-ink-muted">{timeAgo(t.updatedAt)}</span>
      </div>
      <p className="mt-1 pl-6 text-xs text-ink-muted">{reasonOf(t)} · {resolutionOf(t)}{extra > 0 && <span className="ml-1 rounded bg-surface-muted px-1">+{extra} more</span>}</p>
      <div className="mt-2.5 flex items-center gap-2 pl-6">
        <StatusChip label={isOpen(t) ? 'Open' : 'Closed'} tone={isOpen(t) ? 'pending' : 'neutral'} />
        <span className="ml-auto flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
          {owner ? <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EFE7DC] text-[9px] font-semibold text-ink">{initials(owner.name)}</span> : <span className="h-5 w-5 shrink-0 rounded-full border border-dashed border-border" />}
          <span className="truncate">{owner?.name ?? 'Unassigned'}</span>
          <span className="shrink-0 whitespace-nowrap">· {msgCount(t)} messages</span>
        </span>
      </div>
    </div>
  )
}

// "<Customer> Timeline" sheet (REQ-1074).
function Timeline({ d, users, open, onOpenChange }: { d: TicketDetail; users: User[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [asc, setAsc] = useState(false)
  const all = [d.ticket, ...d.pastTickets.filter((t) => t.id !== d.ticket.id)].sort((a, b) => (asc ? 1 : -1) * a.updatedAt.localeCompare(b.updatedAt))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[440px] max-w-full flex-col gap-0 p-0" data-testid="timeline-sheet">
        <div className="flex items-center gap-1 border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="flex-1 text-[15px] font-semibold text-ink">{d.ticket.customer.name} Timeline</SheetTitle>
          <Button variant="ghost" size="icon-sm" aria-label={asc ? 'Newest first' : 'Oldest first'} onClick={() => setAsc(!asc)} data-testid="timeline-sort"><ArrowUpDown aria-hidden /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Filter timeline" onClick={notYet('Timeline filters')} data-testid="timeline-filter"><Filter aria-hidden /></Button>
        </div>
        <div className="px-5 pt-4"><Chip testId="timeline-chip-tickets" onRemove={notYet('Other timeline events')}>Tickets</Chip></div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4" data-testid="timeline-list">
          {all.map((t) => <TicketCard key={t.id} t={t} current={t.id === d.ticket.id} users={users} />)}
        </div>
      </SheetContent>
    </Sheet>
  )
}

const FIN: Record<ShopifyOrder['financialStatus'], [string, Tone]> = { paid: ['Paid', 'success'], pending: ['Payment pending', 'attention'], partially_refunded: ['Partly refunded', 'neutral'], refunded: ['Refunded', 'neutral'] }
const FUL: Record<ShopifyOrder['fulfillmentStatus'], [string, Tone]> = { fulfilled: ['Fulfilled', 'success'], delivered: ['Fulfilled', 'success'], in_transit: ['In transit', 'pending'], unfulfilled: ['Unfulfilled', 'attention'] }

function OrderCard({ o }: { o: ShopifyOrder }) {
  return (
    <div className="rounded-xl border border-border/70 bg-white p-3.5" data-testid={`cp-order-${o.number}`}>
      <div className="flex items-baseline justify-between gap-2">
        <a href={o.adminUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink hover:underline">{o.number}<ExternalLink className="h-3 w-3 text-ink-muted" aria-hidden /></a>
        <span className="text-[13px] font-semibold tabular-nums text-ink">{usd(o.total)}</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">{new Date(o.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} · {o.lineItems.length} {o.lineItems.length === 1 ? 'item' : 'items'}</p>
      <div className="mt-2 flex gap-1.5"><StatusChip label={FIN[o.financialStatus][0]} tone={FIN[o.financialStatus][1]} /><StatusChip label={FUL[o.fulfillmentStatus][0]} tone={FUL[o.fulfillmentStatus][1]} /></div>
      <div className="mt-3 flex gap-2">{o.lineItems.slice(0, 4).map((l) => <img key={l.sku} src={l.image} alt={l.title} title={`${l.title} · ${l.variant}`} className="h-11 w-11 rounded-lg object-cover ring-1 ring-border" loading="lazy" />)}</div>
      <div className="mt-3 flex gap-1.5">
        {['Edit', 'Duplicate', 'Refund'].map((a) => <Button key={a} size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={notYet(`${a} order`)} data-testid={`cp-order-${a.toLowerCase()}-${o.number}`}>{a}</Button>)}
      </div>
    </div>
  )
}

// Customer panel sections (REQ-1072).
export function CustomerSections({ d, returns, loopError, onLoopRetry, users, allTags, onPatch }: Props) {
  const [timeline, setTimeline] = useState(false)
  const c = d.customer
  const orders = paidOrders(c?.orders)
  const spend = lifetimeSpend(c?.orders)
  const past = d.pastTickets.filter((t) => t.id !== d.ticket.id)
  return (
    <div data-testid="customer-sections">
      <TicketDetails d={d} allTags={allTags} onPatch={onPatch} />
      <CustomerInfo d={d} />
      <Section id="past" title="Past tickets" count={past.length}>
        {past.length === 0 ? <p className="text-[13px] text-ink-muted">No other tickets</p> : past.slice(0, 2).map((t) => <TicketCard key={t.id} t={t} users={users} />)}
        <button type="button" onClick={() => setTimeline(true)} className="text-[13px] font-medium text-ink-muted hover:text-ink hover:underline" data-testid="past-show-all">Show all</button>
      </Section>
      {c?.shopifyCustomerId && (
        <Section id="shopify" title="Shopify" icon={<ShopifyMark size={14} decorative />}>
          <Field label="Customer">{c.adminUrl ? <a href={c.adminUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline" data-testid="shopify-customer-link">{c.name}<ExternalLink className="h-3 w-3 text-ink-muted" aria-hidden /></a> : c.name}</Field>
          <Field label="Created">{new Date(c.customerSince).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Field>
          <Field label="Tags">
            <span className="flex flex-wrap items-center gap-1.5">{c.tags.map((x) => <Chip key={x}>{x}</Chip>)}<button type="button" onClick={notYet('Shopify tags')} className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink" data-testid="shopify-add-tags"><Plus className="h-3 w-3" aria-hidden />Add tags</button></span>
          </Field>
        </Section>
      )}
      <Section id="purchases" title="Purchase summary">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div><dt className="text-xs text-ink-muted">Orders</dt><dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink" data-testid="purchase-orders">{orders.length}</dd></div>
          <div><dt className="text-xs text-ink-muted">Total spent</dt><dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink" data-testid="purchase-amount">{usd(spend)}</dd></div>
        </dl>
      </Section>
      <Section id="orders" title="Orders" count={c?.orders.length ?? 0} action={<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={notYet('Create order')} data-testid="cp-create-order"><Plus aria-hidden />Create order</Button>}>
        {(c?.orders ?? []).length === 0 ? <p className="text-[13px] text-ink-muted">No orders yet</p> : c!.orders.map((o) => <OrderCard key={o.id} o={o} />)}
      </Section>
      <Section id="loop" title="Loop returns">
        <LoopReturnsSection bare returns={returns} lifetimeSpend={spend} error={loopError} onRetry={onLoopRetry} />
      </Section>
      <Timeline d={d} users={users} open={timeline} onOpenChange={setTimeline} />
    </div>
  )
}
