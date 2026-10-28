import type { ReactNode } from 'react'
import type { Step, StepConfig } from '@/types'
import { viewsApi, workflowsApi } from '@/api'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const LISTS = [['friday-drops', 'Friday Drops'], ['restock-alerts', 'Restock alerts'], ['newsletter', 'Newsletter']]

function F({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{hint && <p className="text-xs text-ink-muted">{hint}</p>}</div>
}
function Pick({ value, onChange, options, testId, label }: { value: string; onChange: (v: string) => void; options: string[][]; testId: string; label: string }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-9" aria-label={label} data-testid={testId}><SelectValue placeholder="Choose…" /></SelectTrigger>
      <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v} data-testid={`${testId}-${v}`}>{l}</SelectItem>)}</SelectContent>
    </Select>
  )
}
const num = (v: string) => (v === '' ? undefined : Number(v))

// Settings for the Phase 16 step types (REQ-832).
export function NewStepFields({ step, c, set, text }: { step: Step; c: StepConfig; set: (p: Partial<StepConfig>) => void; text: (label: string) => ReactNode }) {
  switch (step.type) {
    case 'pick_order':
      return (<>
        {text('Question')}
        <F label="Show"><Pick label="Order filter" value={c.orderFilter ?? 'any'} onChange={(v) => set({ orderFilter: v as StepConfig['orderFilter'] })} options={[['any', 'Any order'], ['unfulfilled', 'Unfulfilled only'], ['delivered', 'Delivered within N days']]} testId="step-order-filter" /></F>
        {c.orderFilter === 'delivered' && <F label="Days since delivery"><Input type="number" min={1} className="h-9 w-24" value={c.withinDays ?? 30} onChange={(e) => set({ withinDays: num(e.target.value) })} data-testid="step-within-days" /></F>}
        <F label="When nothing matches"><Input className="h-9" value={c.noneText ?? ''} onChange={(e) => set({ noneText: e.target.value })} data-testid="step-none-text" /></F>
        <p className="text-xs text-ink-muted">On chat, orders only show after the email code is verified.</p>
      </>)
    case 'pick_items': case 'address_form': return <>{text('Question')}</>
    case 'upload_photos':
      return (<>
        {text('Prompt')}
        <div className="flex gap-3"><F label="Min"><Input type="number" min={0} max={3} className="h-9 w-20" value={c.minPhotos ?? 1} onChange={(e) => set({ minPhotos: num(e.target.value) })} data-testid="step-min-photos" /></F><F label="Max"><Input type="number" min={1} max={3} className="h-9 w-20" value={c.maxPhotos ?? 3} onChange={(e) => set({ maxPhotos: num(e.target.value) })} data-testid="step-max-photos" /></F></div>
        <label className="flex min-h-8 items-center gap-2 text-sm text-ink"><input type="checkbox" className="h-4 w-4 accent-tobacco-600" checked={c.required !== false} onChange={(e) => set({ required: e.target.checked })} data-testid="step-photos-required" />Required</label>
        <p className="text-xs text-ink-muted">jpg or png, up to 10MB each.</p>
      </>)
    case 'consent': return <F label="Checkbox text"><Textarea rows={2} value={c.text ?? ''} onChange={(e) => set({ text: e.target.value })} data-testid="step-consent-text" /></F>
    case 'issue_refund':
      return (<>
        <F label="Amount"><Pick label="Refund amount" value={c.amountMode ?? 'items'} onChange={(v) => set({ amountMode: v as 'items' | 'custom' })} options={[['items', 'Picked items'], ['custom', 'Custom amount']]} testId="step-amount-mode" /></F>
        {c.amountMode === 'custom' && <F label="Custom amount ($)"><Input type="number" min={0} className="h-9 w-28" value={c.amount ?? ''} onChange={(e) => set({ amount: num(e.target.value) })} data-testid="step-amount" /></F>}
        <p className="text-xs text-ink-muted">Refunds above the auto-refund limit (${viewsApi.autoRefundLimit()}) take the Needs approval path. Change the limit in AI replies.</p>
      </>)
    case 'create_discount':
      return (<>
        <F label="Type"><Pick label="Discount type" value={c.discountType ?? 'percent'} onChange={(v) => set({ discountType: v as 'percent' | 'fixed' })} options={[['percent', 'Percent off'], ['fixed', 'Fixed amount']]} testId="step-discount-type" /></F>
        <div className="flex gap-3"><F label="Value"><Input type="number" min={0} className="h-9 w-24" value={c.discountValue ?? ''} onChange={(e) => set({ discountValue: num(e.target.value) })} data-testid="step-discount-value" /></F><F label="Expires after (days)"><Input type="number" min={1} className="h-9 w-24" value={c.expiryDays ?? 30} onChange={(e) => set({ expiryDays: num(e.target.value) })} data-testid="step-expiry" /></F></div>
      </>)
    case 'send_email':
      return (<>
        <F label="Subject"><Input className="h-9" value={c.subject ?? ''} onChange={(e) => set({ subject: e.target.value })} data-testid="step-subject" /></F>
        <F label="Body" hint="Uses {{variables}} from earlier steps."><Textarea rows={5} value={c.body ?? ''} onChange={(e) => set({ body: e.target.value })} data-testid="step-body" /></F>
      </>)
    case 'wait':
      return (<>
        <F label="Wait for"><Pick label="Wait for" value={c.waitFor ?? 'duration'} onChange={(v) => set({ waitFor: v as 'duration' | 'reply' })} options={[['duration', 'A set time'], ['reply', 'The customer to reply']]} testId="step-wait-for" /></F>
        <F label={c.waitFor === 'reply' ? 'Timeout (minutes)' : 'Minutes'}><Input type="number" min={1} className="h-9 w-24" value={c.waitMinutes ?? 60} onChange={(e) => set({ waitMinutes: num(e.target.value) })} data-testid="step-wait-minutes" /></F>
      </>)
    case 'run_workflow':
      return <F label="Workflow" hint="The conversation continues in that workflow. Variables carry over."><Pick label="Workflow to run" value={c.workflowId ?? ''} onChange={(v) => set({ workflowId: v })} options={workflowsApi.starterWorkflowChoices().map((w) => [w.id, w.name])} testId="step-run-workflow" /></F>
    case 'add_to_list':
      return <F label="Email list" hint="Add a Consent step before this one."><Pick label="Email list" value={c.listId ?? ''} onChange={(v) => set({ listId: v })} options={LISTS} testId="step-list" /></F>
    case 'check_inventory': return <p className="text-sm text-ink-muted">Checks Shopify stock for the picked item. In stock → Success path; out of stock → the other path.</p>
    case 'cancel_order': return <p className="text-sm text-ink-muted">Cancels {'{{order.number}}'} in Shopify and refunds the full total. Fails if the order already shipped.</p>
    case 'create_replacement': return <p className="text-sm text-ink-muted">Creates a $0 Shopify draft order for the picked items and completes it.</p>
    default: return null
  }
}
