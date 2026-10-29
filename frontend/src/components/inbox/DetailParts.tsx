import { useState } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { Link } from 'react-router-dom'
import { ChevronDown, Copy, ExternalLink, MoreHorizontal, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { Customer, FraudAlert, ShopifyOrder } from '@/types'
import { RISK_LABEL } from '@/components/dashboard/FraudBits'
import { ShopifyMark } from '@/components/brand/ShopifyMark'
import { buttonVariants, focusRing } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/overlay'
import { timeAgo, usd } from '@/lib/format'
import { cn } from '@/lib/utils'

export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
const copyText = (t: string, what: string) => { void navigator.clipboard?.writeText(t).catch(() => {}); toast(`${what} copied`) }
const QUIET = 'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[13px] font-medium text-ink-muted hover:bg-tobacco-50 hover:text-ink max-sm:h-11'

export function CountBadge({ n, testId, tone }: { n: number; testId?: string; tone?: 'amber' | 'active' }) {
  return <span className={cn('inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums', tone === 'amber' && n > 0 ? 'bg-amber-50 font-semibold text-[#92400E]' : n === 0 ? 'bg-tobacco-50/60 text-ink-subtle' : tone === 'active' ? 'bg-white text-ink' : 'bg-tobacco-50 text-ink-muted')} data-testid={testId}>{n}</span>
}

// One accordion pattern for every details section; open state kept for the session.
export function Section({ title, count, icon, action, testId, defaultOpen = true, children }: { title: string; count?: number; icon?: React.ReactNode; action?: React.ReactNode; testId: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const key = `goorin.details.${testId}`
  const [open, set] = useState(() => { const v = sessionStorage.getItem(key); return v === null ? defaultOpen : v === '1' })
  const setOpen = (v: boolean) => { set(v); sessionStorage.setItem(key, v ? '1' : '0') }
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} asChild>
      <section className="border-b border-border" data-testid={testId}>
        <div className="flex h-10 min-w-0 items-center gap-1 px-5 max-sm:h-12">
          <Collapsible.Trigger className={cn('flex h-full min-w-0 flex-1 items-center gap-2 rounded-md text-left text-[13px] font-semibold text-ink', focusRing)} data-testid={`${testId}-toggle`}>
            {icon}<span className="shrink-0">{title}</span>{count !== undefined && <CountBadge n={count} testId={`${testId}-count`} />}
          </Collapsible.Trigger>
          {action}
          <Collapsible.Trigger className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-tobacco-50', focusRing)} aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`} tabIndex={-1}>
            <ChevronDown className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden />
          </Collapsible.Trigger>
        </div>
        <Collapsible.Content className="space-y-4 px-5 pb-5">{children}</Collapsible.Content>
      </section>
    </Collapsible.Root>
  )
}

// Shared label/value grid: 104px label column, 28px rows, 8px apart.
export const LABEL_COL = 'grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]'
export function KV({ rows, testId }: { rows: [string, React.ReactNode, string?][]; testId?: string }) {
  return (
    <dl className={LABEL_COL} data-testid={testId}>
      {rows.map(([k, v, id]) => (
        <div key={k} className="contents" data-testid={id}>
          <dt className="flex min-h-7 items-center text-ink-muted">{k}</dt>
          <dd className="flex min-h-7 min-w-0 items-center text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TagChips({ tags, max = 3, testId }: { tags: string[]; max?: number; testId: string }) {
  if (!tags.length) return null
  return (
    <ul className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden" aria-label="Customer tags" data-testid={testId}>
      {tags.slice(0, max).map((t) => <li key={t} className="shrink-0 rounded bg-tobacco-50 px-1.5 py-0.5 text-[11px] font-medium text-tobacco-800">{t}</li>)}
      {tags.length > max && <li className="shrink-0 text-[11px] text-ink-muted" title={tags.slice(max).join(', ')}>+{tags.length - max}</li>}
    </ul>
  )
}

export function Identity({ name, email, c, fraud, compact = false }: { name: string; email: string; c: Customer | null; fraud: FraudAlert | null; compact?: boolean }) {
  return (
    <div className="space-y-3" data-testid="customer-identity">
      <div className="flex items-center gap-3">
        <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-tobacco-50 font-semibold text-tobacco-700', compact ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm')} aria-hidden>{initials(name)}</span>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate font-semibold leading-tight text-ink', compact ? 'text-[14px]' : 'text-[15px]')} data-testid="customer-name">{name}</p>
          <span className="group mt-0.5 flex min-w-0 items-center gap-1">
            <Tooltip><TooltipTrigger asChild><span tabIndex={0} className={cn('truncate rounded text-[13px] text-ink-muted', focusRing)} data-testid="customer-email">{email}</span></TooltipTrigger><TooltipContent data-testid="customer-email-tooltip">Matched by the ticket email</TooltipContent></Tooltip>
            <button type="button" onClick={() => copyText(email, 'Email')} aria-label="Copy email" className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted opacity-0 hover:bg-tobacco-50 group-hover:opacity-100 focus-visible:opacity-100 max-sm:h-11 max-sm:w-11 max-sm:opacity-100', focusRing)} data-testid="customer-email-copy"><Copy className="h-3.5 w-3.5" aria-hidden /></button>
          </span>
        </div>
      </div>
      {fraud && (
        <Link to="/dashboard#fraud" className={cn('inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 max-sm:min-h-11', focusRing)} data-testid="customer-fraud-chip"><ShieldAlert className="h-3.5 w-3.5" aria-hidden />Fraud risk {RISK_LABEL[fraud.level]}</Link>
      )}
      {!c?.shopifyCustomerId ? <p className="text-[13px] text-ink-muted" data-testid="customer-guest">Guest: no Shopify customer record</p> : <TagChips tags={c.tags} testId="customer-tags" />}
      {!compact && (
        <div className="-ml-2 flex items-center gap-1" data-testid="customer-quick-actions">
          {c?.adminUrl && <a href={c.adminUrl} target="_blank" rel="noopener noreferrer" className={cn(QUIET, focusRing)} data-testid="customer-view-shopify"><ShopifyMark size={14} decorative />View in Shopify<ExternalLink className="h-3 w-3" aria-hidden /><span className="sr-only">(opens in a new tab)</span></a>}
          <button type="button" onClick={() => copyText(email, 'Email')} aria-label="Copy email" title="Copy email" className={cn(QUIET, 'w-8 justify-center px-0 max-sm:w-11', focusRing)} data-testid="customer-copy-email"><Copy className="h-4 w-4" aria-hidden /></button>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-ink-muted')} aria-label="More customer actions" data-testid="customer-more"><MoreHorizontal aria-hidden /></DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => copyText(name, 'Name')} data-testid="customer-copy-name">Copy name</DropdownMenuItem>
              {c?.phone && <DropdownMenuItem onSelect={() => copyText(c.phone!, 'Phone')} data-testid="customer-copy-phone">Copy phone</DropdownMenuItem>}
              {c?.shopifyCustomerId && <DropdownMenuItem onSelect={() => copyText(c.shopifyCustomerId!, 'Customer ID')} data-testid="customer-copy-id">Copy Shopify customer ID</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

// 2×2 stats inside one hairline container, no filled tiles.
export function StatsGrid({ orders }: { orders: ShopifyOrder[] }) {
  const spend = orders.reduce((s, o) => s + o.total, 0)
  const last = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const items: [string, string, string][] = [
    ['Orders', String(orders.length), 'customer-order-count'],
    ['Lifetime spend', usd(spend), 'customer-lifetime-spend'],
    ['Avg order', orders.length ? usd(spend / orders.length) : '—', 'customer-aov'],
    ['Last order', last ? timeAgo(last.createdAt) : '—', 'customer-last-order'],
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3" data-testid="customer-stats">
      {items.map(([label, value, testId]) => (
        <div key={testId} className="min-w-0">
          <dt className="text-xs text-ink-muted">{label}</dt>
          <dd className="mt-0.5 truncate text-[15px] font-semibold tabular-nums text-ink" data-testid={testId}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
