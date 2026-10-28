import { BadgeCheck, Ban, Boxes, CircleStop, ClipboardCheck, Clock, GitBranch, Images, KeyRound, ListChecks, ListPlus, Mail, MailCheck, MapPin, MessageSquare, MessageCircleQuestion, PackageCheck, PackageSearch, PackageX, Percent, Receipt, Repeat, RotateCcw, ShoppingBag, Tag, UserRound, Undo2, type LucideIcon } from 'lucide-react'
import type { Step, StepType } from '@/types'

export const STEP_ICON: Record<StepType, LucideIcon> = {
  message: MessageSquare, ask: MessageCircleQuestion, send_code: MailCheck, check_code: KeyRound, find_orders: PackageSearch, show_orders: ListChecks, update_address: MapPin,
  find_returns: RotateCcw, start_return: Undo2, condition: GitBranch, add_tag: Tag, set_field: BadgeCheck, handover: UserRound, end: CircleStop,
  pick_order: ShoppingBag, pick_items: ListChecks, address_form: MapPin, upload_photos: Images, consent: ClipboardCheck, check_inventory: Boxes, cancel_order: PackageX,
  create_replacement: PackageCheck, issue_refund: Receipt, create_discount: Percent, send_email: Mail, wait: Clock, run_workflow: Repeat, add_to_list: ListPlus,
}
export const UnknownIcon = Ban

// Step categories with muted colours for icon tiles (REQ-820).
export type StepCategory = 'Talk' | 'Verify' | 'Shopify' | 'Loop' | 'Logic' | 'Ticket' | 'End' | 'Messaging' | 'Marketing'
const CAT: Record<StepType, StepCategory> = {
  message: 'Talk', ask: 'Talk', send_code: 'Verify', check_code: 'Verify', find_orders: 'Shopify', show_orders: 'Shopify', update_address: 'Shopify', find_returns: 'Loop', start_return: 'Loop', condition: 'Logic', add_tag: 'Ticket', set_field: 'Ticket', handover: 'Ticket', end: 'End',
  pick_order: 'Talk', pick_items: 'Talk', address_form: 'Talk', upload_photos: 'Talk', consent: 'Talk', check_inventory: 'Shopify', cancel_order: 'Shopify', create_replacement: 'Shopify', issue_refund: 'Shopify', create_discount: 'Shopify',
  send_email: 'Messaging', wait: 'Logic', run_workflow: 'Logic', add_to_list: 'Marketing',
}
export const CATEGORY_STYLE: Record<StepCategory, string> = { Talk: 'bg-[#EEF3F8] text-[#3D5A78]', Verify: 'bg-[#F2EEF8] text-[#5B4A7E]', Shopify: 'bg-[#EEF6EF] text-[#3E6B47]', Loop: 'bg-[#F7F1E8] text-[#7A5B2E]', Logic: 'bg-[#F6F2EA] text-[#6B5A3A]', Ticket: 'bg-[#F7EEEE] text-[#7E4848]', End: 'bg-surface-muted text-ink-muted', Messaging: 'bg-[#EEF4F6] text-[#3B6470]', Marketing: 'bg-[#F6EEF3] text-[#76476A]' }
export const categoryOf = (t: StepType) => CAT[t]
export function CategoryTile({ type }: { type: StepType }) {
  const I = STEP_ICON[type] ?? UnknownIcon
  const c = CAT[type]
  return <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${CATEGORY_STYLE[c]}`} title={c} data-category={c}><I className="h-4 w-4" aria-hidden /></span>
}

const FILTER = { any: 'any order', unfulfilled: 'unfulfilled orders', delivered: 'delivered' }

export function stepSummary(st: Step, workflowName?: (id: string) => string | undefined): string {
  const c = st.config
  switch (st.type) {
    case 'message': return c.text || 'Empty message'
    case 'ask': return `${c.text || 'No question yet'}${c.variable ? ` → {{${c.variable}}}` : ''}`
    case 'send_code': return '6-digit code to {{email}}, expires in 10 min'
    case 'check_code': return `${c.attempts ?? 3} attempts, then hand over`
    case 'find_orders': return `Shopify orders for {{${c.variable ?? 'email'}}}`
    case 'show_orders': return `Latest ${c.limit ?? 3}: number, date, items, status, tracking`
    case 'condition': return c.condVar ? `${c.condVar} ${c.op === 'gt' ? '>' : c.op === 'lt' ? '<' : 'is'} ${c.condValue}` : 'No rule yet'
    case 'add_tag': return c.tag ? `Tag "${c.tag}"` : 'No tag yet'
    case 'set_field': return c.field ? `${c.field} = ${c.fieldValue}` : 'No field yet'
    case 'handover': return `To ${c.team ?? 'Support'}${c.tag ? ` · tag ${c.tag}` : ''}`
    case 'end': return c.csat ? 'Ask the CSAT question' : 'End the conversation'
    case 'pick_order': return `Verified customer's ${c.orderFilter === 'delivered' ? `orders delivered within ${c.withinDays ?? 30} days` : FILTER[c.orderFilter ?? 'any']}`
    case 'pick_items': return 'Pick line items and quantity from {{order.number}}'
    case 'address_form': return 'Street, city, state, ZIP (validated) → {{new_address}}'
    case 'upload_photos': return `${c.minPhotos ?? 1}–${c.maxPhotos ?? 3} photos, jpg/png ≤10MB${c.required === false ? ', optional' : ', required'}`
    case 'consent': return c.text ? `Checkbox: “${c.text}”` : 'No consent text yet'
    case 'check_inventory': return 'Picked item in stock? Yes / no + quantity'
    case 'cancel_order': return 'Cancel {{order.number}} and refund the total'
    case 'create_replacement': return '$0 draft order for the picked items'
    case 'issue_refund': return `${c.amountMode === 'custom' ? `$${c.amount ?? 0}` : 'Picked items'}; above the auto-refund limit needs approval`
    case 'create_discount': return `${c.discountType === 'fixed' ? `$${c.discountValue ?? 0}` : `${c.discountValue ?? 0}%`} off, expires in ${c.expiryDays ?? 30} days`
    case 'send_email': return c.subject ? `Email the customer: “${c.subject}”` : 'No subject yet'
    case 'wait': return c.waitFor === 'reply' ? `Until the customer replies (timeout ${c.waitMinutes ?? 60} min)` : `Wait ${c.waitMinutes ?? 60} min`
    case 'run_workflow': return c.workflowId ? `Continue in ${workflowName?.(c.workflowId) ?? c.workflowId}` : 'No workflow picked'
    case 'add_to_list': return c.listId ? `Add {{email}} to ${c.listId}` : 'No list chosen'
    default: return 'Runs in Shopify or Loop'
  }
}

// Renders {{var}} as small chips (REQ-734).
export function VarText({ text }: { text: string }) {
  return <>{text.split(/(\{\{\s*[\w.]+\s*\}\})/g).map((p, i) => (/^\{\{/.test(p) ? <span key={i} className="mx-0.5 inline-flex rounded-full bg-surface px-1.5 font-mono text-[11px] text-tobacco-800 ring-1 ring-tobacco-200" data-testid="var-chip">{p.replace(/[{}\s]/g, '')}</span> : p))}</>
}
