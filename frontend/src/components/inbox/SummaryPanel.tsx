import { PanelRightOpen, RotateCcw, ShieldAlert, ShoppingBag, User } from 'lucide-react'
import type { LoopReturn, TicketDetail } from '@/types'
import { Button } from '@/components/ui/button'
import { usd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { lifetimeSpend, loopStats, paidOrders } from '@/lib/customerFacts'
import { Identity, StatsGrid } from './DetailParts'

const HIGH_RETURN = 30

function Row({ label, children, testId, tone }: { label: string; children: React.ReactNode; testId: string; tone?: 'risk' }) {
  return (
    <div className="contents" data-testid={testId}>
      <dt className="flex min-h-7 items-start pt-1 text-ink-muted">{label}</dt>
      <dd className={cn('min-h-7 min-w-0 pt-1 text-ink', tone === 'risk' && 'font-medium text-red-700')}>{children}</dd>
    </div>
  )
}

function facts(d: TicketDetail, returns?: LoopReturn[]) {
  const orders = paidOrders(d.customer?.orders)
  const spend = lifetimeSpend(d.customer?.orders)
  const s = loopStats(returns ?? [], spend)
  return { orders, spend, latest: [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0], stats: s, high: s.rate !== null && s.rate > HIGH_RETURN, risky: d.fraudAlert?.status === 'open' }
}

// Collapsed rail (REQ-683): expand button and four row indicators.
export function SummaryRail({ d, returns, onExpand }: { d: TicketDetail; returns?: LoopReturn[]; onExpand: () => void }) {
  const f = facts(d, returns)
  const items: [string, React.ComponentType<{ className?: string }>, string, string][] = [
    ['customer', User, `Customer: ${d.ticket.customer.name}`, 'text-ink-muted'],
    ['order', ShoppingBag, f.latest ? `Latest order ${f.latest.number} · ${usd(f.latest.total)}` : 'No orders yet', 'text-ink-muted'],
    ['returns', RotateCcw, f.stats.count ? `Returns: ${f.stats.count} · ${f.stats.rate?.toFixed(1)}%${f.high ? ' (high return rate)' : ''}` : 'No returns with Loop', f.high ? 'text-amber-700' : 'text-ink-muted'],
    ['risk', ShieldAlert, f.risky ? `Risk ${d.fraudAlert!.riskScore}: ${d.fraudAlert!.signals[0]?.label ?? 'fraud signals'}` : 'No risk signals', f.risky ? 'text-red-700' : 'text-ink-muted'],
  ]
  return (
    <div className="flex w-11 flex-col items-center gap-1 py-2" data-testid="summary-rail">
      <Button variant="ghost" size="icon-sm" aria-label="Expand details panel" aria-expanded={false} onClick={onExpand} data-testid="summary-expand"><PanelRightOpen aria-hidden /></Button>
      <span className="my-1 h-px w-6 bg-border" aria-hidden />
      {items.map(([id, Icon, tip, tone]) => (
        <button key={id} type="button" onClick={onExpand} title={tip} aria-label={`${tip}. Expand details panel`} className={cn('flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', tone)} data-testid={`summary-rail-${id}`} data-tone={tone.includes('red') ? 'risk' : tone.includes('amber') ? 'high' : 'plain'}>
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}

// One scrolling customer summary (REQ-1046): identity, stats, latest order, returns, risk, past tickets.
export function SummaryPanel({ d, returns }: { d: TicketDetail; returns?: LoopReturn[] }) {
  const c = d.customer
  const { orders, latest: o, stats, high } = facts(d, returns)
  const alert = d.fraudAlert
  return (
    <div data-testid="summary-panel">
      <div className="space-y-5 px-5 py-5 max-sm:px-4" data-testid="summary-rows">
        <div data-testid="summary-customer">
          <Identity compact name={d.ticket.customer.name} email={d.ticket.customer.email} c={c} fraud={null} />
          <p className="mt-2 text-xs text-ink-muted" data-testid="summary-past-tickets">{countOf(d.pastTickets.length, 'past ticket')}{c?.customerSince ? ` · customer since ${new Date(c.customerSince).getFullYear()}` : ''}</p>
        </div>
        {c?.shopifyCustomerId && <StatsGrid orders={orders} />}
          <dl className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-3 text-[13px]">
            <Row label="Latest order" testId="summary-order">
              {o ? (
                <span className="block">
                  <span className="block font-medium">{o.number} · {usd(o.total)}</span>
                  <span className="mt-1 flex items-center gap-1" aria-hidden>{o.lineItems.slice(0, 3).map((l) => <img key={l.sku} src={l.image} alt="" className="h-7 w-7 rounded object-cover ring-1 ring-border" loading="lazy" />)}</span>
                  <span className="mt-1 block text-xs capitalize text-ink-muted">{o.financialStatus.replace('_', ' ')} · {o.fulfillmentStatus.replace('_', ' ')}{o.trackingNumber ? ` · ${o.carrier} ${o.trackingNumber}` : ''}</span>
                </span>
              ) : <span className="text-ink-muted">No orders yet</span>}
            </Row>
            <Row label="Returns" testId="summary-returns">
              {returns === undefined ? <span className="text-ink-muted">Loading…</span> : stats.count ? <span className={cn(high && 'font-medium text-amber-800')}>Loop {stats.count} · {usd(stats.dollars)} · {stats.rate?.toFixed(1)}%{high && ' · High'}</span> : <span className="text-ink-muted">No returns with Loop</span>}
            </Row>
            <Row label="Risk" testId="summary-risk" tone={alert?.status === 'open' ? 'risk' : undefined}>
              {alert ? <span className="inline-flex flex-col">{alert.status === 'open' ? <span className="inline-flex items-center gap-1"><ShieldAlert className="h-4 w-4" aria-hidden />Score {alert.riskScore}</span> : <span>Score {alert.riskScore} · Reviewed</span>}<span className="text-xs font-normal text-ink-muted">{alert.signals[0]?.label}</span></span> : <span className="text-ink-muted">No risk signals</span>}
            </Row>
          </dl>
        {d.pastTickets.length > 0 && (
          <div data-testid="summary-past-list">
            <p className="text-xs font-medium text-ink-muted">Past tickets</p>
            <ul className="mt-2 space-y-2">
              {d.pastTickets.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-baseline justify-between gap-3 text-[13px]" data-testid={`summary-past-${t.id}`}>
                  <span className="min-w-0 truncate text-ink">{t.subject}</span>
                  <span className="shrink-0 text-xs capitalize text-ink-muted">{t.status.replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

const countOf = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
