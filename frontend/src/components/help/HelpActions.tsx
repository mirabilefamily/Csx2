import { useState } from 'react'
import { ArrowRight, Check, ExternalLink, Ruler } from 'lucide-react'
import { toast } from 'sonner'
import { helpApi } from '@/api'
import type { TrackResult } from '@/api/help'
import { cn } from '@/lib/utils'

const field = 'hc-mono h-11 min-w-0 flex-1 rounded-xl bg-white px-4 text-[14px] ring-1 ring-black/10 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#141414]'
const btn = 'hc-mono inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#141414] px-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-black disabled:opacity-60'
const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function OrderLookup({ edit }: { edit?: boolean }) {
  const [email, setEmail] = useState('')
  const [num, setNum] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [r, setR] = useState<TrackResult | null>(null)
  const go = async () => {
    setBusy(true); setErr(null)
    try { setR(await helpApi.trackOrder(email, num)) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="rounded-2xl bg-[#F3F0E9] p-5 max-sm:p-4" data-testid={edit ? 'action-edit' : 'action-track'}>
      <p className="hc-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55">{edit ? 'Check if your order can change' : 'Track my order'}</p>
      {!r ? (
        <form onSubmit={(e) => { e.preventDefault(); void go() }} className="mt-3 flex gap-2 max-md:flex-col">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className={field} data-testid="track-email" />
          <input required value={num} onChange={(e) => setNum(e.target.value)} placeholder="Order # e.g. GB20398" aria-label="Order number" className={cn(field, 'md:max-w-[220px]')} data-testid="track-order" />
          <button type="submit" disabled={busy} className={btn} data-testid="track-submit">{busy ? 'Looking…' : 'Find order'}<ArrowRight className="h-4 w-4" aria-hidden /></button>
        </form>
      ) : (
        <div className="mt-3 animate-in fade-in duration-300" data-testid="track-result">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="hc-display text-[22px]">{r.number}</p>
            <p className="hc-mono text-[12px] uppercase tracking-[0.08em] text-black/60">{r.items.join(' · ')}</p>
          </div>
          <ol className="mt-4 grid grid-cols-4 gap-2 max-sm:grid-cols-1" data-testid="track-timeline">
            {r.steps.map((s, i) => (
              <li key={s.label} className="relative">
                <span className={cn('block h-1 rounded-full', s.done ? 'bg-[#35B54A]' : 'bg-black/10')} aria-hidden />
                <p className={cn('mt-2.5 flex items-center gap-1.5 text-[13px] font-medium', !s.done && 'text-black/45')}>{s.done && <Check className="h-3.5 w-3.5 text-[#35B54A]" aria-hidden />}{s.label}</p>
                <p className="hc-mono text-[11px] text-black/50" data-testid={`track-step-${i}`}>{s.at ? fmt(s.at) : '—'}</p>
              </li>
            ))}
          </ol>
          {edit && (r.canEdit
            ? <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={btn} onClick={() => toast.success('Address change requested. We will confirm by email.')} data-testid="edit-address">Change address</button><button type="button" className={cn(btn, 'bg-white text-[#141414] ring-1 ring-black/15 hover:bg-white/70')} onClick={() => toast.success('Cancellation requested. We will confirm by email.')} data-testid="edit-cancel">Cancel order</button></div>
            : <p className="mt-4 text-[14px] text-black/70" data-testid="edit-too-late">This order has already shipped, so it can't be changed. You can still return it free within 30 days of delivery.</p>)}
          <button type="button" onClick={() => setR(null)} className="hc-mono mt-4 text-[11px] uppercase tracking-[0.1em] text-black/55 underline-offset-4 hover:underline" data-testid="track-again">Look up another order</button>
        </div>
      )}
      {err && <p role="alert" className="mt-3 text-[13px] text-red-700" data-testid="track-error">{err}</p>}
    </div>
  )
}

export function ReturnAction() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-[#F3F0E9] p-5 max-sm:p-4" data-testid="action-return">
      <img src="/images/brand/loop-mark.svg" alt="" className="h-8 w-8" />
      <div className="min-w-0 flex-1">
        <p className="hc-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55">Returns portal by Loop</p>
        <p className="mt-0.5 text-[14px]">Pick the hat, choose refund, exchange or store credit, and print a free label.</p>
      </div>
      <a href="https://goorin.loopreturns.com" target="_blank" rel="noopener noreferrer" className={btn} data-testid="start-return">Start a return<ExternalLink className="h-4 w-4" aria-hidden /></a>
    </div>
  )
}

export function SizeAction() {
  const [cm, setCm] = useState('')
  const [r, setR] = useState<ReturnType<typeof helpApi.sizeFor> | undefined>()
  return (
    <div className="rounded-2xl bg-[#F3F0E9] p-5 max-sm:p-4" data-testid="action-size">
      <p className="hc-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-black/55">Find my size</p>
      <form onSubmit={(e) => { e.preventDefault(); setR(helpApi.sizeFor(parseFloat(cm))) }} className="mt-3 flex gap-2">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Ruler className="pointer-events-none absolute left-4 h-4 w-4 text-black/40" aria-hidden />
          <input inputMode="decimal" required value={cm} onChange={(e) => setCm(e.target.value)} placeholder="Head measurement" aria-label="Head measurement in cm" className={cn(field, 'pl-10 pr-12')} data-testid="size-cm" />
          <span className="hc-mono pointer-events-none absolute right-4 text-[12px] text-black/50">cm</span>
        </label>
        <button type="submit" className={btn} data-testid="size-submit">Match</button>
      </form>
      {r === null && <p role="alert" className="mt-3 text-[13px] text-red-700" data-testid="size-error">That's outside our chart (53–65 cm). Try measuring again, or chat with us.</p>}
      {r && (
        <div className="mt-4 flex items-center gap-5 animate-in fade-in duration-300" data-testid="size-result">
          <p className="hc-display text-[44px] leading-none">Size {r.size}</p>
          <div><p className="hc-mono text-[12px] uppercase tracking-[0.06em] text-black/60">{r.range}</p><p className="mt-1 text-[14px]">{r.note}</p></div>
        </div>
      )}
    </div>
  )
}
