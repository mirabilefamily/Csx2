import type { OrderRefundInput, SavedView, SessionUser, ShopifyOrder, Ticket } from '@/types'
import { ApiError, request } from './client'
import { db } from './db'
import { usd } from '@/lib/format'

const seed = (): SavedView[] => [
  { id: 'sv-vip', name: 'VIP & wholesale', scope: 'shared', ownerId: 'u-ava', ownerName: 'Ava Martinez', filters: { tag: 'vip', status: 'active' } },
  { id: 'sv-damaged', name: 'Damaged on arrival', scope: 'shared', ownerId: 'u-ava', ownerName: 'Ava Martinez', filters: { tag: 'damaged', status: 'all' } },
  { id: 'sv-sizing', name: 'Sizing help', scope: 'shared', ownerId: 'u-ava', ownerName: 'Ava Martinez', filters: { tag: 'sizing', status: 'active' } },
  { id: 'sv-followups', name: 'My follow-ups', scope: 'private', ownerId: 'u-ava', ownerName: 'Ava Martinez', filters: { status: 'active', sort: 'oldest', q: 'follow' } },
]
let views = seed()

export function matchSavedView(t: Ticket, v: SavedView) {
  const f = v.filters
  if (t.setAside) return false
  if (f.tag && !t.tags.includes(f.tag) && !(f.tag === 'vip' && t.tags.includes('wholesale'))) return false
  if (f.channel && f.channel !== 'all' && t.channel !== f.channel) return false
  if (f.status === 'active' && ['resolved', 'closed'].includes(t.status)) return false
  if (f.status && !['active', 'all'].includes(f.status) && t.status !== f.status) return false
  if (f.q && !`${t.subject} ${t.preview} ${t.customer.name} ${t.tags.join(' ')}`.toLowerCase().includes(f.q.toLowerCase())) return false
  return true
}

// GET /api/views — shared views plus the caller's private views
export function listSavedViews(user: SessionUser): Promise<SavedView[]> {
  return request(() => views.filter((v) => v.scope === 'shared' || v.ownerId === actorId(user)), { empty: () => [] })
}

// POST /api/views  { name, scope, filters }
export function saveView(input: Omit<SavedView, 'id' | 'ownerId' | 'ownerName'> & { id?: string }, user: SessionUser): Promise<SavedView> {
  return request(() => {
    const name = input.name.trim()
    if (!name) throw new ApiError('Give this view a name.', 422)
    if (name.length > 40) throw new ApiError('Keep the name under 40 characters.', 422)
    if (views.some((v) => v.id !== input.id && v.scope === input.scope && v.name.toLowerCase() === name.toLowerCase() && (v.scope === 'shared' || v.ownerId === user.id))) throw new ApiError('A view with this name already exists.', 409)
    const existing = input.id ? views.find((v) => v.id === input.id) : undefined
    if (existing && existing.scope === 'shared' && existing.ownerId !== actorId(user) && user.role !== 'admin') throw new ApiError('Only the creator or an admin can change this view.', 403)
    const v: SavedView = { ...(existing ?? { id: `sv-${Date.now()}`, ownerId: actorId(user), ownerName: user.role === 'agent' ? 'Sam Okafor' : user.name }), name, scope: input.scope, filters: { ...input.filters } }
    views = existing ? views.map((x) => (x.id === v.id ? v : x)) : [...views, v]
    return v
  })
}

// DELETE /api/views/:id
export function deleteView(id: string, user: SessionUser): Promise<{ id: string }> {
  return request(() => {
    const v = views.find((x) => x.id === id)
    if (!v) throw new ApiError('View not found.', 404)
    if (v.ownerId !== actorId(user) && user.role !== 'admin') throw new ApiError('Only the creator or an admin can change this view.', 403)
    views = views.filter((x) => x.id !== id)
    return { id }
  })
}

export const canManageView = (v: SavedView, user: SessionUser | null) => !!user && (v.ownerId === actorId(user) || user.role === 'admin')
// The Agent role toggle acts as Sam Okafor for ownership (REQ-677).
export const actorId = (user: SessionUser) => (user.role === 'agent' && user.id === 'u-ava' ? 'u-sam' : user.id)

const findOrder = (id: string) => {
  for (const c of db.customers) { const o = c.orders.find((x) => x.id === id); if (o) return o }
  throw new ApiError('Order not found.', 404)
}
export const refundable = (o: ShopifyOrder) => Math.round((o.total - (o.refundedAmount ?? 0)) * 100) / 100
export const autoRefundLimit = () => db.aiSettings.autoRefund.limit
// Saved confidence threshold (single source for Inbox, testing and the estimate).
export const aiThreshold = () => db.aiSettings.threshold
export { TAG_COLORS } from '@/mocks/tickets'

// PATCH /api/tickets/:id/fields (MOCKED)
export const TICKET_FIELDS = [{ id: 'reason', label: 'Contact reason', options: ['Damaged item', 'Sizing', 'Return / refund', 'Order status', 'Wholesale', 'Other'] }, { id: 'product', label: 'Product line', options: ['Fedoras', 'Snapbacks', 'Beanies', 'Bucket hats', 'Animal Farm'] }]

// POST /api/shopify/orders/:id/refund (MOCKED)
export function refundOrder(input: OrderRefundInput, ticketId: string, actor: SessionUser): Promise<ShopifyOrder> {
  return request(() => {
    const o = findOrder(input.orderId)
    const amount = refundAmount(o, input)
    if (amount <= 0 || amount > refundable(o) + 0.001) throw new ApiError(`Enter an amount up to ${usd(refundable(o))}.`, 422)
    o.refundedAmount = Math.round(((o.refundedAmount ?? 0) + amount) * 100) / 100
    o.financialStatus = refundable(o) <= 0 ? 'refunded' : 'partially_refunded'
    db.messages.push({ id: `m-${Date.now()}`, ticketId, authorType: 'system', authorName: 'System', body: `Refund of ${usd(amount)} issued by ${actor.name}`, isInternal: false, createdAt: new Date().toISOString(), format: 'text' } as never)
    return o
  })
}

const customerOf = (orderId: string) => db.customers.find((c) => c.orders.some((o) => o.id === orderId))!
export interface OrderEdit { items: Record<string, number>; address: { line1: string; city: string; zip: string } }

// PATCH /api/shopify/orders/:id (MOCKED)
export function editOrder(orderId: string, edit: OrderEdit): Promise<ShopifyOrder> {
  return request(() => {
    const o = findOrder(orderId)
    const items = o.lineItems.map((l) => ({ ...l, quantity: edit.items[l.sku] ?? l.quantity })).filter((l) => l.quantity > 0)
    if (!items.length) throw new ApiError('An order needs at least one item.', 422)
    o.lineItems = items
    o.total = Math.round(items.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100
    o.shippingAddress = { ...o.shippingAddress, ...edit.address }
    return o
  })
}

let draftNo = 1001
// POST /api/shopify/draft-orders  { duplicateOf? | items, shipping, discount }
export function duplicateOrder(orderId: string): Promise<ShopifyOrder> {
  return request(() => {
    const o = findOrder(orderId)
    const d: ShopifyOrder = { ...structuredClone(o), id: `draft-${draftNo}`, number: `#D${draftNo++}`, isDraft: true, financialStatus: 'pending', fulfillmentStatus: 'unfulfilled', refundedAmount: 0, createdAt: new Date().toISOString(), trackingNumber: null, trackingUrl: null, carrier: null }
    customerOf(orderId).orders.unshift(d)
    return d
  })
}

export interface NewOrderLine { sku: string; title: string; variant: string; price: number; quantity: number; image: string }
export const orderTotal = (lines: NewOrderLine[], shipping: number, discount: number) => Math.max(0, Math.round((lines.reduce((s, l) => s + l.price * l.quantity, 0) + shipping - discount) * 100) / 100)

// GET /api/shopify/products?q= (MOCKED catalog from seeded line items)
export function searchProducts(q: string): Promise<{ title: string; price: number; image: string }[]> {
  return request(() => {
    const seen = new Map<string, { title: string; price: number; image: string }>()
    db.customers.forEach((c) => c.orders.forEach((o) => o.lineItems.forEach((l) => seen.set(l.title, { title: l.title, price: l.price, image: l.image }))))
    return [...seen.values()].filter((p) => p.title.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  })
}

export function createOrder(customerId: string, lines: NewOrderLine[], shipping: number, discount: number): Promise<ShopifyOrder> {
  return request(() => {
    if (!lines.length) throw new ApiError('Add at least one item.', 422)
    const c = db.customers.find((x) => x.id === customerId)
    if (!c) throw new ApiError('Customer not found.', 404)
    const base = c.orders[0]
    const d: ShopifyOrder = { ...(base ? structuredClone(base) : ({} as ShopifyOrder)), id: `draft-${draftNo}`, number: `#D${draftNo++}`, isDraft: true, status: 'unfulfilled', financialStatus: 'pending', fulfillmentStatus: 'unfulfilled', lineItems: lines, shippingCost: shipping, discount, total: orderTotal(lines, shipping, discount), refundedAmount: 0, currency: 'USD', createdAt: new Date().toISOString(), carrier: null, trackingNumber: null, trackingUrl: null, adminUrl: base?.adminUrl ?? '' }
    c.orders.unshift(d)
    return d
  })
}

export function refundAmount(o: ShopifyOrder, input: Pick<OrderRefundInput, 'items' | 'shipping'>) {
  const items = o.lineItems.reduce((s, l) => s + (input.items[l.sku] ?? 0) * l.price, 0)
  return Math.round((items + (input.shipping ? o.shippingCost ?? 8 : 0)) * 100) / 100
}

// POST /api/shopify/draft-orders (MOCKED): duplicate / create / edit all end in a confirmation
export function createDraftOrder(label: string): Promise<{ number: string; label: string }> {
  return request(() => ({ number: `#D${1000 + Math.floor(Math.random() * 9000)}`, label }))
}
