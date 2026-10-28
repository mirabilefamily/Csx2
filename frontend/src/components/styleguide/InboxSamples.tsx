import type { AIDraft, Customer, LoopReturn, Message } from '@/types'
import { CustomerHeader, CustomerStats, OrderCard } from '@/components/inbox/CustomerPanel'
import { LoopReturnsSection } from '@/components/inbox/LoopReturns'

const SG_RETURNS: LoopReturn[] = [{
  id: '40001', customerId: 'sg', orderNumber: '#GB20398', state: 'in_review', outcome: 'exchange', returnTotal: 148, refund: 0, exchangeTotal: 148, storeCredit: 0,
  items: [{ sku: 'sg-r1', title: 'Hampton Wool Fedora', variant: 'Tobacco / M', reason: 'Too small', quantity: 1, price: 148, image: '/images/products/wool-fedora.jpg', exchangeFor: 'Tobacco / L' }],
  labelStatus: 'in_transit', createdAt: '2026-09-24T15:00:00.000Z', adminUrl: 'https://admin.loopreturns.com/returns/40001',
}]

const SG_CUSTOMER: Customer = {
  id: 'sg', name: 'Margaret Okonkwo', email: 'margaret.okonkwo@example.com', phone: '+1 (555) 0101-4037', location: 'Brooklyn, NY',
  tags: ['VIP', 'Repeat buyer', 'Hat Club'], shopifyCustomerId: 'gid://shopify/Customer/7037', adminUrl: 'https://admin.shopify.com/store/goorin/customers/7037',
  customerSince: '2024-03-02T10:00:00.000Z', note: null,
  orders: [{
    id: 'order-sg', number: '#GB20398', status: 'delivered', financialStatus: 'paid', fulfillmentStatus: 'delivered', total: 148, currency: 'USD', createdAt: '2026-09-20T15:00:00.000Z',
    carrier: 'UPS', trackingNumber: '1Z20398ABC', trackingUrl: 'https://tracking.example.com/ups/1Z20398ABC', adminUrl: 'https://admin.shopify.com/store/goorin/orders/20398',
    lineItems: [{ sku: 'sg-1', title: 'Hampton Wool Fedora', variant: 'Tobacco / M', quantity: 1, price: 148, image: '/images/products/wool-fedora.jpg' }],
    shippingAddress: { name: 'Margaret Okonkwo', line1: '161 Atlantic Ave', city: 'Brooklyn', region: 'NY', zip: '12371', country: 'United States' },
  }],
}
import { DraftCard } from '@/components/inbox/DraftCard'
import { EscalationChip } from '@/components/inbox/EscalationChip'
import { MessageItem } from '@/components/inbox/MessageItem'
import { Composer } from '@/components/inbox/Composer'
import { Card } from '@/components/ui/card'
import { Specimen } from './SgSection'

const now = new Date().toISOString()
const TITLES = { 'g-1': 'Hat sizing guide', 'g-2': 'Returns & exchanges' }
const draft = (id: string, tier: AIDraft['tier'], confidence: number, body: string): AIDraft => ({ id, ticketId: 'GB-1076', tier, confidence, body, guidanceIds: ['g-1', 'g-2'], createdAt: now })
const DRAFTS = [
  draft('sg-claude-high', 'claude', 0.92, 'Hi Maya, a 22.5" head is a Medium in our fedoras. If you are between sizes, go up and use the sizing tape we include.'),
  draft('sg-claude-low', 'claude', 0.58, 'Hi Maya, I think a Medium should fit, but I am not fully sure about this style.'),
  draft('sg-grok-high', 'grokbot', 0.88, 'Hi Maya, I checked your order. We can swap it for a Large at no cost. A prepaid label is on its way.'),
  draft('sg-grok-low', 'grokbot', 0.41, 'Hi Maya, I could not confirm the exchange window for this order.'),
]
const NOTE: Message = { id: 'sg-note', ticketId: 'GB-1076', authorType: 'agent', authorName: 'Ava Martinez', body: 'Customer is a repeat buyer. OK to waive the exchange shipping.', createdAt: now, isInternal: true }
const noop = () => undefined

// Inbox building blocks rendered with the real components and sample data.
export function InboxSamples() {
  return (
    <div className="space-y-8">
      <Specimen label="Customer panel (≥1024px open by default, collapses to a rail) · header, Shopify tags, stats, order card">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="max-w-[340px] space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-border" data-testid="sg-customer-panel">
            <CustomerHeader name={SG_CUSTOMER.name} email={SG_CUSTOMER.email} c={SG_CUSTOMER} fraud={null} />
            <CustomerStats orders={SG_CUSTOMER.orders} />
          </div>
          <div className="max-w-[340px]" data-testid="sg-order-card"><OrderCard o={SG_CUSTOMER.orders[0]} defaultOpen /></div>
        </div>
      </Specimen>
      <Specimen label="Loop Returns section · wordmark header, stats (High return rate chip over 30%), return card with state + outcome pills, View in Loop">
        <div className="max-w-[340px] rounded-2xl bg-surface ring-1 ring-border" data-testid="sg-loop-returns"><LoopReturnsSection returns={SG_RETURNS} lifetimeSpend={148} /></div>
      </Specimen>
      <Specimen label="AI draft card · AI and Grokbot · high and low confidence">
        <ul className="grid gap-4 lg:grid-cols-2">
          {DRAFTS.map((d) => <li key={d.id} className="list-none"><DraftCard draft={d} titles={TITLES} busy={false} onApprove={noop} onEdit={noop} onDiscard={noop} onWriteOwn={noop} /></li>)}
        </ul>
      </Specimen>
      <div className="grid gap-8 lg:grid-cols-2">
        <Specimen label="Escalation timeline chip (hover a step for the reason)">
          <EscalationChip steps={[{ key: 'claude', label: 'AI', reason: 'Confidence 58%, below the 75% threshold' }, { key: 'grokbot', label: 'Grokbot', reason: 'Refund over $150' }, { key: 'human', label: 'Human', reason: 'Assigned to Sam Okafor' }]} />
        </Specimen>
        <Specimen label="Internal note">
          <ul><MessageItem m={NOTE} /></ul>
        </Specimen>
      </div>
      <Specimen label="Composer · reply / internal note, formatting">
        <Card className="overflow-hidden p-4">
          <Composer onSend={async () => true} onDraftChange={noop} to="grace@example.com" />
        </Card>
      </Specimen>
    </div>
  )
}
