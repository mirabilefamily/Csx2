import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, Pencil, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ShopifyOrder } from '@/types'
import { viewsApi } from '@/api'
import { useAuth } from '@/components/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { usd } from '@/lib/format'
type Kind = 'edit' | 'duplicate' | 'refund' | 'create'
const TITLE: Record<Kind, string> = { edit: 'Edit order', duplicate: 'Duplicate order', refund: 'Refund order', create: 'Create order' }

function Done({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="py-4 text-center" role="status" data-testid="order-action-confirmation">
      <CheckCircle2 className="mx-auto h-10 w-10 text-green-700" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-ink">{text}</p>
      <p className="mt-1 text-xs text-ink-muted">Demo only. Nothing was sent to Shopify.</p>
      <Button className="mt-4" onClick={onClose} data-testid="order-action-done">Done</Button>
    </div>
  )
}

function RefundForm({ o, ticketId, onDone }: { o: ShopifyOrder; ticketId: string; onDone: (msg: string) => void }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Record<string, number>>({})
  const [shipping, setShipping] = useState(false)
  const [restock, setRestock] = useState(true)
  const [reason, setReason] = useState('Damaged item')
  const [note, setNote] = useState('')
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const amount = viewsApi.refundAmount(o, { items, shipping })
  const max = viewsApi.refundable(o)
  const limit = viewsApi.autoRefundLimit()
  const submit = async () => {
    setBusy(true); setError(null)
    try { await viewsApi.refundOrder({ orderId: o.id, items, shipping, restock, reason, note, notify }, ticketId, user!); onDone(`Refunded ${usd(amount)} on ${o.number}`) } catch (e) { setError((e as Error).message) }
    setBusy(false)
  }
  return (
    <div className="space-y-4" data-testid="refund-form">
      <p className="text-xs text-ink-muted" data-testid="refund-available">Up to {usd(max)} can be refunded{o.refundedAmount ? ` (${usd(o.refundedAmount)} already refunded)` : ''}. AI auto-refund limit: {usd(limit)}.</p>
      <ul className="space-y-2">
        {o.lineItems.map((l) => (
          <li key={l.sku} className="flex items-center gap-2.5">
            <img src={l.image} alt="" className="h-9 w-9 rounded-md object-cover ring-1 ring-border" />
            <span className="min-w-0 flex-1 text-xs"><span className="block truncate font-medium text-ink">{l.title}</span><span className="text-ink-muted">{usd(l.price)} · bought {l.quantity}</span></span>
            <Label htmlFor={`rq-${l.sku}`} className="sr-only">Quantity to refund for {l.title}</Label>
            <Input id={`rq-${l.sku}`} type="number" min={0} max={l.quantity} className="h-9 w-16" value={items[l.sku] ?? 0} onChange={(e) => setItems({ ...items, [l.sku]: Math.max(0, Math.min(l.quantity, Number(e.target.value) || 0)) })} data-testid={`refund-qty-${l.sku}`} />
          </li>
        ))}
      </ul>
      <div className="grid gap-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={shipping} onChange={(e) => setShipping(e.target.checked)} className="h-4 w-4 accent-tobacco-600" data-testid="refund-shipping" /> Refund shipping ({usd(o.shippingCost ?? 8)})</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="h-4 w-4 accent-tobacco-600" data-testid="refund-restock" /> Restock items</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-tobacco-600" data-testid="refund-notify" /> Email the customer</label>
      </div>
      <div>
        <Label htmlFor="refund-reason">Reason</Label>
        <select id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm" data-testid="refund-reason">
          {['Damaged item', 'Wrong size', 'Not as described', 'Late delivery', 'Other'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div><Label htmlFor="refund-note">Internal note</Label><Textarea id="refund-note" rows={2} className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} data-testid="refund-note" /></div>
      {amount > limit && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="refund-over-limit">Above your ${limit} auto-refund limit. This refund will be logged as approved by you.</p>}
      {(amount > max || (touched && amount <= 0)) && <p role="alert" className="text-xs font-medium text-red-700" data-testid="refund-invalid">Enter an amount up to {usd(max)}.</p>}
      {error && <p role="alert" className="text-xs font-medium text-red-700" data-testid="refund-error">{error}</p>}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-sm text-ink">Refund total <span className="font-semibold tabular-nums" data-testid="refund-total">{usd(amount)}</span></p>
        <Button loading={busy} onClick={() => { setTouched(true); if (amount > 0 && amount <= max) void submit() }} data-testid="refund-submit">Refund {usd(amount)}</Button>
      </div>
    </div>
  )
}

const step = 'h-8 w-8 rounded-md border border-border text-sm text-ink hover:bg-surface-muted disabled:opacity-40 max-sm:h-11 max-sm:w-11'

function Stepper({ value, onChange, label, min = 0, testId }: { value: number; onChange: (n: number) => void; label: string; min?: number; testId: string }) {
  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" className={step} aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} data-testid={`${testId}-dec`}>−</button>
      <span className="w-6 text-center text-sm tabular-nums" aria-live="polite" data-testid={`${testId}-value`}>{value}</span>
      <button type="button" className={step} aria-label={`Increase ${label}`} onClick={() => onChange(value + 1)} data-testid={`${testId}-inc`}>+</button>
    </span>
  )
}

function EditForm({ o, onDone }: { o: ShopifyOrder; onDone: (msg: string) => void }) {
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(o.lineItems.map((l) => [l.sku, l.quantity])))
  const [addr, setAddr] = useState({ line1: o.shippingAddress.line1, city: o.shippingAddress.city, zip: o.shippingAddress.zip })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const total = o.lineItems.reduce((s, l) => s + l.price * (qty[l.sku] ?? 0), 0)
  const save = async () => {
    if (!Object.values(qty).some((n) => n > 0)) return setError('An order needs at least one item.')
    setBusy(true); setError(null)
    try { await viewsApi.editOrder(o.id, { items: qty, address: addr }); onDone(`Changes to ${o.number} saved`) } catch (e) { setError((e as Error).message) }
    setBusy(false)
  }
  return (
    <div className="space-y-4" data-testid="edit-order-form">
      <ul className="space-y-2">
        {o.lineItems.map((l) => (
          <li key={l.sku} className={cn('flex items-center gap-2', !qty[l.sku] && 'opacity-50')}>
            <span className="min-w-0 flex-1 text-sm"><span className="block truncate font-medium text-ink">{l.title}</span><span className="text-xs text-ink-muted">{l.variant} · {usd(l.price)}</span></span>
            <Stepper value={qty[l.sku] ?? 0} onChange={(n) => setQty({ ...qty, [l.sku]: n })} label={`quantity of ${l.title}`} testId={`edit-qty-${l.sku}`} />
            <Button size="icon-sm" variant="ghost" aria-label={`Remove ${l.title}`} onClick={() => setQty({ ...qty, [l.sku]: 0 })} data-testid={`edit-remove-${l.sku}`}><X aria-hidden /></Button>
          </li>
        ))}
      </ul>
      <fieldset className="grid gap-2 sm:grid-cols-3"><legend className="mb-1 text-sm font-medium text-ink">Shipping address</legend>
        {(['line1', 'city', 'zip'] as const).map((k) => <div key={k} className={k === 'line1' ? 'sm:col-span-3' : ''}><Label htmlFor={`addr-${k}`}>{k === 'line1' ? 'Street' : k === 'city' ? 'City' : 'ZIP'}</Label><Input id={`addr-${k}`} className="mt-1" value={addr[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} data-testid={`edit-addr-${k}`} /></div>)}
      </fieldset>
      {error && <p role="alert" className="text-xs font-medium text-red-700" data-testid="edit-order-error">{error}</p>}
      <div className="flex items-center justify-between border-t border-border pt-3"><p className="text-sm">New total <span className="font-semibold tabular-nums" data-testid="edit-order-total">{usd(total)}</span></p><Button loading={busy} onClick={save} data-testid="order-dialog-confirm">Save changes</Button></div>
    </div>
  )
}

function CreateForm({ customerId, onDone }: { customerId?: string; onDone: (msg: string) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ title: string; price: number; image: string }[]>([])
  const [lines, setLines] = useState<viewsApi.NewOrderLine[]>([])
  const [shipping, setShipping] = useState(8)
  const [discount, setDiscount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { let on = true; viewsApi.searchProducts(q).then((r) => on && setResults(r)).catch(() => undefined); return () => { on = false } }, [q])
  const add = (p: { title: string; price: number; image: string }) => setLines([...lines, { sku: `new-${Date.now()}`, title: p.title, variant: 'M', price: p.price, quantity: 1, image: p.image }])
  const set = (i: number, patch: Partial<viewsApi.NewOrderLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)).filter((l) => l.quantity > 0))
  const total = viewsApi.orderTotal(lines, shipping, discount)
  const create = async () => {
    if (!customerId) return setError('This customer has no Shopify profile.')
    setBusy(true); setError(null)
    try { const d = await viewsApi.createOrder(customerId, lines, shipping, discount); onDone(`Draft order ${d.number} created`) } catch (e) { setError((e as Error).message) }
    setBusy(false)
  }
  return (
    <div className="space-y-4" data-testid="create-order-form">
      <div><Label htmlFor="product-search">Search products</Label><Input id="product-search" className="mt-1" placeholder="Fedora, beanie…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="create-order-search" /></div>
      <ul className="max-h-36 space-y-1 overflow-y-auto" aria-label="Products">{results.map((p) => <li key={p.title}><button type="button" onClick={() => add(p)} className="flex min-h-9 w-full items-center justify-between rounded-md px-2 text-left text-sm hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11" data-testid={`create-order-product-${p.title.replace(/\W+/g, '-').toLowerCase()}`}><span className="truncate">{p.title}</span><span className="text-xs text-ink-muted">{usd(p.price)} · Add</span></button></li>)}</ul>
      {lines.length > 0 && (
        <ul className="space-y-2 border-t border-border pt-3" data-testid="create-order-lines">
          {lines.map((l, i) => (
            <li key={l.sku} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{l.title}</span>
              <select aria-label={`Size for ${l.title}`} value={l.variant} onChange={(e) => set(i, { variant: e.target.value })} className="h-8 rounded-md border border-border bg-surface px-1 text-sm max-sm:h-11" data-testid={`create-order-size-${i}`}>{['S', 'M', 'L', 'XL'].map((s) => <option key={s}>{s}</option>)}</select>
              <Stepper value={l.quantity} onChange={(n) => set(i, { quantity: n })} label={`quantity of ${l.title}`} testId={`create-order-qty-${i}`} />
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div><Label htmlFor="co-ship">Shipping ($)</Label><Input id="co-ship" type="number" min={0} className="mt-1" value={shipping} onChange={(e) => setShipping(Math.max(0, Number(e.target.value) || 0))} data-testid="create-order-shipping" /></div>
        <div><Label htmlFor="co-disc">Discount ($)</Label><Input id="co-disc" type="number" min={0} className="mt-1" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} data-testid="create-order-discount" /></div>
      </div>
      {error && <p role="alert" className="text-xs font-medium text-red-700" data-testid="create-order-error">{error}</p>}
      <div className="flex items-center justify-between border-t border-border pt-3"><p className="text-sm">Total <span className="font-semibold tabular-nums" aria-live="polite" data-testid="create-order-total">{usd(total)}</span></p><Button loading={busy} disabled={!lines.length} onClick={create} data-testid="order-dialog-confirm">Create draft order</Button></div>
    </div>
  )
}

export function OrderActionDialog({ kind, o, ticketId, customerId, onClose, onChanged }: { kind: Kind | null; o?: ShopifyOrder; ticketId: string; customerId?: string; onClose: () => void; onChanged: () => void }) {
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const close = () => { setDone(null); onClose() }
  const finish = (m: string) => { setDone(m); onChanged(); toast.success(m) }
  const duplicate = async () => {
    setBusy(true)
    try { const d = await viewsApi.duplicateOrder(o!.id); finish(`Draft order ${d.number} created`) } catch { toast.error("Couldn't duplicate. Try again.") }
    setBusy(false)
  }
  return (
    <Dialog open={!!kind} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-lg max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:overflow-y-auto max-sm:rounded-none" data-testid={`order-dialog-${kind}`}>
        <DialogTitle className="text-base font-semibold text-ink">{kind && TITLE[kind]}{o && kind !== 'create' && ` ${o.number}`}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-muted">Changes apply to the order in Shopify.</DialogDescription>
        <div className="mt-4">
          {done ? <Done text={done} onClose={close} /> : kind === 'refund' && o ? (
            <RefundForm o={o} ticketId={ticketId} onDone={finish} />
          ) : kind === 'edit' && o ? <EditForm o={o} onDone={finish} /> : kind === 'create' ? <CreateForm customerId={customerId} onDone={finish} /> : o ? (
            <div className="space-y-3">
              <ul className="space-y-1.5 text-sm">{o.lineItems.map((l) => <li key={l.sku} className="flex justify-between gap-2"><span className="truncate text-ink">{l.title} · {l.variant} × {l.quantity}</span><span className="tabular-nums text-ink-muted">{usd(l.price)}</span></li>)}</ul>
              <p className="text-xs text-ink-muted">A draft order opens with these items so you can send an invoice.</p>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={close}>Cancel</Button><Button loading={busy} onClick={duplicate} data-testid="order-dialog-confirm">Create draft</Button></div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function OrderButtons({ o, onAction }: { o: ShopifyOrder; onAction: (k: Kind) => void }) {
  return (
    <div className="-ml-2 flex flex-wrap gap-0.5 [&_button]:h-8 [&_button]:px-2 [&_button]:text-xs [&_button]:text-ink-muted max-sm:[&_button]:h-11" data-testid={`order-actions-${o.id}`}>
      <Button size="sm" variant="ghost" onClick={() => onAction('edit')} data-testid={`order-edit-${o.id}`}><Pencil aria-hidden /> Edit</Button>
      <Button size="sm" variant="ghost" onClick={() => onAction('duplicate')} data-testid={`order-duplicate-${o.id}`}><Copy aria-hidden /> Duplicate</Button>
      <Button size="sm" variant="ghost" disabled={viewsApi.refundable(o) <= 0} onClick={() => onAction('refund')} data-testid={`order-refund-${o.id}`}><RotateCcw aria-hidden /> Refund</Button>
    </div>
  )
}
