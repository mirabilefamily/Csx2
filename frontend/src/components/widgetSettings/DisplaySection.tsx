import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import type { CsatQuestion, WidgetSettings } from '@/types'
import { Segmented, SourceBadge } from './fields'
import { PageTypePicker, ToggleRow } from './MessagingSection'
import type { Update } from './validate'

function PatternChips({ label, testId, value, onChange, placeholder }: { label: string; testId: string; value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState('')
  const add = () => {
    const t = text.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setText('')
  }
  return (
    <div data-testid={testId}>
      <label htmlFor={`${testId}-input`} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border-strong bg-surface p-1.5">
        {value.map((p) => (
          <span key={p} className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-1 pl-2.5 pr-1 font-mono text-xs" data-testid={`${testId}-chip-${p}`}>
            {p}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== p))} aria-label={`Remove ${p}`} className="rounded-full p-0.5 hover:bg-border"><X className="h-3 w-3" aria-hidden /></button>
          </span>
        ))}
        <input id={`${testId}-input`} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} className="h-7 min-w-[140px] flex-1 bg-transparent px-1 font-mono text-xs focus-visible:outline-none" data-testid={`${testId}-input`} />
        <button type="button" onClick={add} aria-label={`Add ${label.toLowerCase()}`} className="rounded p-1 text-tobacco-700 hover:bg-tobacco-50" data-testid={`${testId}-add`}><Plus className="h-4 w-4" aria-hidden /></button>
      </div>
    </div>
  )
}

export function DisplaySection({ draft, update }: { draft: WidgetSettings; update: Update }) {
  const d = draft.display
  return (
    <>
      <Segmented label="Show on" testId="ws-show-on" value={d.mode} onChange={(v) => update((x) => { x.display.mode = v })} options={[{ id: 'all', label: 'All pages' }, { id: 'page_types', label: 'Selected page types' }]} />
      {d.mode === 'page_types' && <PageTypePicker value={d.pageTypes} onChange={(v) => update((x) => { x.display.pageTypes = v })} testId="ws-page-types" />}
      <div className="cq-pair">
        <PatternChips label="Include URLs" testId="ws-url-include" value={d.urlInclude} placeholder="/products/*" onChange={(v) => update((x) => { x.display.urlInclude = v })} />
        <PatternChips label="Exclude URLs" testId="ws-url-exclude" value={d.urlExclude} placeholder="/pages/wholesale" onChange={(v) => update((x) => { x.display.urlExclude = v })} />
      </div>
      <p className="-mt-3 text-xs text-ink-muted">Use * as a wildcard. Press Enter to add.</p>
      <div className="space-y-1">
        <SourceBadge source={draft.sources.hideOnMobile} />
        <ToggleRow label="Hide on mobile" checked={d.hideOnMobile} onChange={(v) => update((x) => { x.display.hideOnMobile = v; x.sources.hideOnMobile = 'desk' })} testId="ws-hide-mobile" />
      </div>
      <Segmented label="When the team is offline" testId="ws-outside-hours" value={d.outsideHours} onChange={(v) => update((x) => { x.display.outsideHours = v })} options={[{ id: 'keep_ai', label: 'Keep AI on' }, { id: 'offline_form', label: 'Show offline form' }, { id: 'hide', label: 'Hide widget' }]} />
      <div className="space-y-3 rounded-lg bg-surface-sunken p-4">
        <p className="text-sm font-medium text-ink">What the AI receives</p>
        <ToggleRow label="Logged-in customer" hint="Name, email and order history from Shopify" checked={d.customerContext.loggedInCustomer} onChange={(v) => update((x) => { x.display.customerContext.loggedInCustomer = v })} testId="ws-ctx-customer" />
        <ToggleRow label="Current product" hint="The product page the customer is on" checked={d.customerContext.currentProduct} onChange={(v) => update((x) => { x.display.customerContext.currentProduct = v })} testId="ws-ctx-product" />
        <ToggleRow label="Cart contents" checked={d.customerContext.cartContents} onChange={(v) => update((x) => { x.display.customerContext.cartContents = v })} testId="ws-ctx-cart" />
      </div>
    </>
  )
}

export function CsatInChatSection({ draft, update, questions }: { draft: WidgetSettings; update: Update; questions: CsatQuestion[] | undefined }) {
  return (
    <>
      <p className="text-sm text-ink-muted" data-testid="ws-csat-style-note">Survey questions and style live in <Link to="/settings/csat" className="font-medium text-tobacco-700 underline underline-offset-2" data-testid="ws-csat-settings-link">Settings → CSAT</Link>.</p>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Questions (from CSAT Settings)</p>
          <Link to="/settings/csat" className="text-sm font-medium text-tobacco-700 underline underline-offset-2" data-testid="ws-edit-questions">Edit questions</Link>
        </div>
        <ol className="space-y-1.5" data-testid="ws-csat-questions">
          {(questions ?? []).map((q, i) => (
            <li key={q.id} className="flex items-center gap-3 rounded-md bg-surface-sunken px-3 py-2 text-sm">
              <span className="tabular-nums text-ink-subtle">{i + 1}.</span>
              <span className="flex-1 text-ink">{q.label}</span>
              <span className="text-xs capitalize text-ink-muted">{q.type}{q.required ? ' · required' : ''}</span>
            </li>
          ))}
          {!questions && <li className="text-sm text-ink-muted">Loading questions…</li>}
        </ol>
      </div>
    </>
  )
}
