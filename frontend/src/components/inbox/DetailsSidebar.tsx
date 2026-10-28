import { useState, type FormEvent } from 'react'
import { MoreHorizontal, Pencil, RefreshCw, Search, Star } from 'lucide-react'
import type { CsatResponse, LoopReturn, ShopifyOrder, TicketDetail, TicketPatch } from '@/types'
import { customerToolsApi, viewsApi } from '@/api'
import type { InventoryResult } from '@/api/customerTools'
import { useApi } from '@/hooks/useApi'
import { AuthorBadge } from '@/components/AuthorBadge'
import { ShopifyMark } from '@/components/brand/ShopifyMark'
import { Button, buttonVariants, focusRing } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { lifetimeSpend, loopStats } from '@/lib/customerFacts'
import { timeAgo, usd as money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { OrderCard, newestFirst } from './CustomerPanel'
import { Identity, KV, Section, StatsGrid } from './DetailParts'
import { LoopReturnsSection } from './LoopReturns'
import { OrderActionDialog, OrderButtons } from './OrderActions'
import { PastTickets, TicketTags } from './PanelParts'

function Feedback({ data, loading }: { data?: CsatResponse[] | null; loading: boolean }) {
  if (loading) return <Skeleton className="h-12 w-full" />
  if (!data?.length) return <p className="text-[13px] text-ink-muted" data-testid="customer-feedback-empty">No feedback from this customer yet.</p>
  return (
    <ul className="divide-y divide-border rounded-lg border border-border" data-testid="customer-feedback-list">
      {data.map((r) => (
        <li key={r.id} className="px-3 py-2.5 text-[13px]" data-testid={`customer-feedback-${r.id}`}>
          <div className="flex items-center gap-1.5"><span className="inline-flex items-center gap-1 font-semibold text-ink"><Star className="h-4 w-4 fill-brass-500 text-brass-500" aria-hidden />{r.score}/5</span><span className="text-ink-muted">· {r.ticketId} · {timeAgo(r.createdAt)}</span></div>
          {r.comment && <p className="mt-1 text-ink">“{r.comment}”</p>}
        </li>
      ))}
    </ul>
  )
}

type Tool = 'find' | 'inventory' | 'details' | null

function OrderTool({ tool, orders }: { tool: Exclude<Tool, null>; orders: ShopifyOrder[] }) {
  const [q, setQ] = useState(tool === 'inventory' ? orders[0]?.lineItems[0]?.sku ?? '' : tool === 'details' ? orders[0]?.number ?? '' : '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<React.ReactNode>(null)
  const run = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (tool === 'find') {
        const r = await customerToolsApi.findOrder(q)
        setResult(r ? <div data-testid="order-find-result"><p className="font-medium text-ink">{r.order.number} · {r.customerName}</p><p className="text-ink-muted">{r.email} · {money(r.order.total)} · {r.order.status.replace('_', ' ')}</p></div> : <p className="text-ink-muted" data-testid="order-find-empty">No order matches "{q}".</p>)
      } else if (tool === 'inventory') {
        const r: InventoryResult = await customerToolsApi.checkInventory(q)
        setResult(
          <div data-testid="inventory-result">
            <p className="font-medium text-ink">{r.title} · {r.sku}</p>
            <table className="mt-1.5 w-full text-left"><thead><tr className="text-ink-muted"><th className="font-medium">Size</th><th className="font-medium">In stock</th><th className="font-medium">Incoming</th></tr></thead>
              <tbody>{r.rows.map((x) => <tr key={x.size} data-testid={`inventory-${x.size}`}><td>{x.size}</td><td className={x.available === 0 ? 'font-semibold text-red-700' : 'text-ink'}>{x.available}</td><td className="text-ink-muted">{x.incoming || '—'}</td></tr>)}</tbody></table>
          </div>,
        )
      } else {
        const o = await customerToolsApi.lookupOrderDetails(q)
        setResult(<div data-testid="order-details-result"><p className="font-medium text-ink">{o.number} · {o.financialStatus.replace('_', ' ')} · {o.fulfillmentStatus.replace('_', ' ')}</p><p className="text-ink-muted">{o.lineItems.length} items · {o.shippingAddress.city}, {o.shippingAddress.country} · {o.carrier ?? 'No carrier yet'}</p></div>)
      }
    } catch (err) { setResult(<p className="text-red-700" role="alert">{(err as Error).message}</p>) }
    setBusy(false)
  }
  return (
    <form onSubmit={run} className="space-y-2 rounded-lg border border-border p-3 text-xs" data-testid="order-tool-panel">
      <div className="flex gap-1.5">
        <Input autoFocus aria-label={tool === 'find' ? 'Order number or email' : tool === 'inventory' ? 'SKU' : 'Order number'} placeholder={tool === 'find' ? '#GB20398 or email' : tool === 'inventory' ? 'SKU' : '#GB20398'} className="h-8 text-[13px]" value={q} onChange={(e) => setQ(e.target.value)} data-testid="order-tool-input" />
        <Button type="submit" size="sm" loading={busy} aria-label="Run lookup" data-testid="order-tool-run"><Search aria-hidden /></Button>
      </div>
      {result}
    </form>
  )
}

function NoteBlock({ note }: { note: string | null }) {
  const [text, setText] = useState(note ?? '')
  const [editing, setEditing] = useState(false)
  if (editing) return <form onSubmit={(e) => { e.preventDefault(); setEditing(false) }} className="space-y-2"><Input autoFocus aria-label="Customer note" className="h-8 text-[13px]" value={text} onChange={(e) => setText(e.target.value)} data-testid="customer-note-input" /><Button size="sm" type="submit" data-testid="customer-note-save">Save note</Button></form>
  if (!text) return <button type="button" onClick={() => setEditing(true)} className={cn('-ml-2 inline-flex h-8 items-center rounded-md px-2 text-[13px] font-medium text-ink-muted hover:bg-tobacco-50 hover:text-ink', focusRing)} data-testid="customer-note-add">+ Add note</button>
  return <div className="flex items-start gap-2"><p className="flex-1 pt-1 text-[13px] text-ink" data-testid="customer-note-text">{text}</p><button type="button" onClick={() => setEditing(true)} aria-label="Edit note" title="Edit note" className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-tobacco-50 hover:text-ink max-sm:h-11 max-sm:w-11', focusRing)} data-testid="customer-note-edit"><Pencil className="h-4 w-4" aria-hidden /></button></div>
}

const OUTCOME = { answered: 'Answered', escalated: 'Escalated', in_progress: 'In progress' } as const
const REASON = { answered: 'Replied to the customer', escalated: 'Handed to the next tier', in_progress: 'Still working on a reply' } as const
// Plain-language reason with percentages, never raw 0.65 scores.
function plainReason(a: TicketDetail['attempts'][number]) {
  const next = a.tier === 'claude' ? 'Grokbot' : 'your team'
  if (/below [\d.]+ threshold/i.test(a.reason ?? '')) return `Below the ${viewsApi.aiThreshold()}% threshold, handed to ${next}`
  if (a.outcome === 'escalated') return a.reason ? `${a.reason}, handed to ${next}` : `Handed to ${next}`
  return (a.reason ?? REASON[a.outcome]).replace(/\b0\.(\d{2})\b/g, (_, d) => `${Number(d)}%`)
}

export function DetailsSidebar({ d, loop, onPatch, onOrdersChanged, allTags = [] }: { d: TicketDetail; onClose?: () => void; onCollapse?: () => void; loop?: { data?: LoopReturn[]; error?: unknown; reload: () => void; loading?: boolean }; onPatch?: (p: TicketPatch) => void; onOrdersChanged?: () => void; allTags?: string[]; onAsk?: () => void }) {
  const c = d.customer
  const orders = newestFirst(c?.orders ?? [])
  const [ordersKey, setOrdersKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [tool, setTool] = useState<Tool>(null)
  const [action, setAction] = useState<{ kind: 'edit' | 'duplicate' | 'refund' | 'create'; o?: ShopifyOrder } | null>(null)
  const openFraud = d.fraudAlert?.status === 'open' ? d.fraudAlert : null
  const refresh = () => { setRefreshing(true); setTimeout(() => { setOrdersKey((k) => k + 1); setRefreshing(false) }, 600) }
  const spend = lifetimeSpend(c?.orders)
  const ls = loop?.data && loopStats(loop.data, spend)
  const pickTool = (t: Exclude<Tool, null>) => setTool(tool === t ? null : t)
  const ordersMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-ink-muted')} aria-label="Order tools" data-testid="shopify-orders-menu"><MoreHorizontal aria-hidden /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setAction({ kind: 'create' })} data-testid="shopify-create-order">Create order</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => pickTool('find')} data-testid="order-tool-find">Find another order</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => pickTool('inventory')} data-testid="order-tool-inventory">Check inventory by SKU</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => pickTool('details')} data-testid="order-tool-details">Lookup order details</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={refresh} data-testid="shopify-orders-refresh"><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden /> Refresh from Shopify</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
  const vip = c?.tags.some((t) => t.toLowerCase() === 'vip')
  const csat = useApi(() => (c?.id ? customerToolsApi.getCustomerCsat(c.id) : Promise.resolve([] as CsatResponse[])), [c?.id])
  return (
    <div className="pb-16" data-testid="details-sidebar">
      <p className="sr-only" data-testid="customer-panel-title">Full details</p>
      <div className="space-y-4 border-b border-border px-5 py-5" data-testid="customer-card">
        <Identity name={d.ticket.customer.name} email={d.ticket.customer.email} c={c} fraud={openFraud} />
        {c?.shopifyCustomerId && <StatsGrid orders={orders} />}
      </div>
      <Section title="Orders" count={orders.length} icon={<ShopifyMark size={14} decorative />} action={ordersMenu} testId="shopify-orders">
        {tool && <OrderTool key={tool} tool={tool} orders={orders} />}
        {refreshing ? <p className="text-[13px] text-ink-muted" role="status" data-testid="shopify-orders-loading">Refreshing orders from Shopify…</p> : orders.length === 0 ? (
          <p className="text-[13px] text-ink-muted" data-testid="no-shopify-orders">No orders yet</p>
        ) : (
          <div key={ordersKey} className="space-y-3">{orders.map((o, i) => <OrderCard key={o.id} o={o} defaultOpen={i === 0} actions={<OrderButtons o={o} onAction={(kind) => setAction({ kind, o })} />} />)}</div>
        )}
      </Section>
      {loop && (
        <Section title="Returns" icon={<img src="/images/brand/loop-wordmark.svg" alt="Loop" height={14} style={{ height: 14, width: 'auto' }} className="shrink-0" data-testid="loop-wordmark" />} count={ls ? ls.count : undefined} testId="loop-returns">
          <LoopReturnsSection bare returns={loop.data} lifetimeSpend={spend} error={loop.error} onRetry={loop.reload} />
        </Section>
      )}
      {onPatch && <Section title="Ticket" testId="ticket-details-section"><TicketTags d={d} onPatch={onPatch} allTags={allTags} /></Section>}
      <Section title="Contact" testId="customer-contact">
        <KV testId="customer-rows" rows={[
          ['Phone', c?.phone ? <a href={`tel:${c.phone}`} className={cn('truncate rounded hover:underline', focusRing)}>{c.phone}</a> : <span className="text-ink-subtle">Not set</span>, 'customer-phone'],
          ['Location', c?.location ?? <span className="text-ink-subtle">Unknown</span>, 'customer-location'],
          ['Customer since', c ? new Date(c.customerSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—', 'customer-since'],
          ['Language', 'English', 'customer-language'],
          ['VIP', vip ? 'Yes' : 'No', 'customer-vip'],
        ]} />
      </Section>
      <Section title="Note" testId="customer-note"><NoteBlock note={c?.note ?? null} /></Section>
      <Section title="Past tickets" count={d.pastTickets.length} testId="past-tickets" defaultOpen={false}><PastTickets d={d} /></Section>
      <Section title="Feedback" count={csat.data?.length ?? 0} testId="customer-feedback" defaultOpen={false}><Feedback data={csat.data} loading={csat.loading} /></Section>
      <Section title="AI activity" count={d.attempts.length} testId="ai-attempt-log" defaultOpen={false}>
        {d.attempts.length === 0 ? <p className="text-[13px] text-ink-muted" data-testid="ai-attempts-empty">No AI activity on this ticket</p> : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {d.attempts.map((a) => (
              <li key={a.id} className="px-3 py-2.5" title={`Replied in ${(a.latencyMs / 1000).toFixed(1)} s`} data-testid={`ai-attempt-${a.id}`}>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px]"><AuthorBadge type={a.tier} /><span className="text-ink">{Math.round(a.confidence * 100)}% confidence · {OUTCOME[a.outcome]}</span></div>
                <p className="mt-1 text-xs text-ink-muted">{plainReason(a)} · {timeAgo(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <OrderActionDialog kind={action?.kind ?? null} o={action?.o} ticketId={d.ticket.id} customerId={c?.id} onClose={() => setAction(null)} onChanged={() => onOrdersChanged?.()} />
    </div>
  )
}
