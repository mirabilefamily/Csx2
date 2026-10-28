import { Sparkles, UserRound } from 'lucide-react'
import type { TestCustomer } from '@/types'
import { Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { SmallLink, statusLabel } from './parts'

export const GUEST = 'guest'
interface Props {
  channel: 'chat' | 'email'; setChannel: (c: 'chat' | 'email') => void
  customers: TestCustomer[]; customerId: string; pickCustomer: (id: string) => void
  order: string; setOrder: (o: string) => void
  draftVoice: boolean; threshold: number
}

// Slim setup rail (REQ-980..982). Scenarios live in the empty state and the header menu.
export function SetupRail({ channel, setChannel, customers, customerId, pickCustomer, order, setOrder, draftVoice, threshold }: Props) {
  const c = customers.find((x) => x.id === customerId)
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-ink" id="test-channel-label">Channel</p>
        <div role="radiogroup" aria-labelledby="test-channel-label" className="mt-1.5 grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1">
          {(['chat', 'email'] as const).map((x) => <button key={x} type="button" role="radio" aria-checked={channel === x} onClick={() => setChannel(x)} className={cn('h-8 rounded-md px-3 text-sm capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:h-11', channel === x ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`test-channel-${x}`}>{x}</button>)}
        </div>
      </div>
      <div>
        <Label htmlFor="test-customer">Customer</Label>
        <Select value={customerId} onValueChange={pickCustomer}>
          <SelectTrigger id="test-customer" className="mt-1.5" data-testid="test-customer"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={GUEST} data-testid="test-customer-guest">Guest (no account)</SelectItem>
            {customers.map((x) => <SelectItem key={x.id} value={x.id} data-testid={`test-customer-${x.id}`}>{x.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {c && (
          <div className="mt-2 flex gap-3 rounded-xl bg-surface-sunken p-3 text-[13px] ring-1 ring-border/70" data-testid="test-customer-context">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border" aria-hidden><UserRound className="h-4 w-4 text-ink-muted" /></span>
            <div className="min-w-0 space-y-0.5 break-words">
              <p className="font-semibold text-ink" data-testid="test-context-name">{c.name}</p>
              <p className="break-all text-ink-muted" data-testid="test-context-email">{c.email}</p>
              <p className="text-ink-muted" data-testid="test-context-orders">{c.ordersCount} {c.ordersCount === 1 ? 'order' : 'orders'}{c.orderNumber && <> · Latest <span className="font-medium text-ink">{c.orderNumber}{c.orderStatus ? ` · ${statusLabel(c.orderStatus)}` : ''}</span></>}</p>
            </div>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="sandbox-order">Order (optional)</Label>
        <Input id="sandbox-order" className="mt-1.5" placeholder="#GB20398" value={order} onChange={(e) => setOrder(e.target.value)} data-testid="sandbox-order" />
      </div>
      <div className="space-y-2 border-t border-border pt-4 text-[13px]">
        <p className="flex items-center justify-between gap-2" data-testid="test-voice-source">
          <span className="inline-flex items-center gap-1.5 text-ink"><Sparkles className="h-3.5 w-3.5 text-ink-muted" aria-hidden />Brand voice: <span className={cn('font-medium', draftVoice ? 'text-amber-900' : 'text-ink')}>{draftVoice ? 'Draft voice' : 'Saved voice'}</span></span>
          <SmallLink to="/ai/voice" testId="test-voice-link">Edit</SmallLink>
        </p>
        <p className="flex items-center justify-between gap-2" data-testid="test-threshold">
          <span className="text-ink">Hands to a person below <span className="font-semibold tabular-nums">{threshold}%</span></span>
          <SmallLink to="/ai/replies" testId="test-threshold-change">Change</SmallLink>
        </p>
      </div>
    </div>
  )
}
