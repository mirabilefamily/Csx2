import { tidy } from '@/lib/workflowGraph'
import type { Edge, RunOutcome, Step, StepConfig, StepType, Trigger, Workflow, WorkflowChannel, WorkflowRun, WorkflowSnapshot } from '@/types'

let n = 0
const s = (id: string, type: StepType, config: StepConfig = {}): Step => ({ id, type, config, position: { x: 0, y: 0 } })
const e = (source: string, target: string, sourceHandle = 'next'): Edge => ({ id: `e-${source}-${sourceHandle}-${target}-${n++}`, source, sourceHandle, target })
const chain = (ids: string[]) => ids.slice(1).map((t, i) => e(ids[i], t))
const ALL: Trigger['channels'] = ['chat', 'form', 'email']
const btn = (text: string, variable: string, opts: [string, string][]): StepConfig => ({ text, kind: 'buttons', variable, options: opts.map(([id, label]) => ({ id, label })) })

// Email + code verification on chat; skipped on email and contact form where the sender is known (REQ-834).
const verify = (p: string, next: string): { steps: Step[]; edges: Edge[] } => ({
  steps: [
    s(`${p}-v1`, 'ask', { text: 'What email did you use for your order?', kind: 'email', variable: 'email', validation: "That doesn't look like an email address." }),
    s(`${p}-v2`, 'send_code', { text: "We've sent a 6-digit code to {{email}}. It expires in 10 minutes." }),
    s(`${p}-v3`, 'check_code', { attempts: 3, wrongText: "That code didn't match. {{tries_left_text}}" }),
    s(`${p}-vh`, 'handover', { team: 'Support', tag: 'verification-failed', note: 'Customer failed email verification 3 times.' }),
  ],
  edges: [e(`${p}-v1`, `${p}-v2`), e(`${p}-v2`, `${p}-v3`), e(`${p}-v3`, next, 'ok'), e(`${p}-v3`, `${p}-vh`, 'fail')],
})
const def = (name: string, description: string, trigger: Trigger, steps: Step[], edges: Edge[]): WorkflowSnapshot => tidy({ name, description, trigger, steps, edges })

export function orderTracking(variant = 3): WorkflowSnapshot {
  return def('Order tracking', 'Verifies the customer by email code, then shows their latest orders and tracking.',
    { intent: 'Order status', phrases: ['where is my order', 'tracking number', 'has my order shipped'], channels: ALL, quickReply: 'Track my order' },
    [
      s('ot-1', 'message', { text: variant === 1 ? 'Hi! I can help you track your order.' : 'Happy to help you track your order.' }),
      s('ot-2', 'ask', { text: 'What email did you use for your order?', kind: 'email', variable: 'email', validation: "That doesn't look like an email address." }),
      s('ot-3', 'condition', { condVar: 'channel', op: 'is', condValue: 'chat', yesLabel: 'Channel is Chat', noLabel: 'Email or Contact form' }),
      s('ot-4', 'send_code', { text: "We've sent a 6-digit code to {{email}}. It expires in 10 minutes." }),
      s('ot-5', 'check_code', { attempts: 3, wrongText: "That code didn't match. {{tries_left_text}}" }),
      s('ot-6', 'handover', { team: 'Support', tag: 'verification-failed', note: 'Customer failed email verification 3 times.' }),
      s('ot-7', 'find_orders', { variable: 'email' }),
      s('ot-8', 'condition', { condVar: 'orders.count', op: 'gt', condValue: '0', yesLabel: 'Orders found', noLabel: 'Otherwise' }),
      s('ot-9', 'show_orders', { limit: 3 }),
      s('ot-10', 'ask', btn('Anything else I can help with?', 'anything_else', [['done', "That's all"], ['person', 'Talk to a person']])),
      s('ot-11', 'end', { csat: true }),
      s('ot-12', 'handover', { team: 'Support', note: 'Customer asked for a person during order tracking.' }),
      ...(variant >= 3 ? [s('ot-13', 'ask', btn("I couldn't find any orders for {{email}}.", 'no_orders_choice', [['retry', 'Try another email'], ['person', 'Talk to a person']]))] : []),
    ],
    [
      ...chain(['ot-1', 'ot-2', 'ot-3']), e('trigger', 'ot-1'), e('ot-3', 'ot-4', 'yes'), e('ot-3', 'ot-7', 'no'), e('ot-4', 'ot-5'), e('ot-5', 'ot-7', 'ok'), e('ot-5', 'ot-6', 'fail'), e('ot-7', 'ot-8'),
      e('ot-8', 'ot-9', 'yes'), e('ot-8', variant >= 3 ? 'ot-13' : 'ot-12', 'no'), e('ot-9', 'ot-10'), e('ot-10', 'ot-11', 'done'), e('ot-10', 'ot-12', 'person'),
      ...(variant >= 3 ? [e('ot-13', 'ot-2', 'retry'), e('ot-13', 'ot-12', 'person')] : []),
    ])
}

function startReturn(): WorkflowSnapshot {
  const v = verify('rt', 'rt-4')
  return def('Start a return (Loop)', 'Verifies the customer, picks a delivered order and items, then starts a Loop return with a label.',
    { intent: 'Start a return', phrases: ['start a return', 'return my hat', 'send it back', 'exchange'], channels: ALL, quickReply: 'Start a return' },
    [
      s('rt-1', 'message', { text: "Happy to help with a return. Returns are free within 30 days of delivery." }), ...v.steps,
      s('rt-4', 'pick_order', { text: 'Which order would you like to return from?', orderFilter: 'delivered', withinDays: 30, noneText: "I don't see an order delivered in the last 30 days." }),
      s('rt-n', 'ask', btn('Would you like to talk to the team?', 'none_choice', [['person', 'Talk to a person'], ['done', "That's all"]])),
      s('rt-5', 'pick_items', { text: 'Which item would you like to return?' }),
      s('rt-6', 'ask', btn("What's the reason for the return?", 'reason', [['small', 'Too small'], ['big', 'Too big'], ['mind', 'Changed my mind'], ['damaged', 'Arrived damaged']])),
      s('rt-dmg', 'run_workflow', { workflowId: 'wf-damaged' }),
      s('rt-7', 'ask', btn('How would you like your refund?', 'refund_method', [['orig', 'Original payment'], ['credit', 'Store credit']])),
      s('rt-8', 'start_return', {}),
      s('rt-9', 'message', { text: 'Your return {{rma}} is started for {{item}}. Print the label and drop the parcel at any UPS location.', linkLabel: 'Download return label', linkUrl: 'https://returns.goorin.com/label/{{rma}}' }),
      s('rt-10', 'send_email', { subject: 'Your Goorin return {{rma}}', body: 'Hi,\n\nYour return {{rma}} for {{item}} is started. Refund method: {{refund_method}}. Your prepaid label: https://returns.goorin.com/label/{{rma}}\n\nGoorin Bros.' }),
      s('rt-11', 'end', { csat: true }),
      s('rt-h', 'handover', { team: 'Returns', note: 'Return could not be started automatically.' }),
    ],
    [e('trigger', 'rt-1'), e('rt-1', 'rt-v1'), ...v.edges, e('rt-4', 'rt-5'), e('rt-4', 'rt-n', 'none'), e('rt-n', 'rt-h', 'person'), e('rt-n', 'rt-11', 'done'), e('rt-5', 'rt-6'),
      e('rt-6', 'rt-7', 'small'), e('rt-6', 'rt-7', 'big'), e('rt-6', 'rt-7', 'mind'), e('rt-6', 'rt-dmg', 'damaged'), e('rt-7', 'rt-8', 'orig'), e('rt-7', 'rt-8', 'credit'),
      e('rt-8', 'rt-9'), e('rt-8', 'rt-h', 'failed'), e('rt-9', 'rt-10'), e('rt-10', 'rt-11')])
}

function changeAddress(): WorkflowSnapshot {
  const v = verify('ad', 'ad-4')
  return def('Change shipping address', 'Updates the address on unfulfilled orders, or hands over if the order already shipped.',
    { intent: 'Change address', phrases: ['change my address', 'wrong address', 'update shipping address'], channels: ALL, quickReply: null },
    [
      ...v.steps,
      s('ad-4', 'pick_order', { text: 'Which order should ship somewhere else?', orderFilter: 'any', noneText: "I couldn't find any orders for {{email}}." }),
      s('ad-5', 'condition', { condVar: 'order.fulfilled', op: 'is', condValue: 'true', yesLabel: 'Already shipped', noLabel: 'Not shipped yet' }),
      s('ad-6', 'address_form', { text: "What's the new shipping address?" }),
      s('ad-7', 'update_address', {}),
      s('ad-8', 'message', { text: 'Done. {{order.number}} will now ship to {{new_address}}.' }),
      s('ad-9', 'end', { csat: true }),
      s('ad-shipped', 'message', { text: "This order has already shipped, so I can't change the address. I'll pass you to the team." }),
      s('ad-h', 'handover', { team: 'Support', tag: 'address-change', note: 'Customer wants a new address on {{order.number}}.' }),
    ],
    [e('trigger', 'ad-v1'), ...v.edges, e('ad-4', 'ad-5'), e('ad-4', 'ad-h', 'none'), e('ad-5', 'ad-shipped', 'yes'), e('ad-5', 'ad-6', 'no'), e('ad-shipped', 'ad-h'), e('ad-6', 'ad-7'), e('ad-7', 'ad-8'), e('ad-7', 'ad-h', 'failed'), e('ad-8', 'ad-9')])
}

function cancelOrder(): WorkflowSnapshot {
  const v = verify('cx', 'cx-4')
  return def('Cancel an order', 'Cancels unfulfilled orders and refunds the total; shipped orders go to Start a return.',
    { intent: 'Cancel order', phrases: ['cancel my order', 'cancel an order', 'cancel / edit my order', 'can i cancel'], channels: ALL, quickReply: null },
    [
      ...v.steps,
      s('cx-4', 'pick_order', { text: 'Which order would you like to cancel?', orderFilter: 'any', noneText: "I couldn't find any orders for {{email}}." }),
      s('cx-5', 'condition', { condVar: 'order.fulfilled', op: 'is', condValue: 'true', yesLabel: 'Already shipped', noLabel: 'Not shipped yet' }),
      s('cx-6', 'ask', btn('Cancel {{order.number}} ({{order.items}})?', 'confirm', [['yes', 'Yes, cancel it'], ['keep', 'Keep my order']])),
      s('cx-7', 'cancel_order', {}),
      s('cx-8', 'message', { text: 'Order {{order.number}} is cancelled. {{refund.total}} will go back to your original payment in 5–10 business days.' }),
      s('cx-keep', 'message', { text: 'No problem, {{order.number}} stays as it is.' }),
      s('cx-end', 'end', { csat: true }),
      s('cx-shipped', 'message', { text: 'This order has already shipped. I can start a return for you instead.' }),
      s('cx-ret', 'run_workflow', { workflowId: 'wf-return' }),
      s('cx-h', 'handover', { team: 'Support', note: 'Cancellation failed in Shopify for {{order.number}}.' }),
    ],
    [e('trigger', 'cx-v1'), ...v.edges, e('cx-4', 'cx-5'), e('cx-4', 'cx-h', 'none'), e('cx-5', 'cx-shipped', 'yes'), e('cx-5', 'cx-6', 'no'), e('cx-shipped', 'cx-ret'), e('cx-6', 'cx-7', 'yes'), e('cx-6', 'cx-keep', 'keep'), e('cx-keep', 'cx-end'),
      e('cx-7', 'cx-8'), e('cx-7', 'cx-h', 'failed'), e('cx-8', 'cx-end')])
}

export function damagedClaim(variant = 2): WorkflowSnapshot {
  const v = verify('dm', 'dm-4')
  return def('Damaged item claim', 'Collects photos, then sends a replacement or refunds within the auto-refund limit.',
    { intent: 'Damaged item', phrases: ['arrived damaged', 'it is broken', "it's broken", 'crushed', 'damaged'], channels: ALL, quickReply: null },
    [
      s('dm-1', 'message', { text: "I'm sorry it arrived damaged. Let's sort it out." }), ...v.steps,
      s('dm-4', 'pick_order', { text: 'Which order was damaged?', orderFilter: 'any', noneText: "I couldn't find any orders for {{email}}." }),
      s('dm-5', 'pick_items', { text: 'Which item arrived damaged?' }),
      ...(variant >= 2 ? [s('dm-6', 'upload_photos', { text: 'Please add 1–3 photos of the damage (jpg or png, up to 10MB).', minPhotos: 1, maxPhotos: 3, required: true })] : []),
      s('dm-7', 'ask', btn('Would you like a replacement or a refund?', 'remedy', [['rep', 'Send a replacement'], ['ref', 'Refund me']])),
      s('dm-8', 'check_inventory', {}),
      s('dm-9', 'create_replacement', {}),
      s('dm-10', 'add_tag', { tag: 'damaged' }),
      s('dm-11', 'message', { text: 'Your replacement {{replacement}} is on its way. No need to send the damaged one back.' }),
      s('dm-oos', 'ask', btn('Sorry, {{item}} is out of stock right now. Would you like a refund instead?', 'oos_choice', [['ref2', 'Refund me'], ['person', 'Talk to a person']])),
      s('dm-12', 'issue_refund', { amountMode: 'items' }),
      s('dm-13', 'message', { text: 'Done. {{refund.amount}} is on its way back to your original payment.' }),
      s('dm-end', 'end', { csat: true }),
      s('dm-appr', 'handover', { team: 'Returns', tag: 'damaged', note: 'Refund {{refund.amount}} above $75 limit, photos attached' }),
      s('dm-h', 'handover', { team: 'Returns', tag: 'damaged', note: 'Damaged item claim needs a person.' }),
    ],
    [e('trigger', 'dm-1'), e('dm-1', 'dm-v1'), ...v.edges, e('dm-4', 'dm-5'), e('dm-4', 'dm-h', 'none'), ...(variant >= 2 ? [e('dm-5', 'dm-6'), e('dm-6', 'dm-7')] : [e('dm-5', 'dm-7')]),
      e('dm-7', 'dm-8', 'rep'), e('dm-7', 'dm-12', 'ref'), e('dm-8', 'dm-9'), e('dm-8', 'dm-oos', 'out'), e('dm-9', 'dm-10'), e('dm-9', 'dm-h', 'failed'), e('dm-10', 'dm-11'), e('dm-11', 'dm-end'),
      e('dm-oos', 'dm-12', 'ref2'), e('dm-oos', 'dm-h', 'person'), e('dm-12', 'dm-13'), e('dm-12', 'dm-appr', 'approval'), e('dm-12', 'dm-h', 'failed'), e('dm-13', 'dm-end')])
}

function wholesale(): WorkflowSnapshot {
  return def('Wholesale inquiry', 'Qualifies wholesale leads, tags them and hands them to the Wholesale team.',
    { intent: 'Wholesale', phrases: ['wholesale', 'stock your hats', 'bulk order', 'wholesale inquiry'], channels: ALL, quickReply: null },
    [
      s('ws-1', 'ask', { text: "What's your business name?", kind: 'text', variable: 'business' }),
      s('ws-2', 'ask', { text: "What's your store URL?", kind: 'text', variable: 'store_url', validation: 'Please enter a valid store URL, like bellandbrim.com.' }),
      s('ws-3', 'ask', { text: 'Where are you located?', kind: 'text', variable: 'location' }),
      s('ws-4', 'ask', btn('Roughly how many units a month?', 'volume', [['v1', 'Under 50'], ['v2', '50–200'], ['v3', '200+']])),
      s('ws-e', 'ask', { text: 'What email should the Wholesale team reply to?', kind: 'email', variable: 'email', validation: "That doesn't look like an email address." }),
      s('ws-5', 'add_tag', { tag: 'wholesale' }),
      s('ws-6', 'send_email', { subject: 'Thanks for your wholesale inquiry', body: 'Hi,\n\nThanks for reaching out about stocking Goorin at {{business}}. Our Wholesale team will reply within 2 business days with our line sheet and terms.\n\nGoorin Bros. Wholesale' }),
      s('ws-7', 'handover', { team: 'Wholesale', tag: 'wholesale', note: '{{business}} · {{store_url}} · {{location}} · {{volume}} units/month' }),
    ],
    [e('trigger', 'ws-1'), ...chain(['ws-1', 'ws-2', 'ws-3']), e('ws-3', 'ws-4'), e('ws-4', 'ws-e', 'v1'), e('ws-4', 'ws-e', 'v2'), e('ws-4', 'ws-e', 'v3'), ...chain(['ws-e', 'ws-5', 'ws-6', 'ws-7'])])
}

function hatSize(): WorkflowSnapshot {
  const rec = (id: string, size: string) => s(id, 'message', { text: `Size ${size} fits you best.`, linkLabel: `Shop hats in ${size}`, linkUrl: `https://goorin.com/collections/hats?size=${size}` })
  return def('Hat size finder', 'Recommends S, M, L or XL from head circumference with a shop link.',
    { intent: 'Sizing help', phrases: ['what size am i', 'what size', 'hat size', 'will it fit'], channels: ['chat'], quickReply: 'Find my size' },
    [
      s('hs-1', 'ask', { text: "What's your head circumference? Reply in cm or inches, e.g. 57 cm or 22.5 in.", kind: 'number', variable: 'head_cm', helpLabel: "I don't know", helpText: 'Wrap a soft tape around your head just above your ears and eyebrows, where a hat sits. Note the number, then send it here.' }),
      s('hs-2', 'condition', { condVar: 'head_cm', op: 'lt', condValue: '56', yesLabel: 'Under 56 cm', noLabel: '56 cm or more' }),
      s('hs-3', 'condition', { condVar: 'head_cm', op: 'lt', condValue: '58', yesLabel: '56–57 cm', noLabel: '58 cm or more' }),
      s('hs-4', 'condition', { condVar: 'head_cm', op: 'lt', condValue: '60', yesLabel: '58–59 cm', noLabel: '60 cm or more' }),
      rec('hs-s', 'S'), rec('hs-m', 'M'), rec('hs-l', 'L'), rec('hs-xl', 'XL'), s('hs-end', 'end', {}),
    ],
    [e('trigger', 'hs-1'), e('hs-1', 'hs-2'), e('hs-2', 'hs-s', 'yes'), e('hs-2', 'hs-3', 'no'), e('hs-3', 'hs-m', 'yes'), e('hs-3', 'hs-4', 'no'), e('hs-4', 'hs-l', 'yes'), e('hs-4', 'hs-xl', 'no'),
      e('hs-s', 'hs-end'), e('hs-m', 'hs-end'), e('hs-l', 'hs-end'), e('hs-xl', 'hs-end')])
}

function restock(): WorkflowSnapshot {
  return def('Friday Drops & restock alerts', 'Signs customers up for Friday Drops or a product restock email.',
    { intent: 'Restock alert', phrases: ['friday drop', 'back in stock', 'restock', 'notify me'], channels: ['chat'], quickReply: null },
    [
      s('rs-1', 'ask', btn('What would you like to hear about?', 'alert_type', [['drops', 'Friday Drops'], ['restock', 'A product restock']])),
      s('rs-2', 'ask', { text: 'Which product and size?', kind: 'text', variable: 'product' }),
      s('rs-3', 'ask', { text: 'What email should we use?', kind: 'email', variable: 'email', validation: "That doesn't look like an email address." }),
      s('rs-4', 'consent', { text: 'Email me about Goorin drops and restocks.' }),
      s('rs-5', 'add_to_list', { listId: '' }),
      s('rs-6', 'message', { text: "You're on the list. We'll email you when it drops." }),
      s('rs-end', 'end', {}),
    ],
    [e('trigger', 'rs-1'), e('rs-1', 'rs-3', 'drops'), e('rs-1', 'rs-2', 'restock'), ...chain(['rs-2', 'rs-3', 'rs-4', 'rs-5', 'rs-6', 'rs-end'])])
}

const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString()
const V = (n: number, by: string, h: number, note: string, snap: WorkflowSnapshot) => ({ n, by, at: ago(h), note, snap })
const seed = (id: string, status: Workflow['status'], editedH: number, versions: ReturnType<typeof V>[]): Workflow => {
  const live = versions[versions.length - 1]?.snap ?? null
  return { id, status, runs7d: 0, completedPct: null, handedPct: null, editedAt: ago(editedH), editedBy: versions[versions.length - 1]?.by ?? 'Ava Martinez', ...structuredClone(live!), published: live, versions }
}

export const workflows: Workflow[] = [
  seed('wf-order-tracking', 'active', 26, [V(1, 'Ava Martinez', 24 * 40, 'First version', orderTracking(1)), V(2, 'Sam Okafor', 24 * 18, 'Friendlier opener', orderTracking(2)), V(3, 'Ava Martinez', 26, 'Offer another email when no orders are found', orderTracking(3))]),
  seed('wf-return', 'active', 24 * 6, [V(1, 'Ava Martinez', 24 * 6, 'First version', startReturn())]),
  seed('wf-address', 'active', 24 * 9, [V(1, 'Sam Okafor', 24 * 9, 'First version', changeAddress())]),
  seed('wf-cancel', 'active', 24 * 5, [V(1, 'Ava Martinez', 24 * 5, 'First version', cancelOrder())]),
  seed('wf-damaged', 'active', 24 * 3, [V(1, 'Ava Martinez', 24 * 12, 'First version', damagedClaim(1)), V(2, 'Ava Martinez', 24 * 3, 'Require photos before a remedy', damagedClaim(2))]),
  seed('wf-wholesale', 'active', 24 * 11, [V(1, 'Priya Shah', 24 * 11, 'First version', wholesale())]),
  seed('wf-size', 'active', 24 * 8, [V(1, 'Sam Okafor', 24 * 8, 'First version', hatSize())]),
  seed('wf-restock', 'off', 24 * 2, [V(1, 'Ava Martinez', 24 * 2, 'First version, waiting for an email list', restock())]),
]

// Seeded run history (REQ-850..852). Deterministic; `reach` is the index of the last main-path step the run got to.
export const MAIN_PATH: Record<string, string[]> = {
  'wf-order-tracking': ['ot-1', 'ot-2', 'ot-3', 'ot-4', 'ot-5', 'ot-7', 'ot-8', 'ot-9', 'ot-10', 'ot-11'],
  'wf-return': ['rt-1', 'rt-v1', 'rt-v2', 'rt-v3', 'rt-4', 'rt-5', 'rt-6', 'rt-7', 'rt-8', 'rt-9', 'rt-11'],
  'wf-address': ['ad-v1', 'ad-v2', 'ad-v3', 'ad-4', 'ad-5', 'ad-6', 'ad-7', 'ad-8', 'ad-9'],
  'wf-cancel': ['cx-v1', 'cx-v2', 'cx-v3', 'cx-4', 'cx-6', 'cx-7', 'cx-8', 'cx-end'],
  'wf-damaged': ['dm-1', 'dm-v1', 'dm-v2', 'dm-v3', 'dm-4', 'dm-5', 'dm-6', 'dm-7', 'dm-12', 'dm-13', 'dm-end'],
  'wf-wholesale': ['ws-1', 'ws-2', 'ws-3', 'ws-4', 'ws-e', 'ws-5', 'ws-6', 'ws-7'],
  'wf-size': ['hs-1', 'hs-2', 'hs-m', 'hs-end'],
  'wf-restock': [],
}
const HAND: Record<string, string> = { 'wf-order-tracking': 'ot-12', 'wf-return': 'rt-h', 'wf-address': 'ad-h', 'wf-cancel': 'cx-h', 'wf-damaged': 'dm-appr', 'wf-wholesale': 'ws-7', 'wf-size': 'hs-end', 'wf-restock': '' }
const PLAN: [string, number, number, [number, number, number]][] = [
  ['wf-order-tracking', 214, 860, [0.86, 0.09, 0.04]], ['wf-return', 46, 182, [0.78, 0.12, 0.08]], ['wf-address', 18, 71, [0.61, 0.33, 0.04]], ['wf-cancel', 23, 94, [0.74, 0.12, 0.11]],
  ['wf-damaged', 12, 47, [0.5, 0.42, 0.05]], ['wf-wholesale', 6, 24, [0, 0.83, 0.17]], ['wf-size', 58, 236, [0.91, 0, 0.09]],
]
const NAMES = ['margaret', 'theo', 'lena', 'hannah', 'dev', 'priya', 'omar', 'julia', 'kenji', 'rosa', 'ben', 'ivy']
const CH: WorkflowChannel[] = ['chat', 'chat', 'chat', 'email', 'form']
let r = 7
const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647)

export const workflowRuns: Omit<WorkflowRun, 'timeline'>[] = [...PLAN.flatMap(([wid, n7, n30, [pc, ph, pd]]) => {
  const path = MAIN_PATH[wid]
  const ver = workflows.find((w) => w.id === wid)!.versions.length
  return Array.from({ length: n30 }, (_, i): Omit<WorkflowRun, 'timeline'> => {
    const recent = i < n7
    const hrs = recent ? 1 + (i / n7) * 166 : 168 + ((i - n7) / (n30 - n7)) * 550
    const x = (i * 0.6180339) % 1
    const outcome: RunOutcome = x < pc ? 'completed' : x < pc + ph ? 'handed' : x < pc + ph + pd ? 'dropped' : 'failed'
    const reach = outcome === 'completed' ? path.length - 1 : outcome === 'dropped' ? 1 + Math.floor(rnd() * (path.length - 2)) : Math.max(2, path.length - 3 - Math.floor(rnd() * 2))
    const lastStep = outcome === 'handed' ? HAND[wid] : path[reach]
    return { id: `run-${wid.slice(3)}-${i + 1}`, workflowId: wid, at: ago(hrs), customer: `${NAMES[i % NAMES.length][0]}•••@example.com`, channel: CH[i % CH.length], outcome, lastStep, reach, durationSec: 40 + Math.round(rnd() * 260), version: hrs > 24 * 18 && wid === 'wf-order-tracking' ? 2 : ver }
  })
})
].concat([
  { id: 'run-damaged-gb1076', workflowId: 'wf-damaged', at: ago(30), customer: 'm•••@example.com', channel: 'chat', outcome: 'handed', lastStep: 'dm-appr', reach: 8, durationSec: 212, version: 2, ticketId: 'GB-1076', note: 'Refund $148.00 above $75 limit' },
  { id: 'run-order-tracking-gb1077', workflowId: 'wf-order-tracking', at: ago(20), customer: 'a•••@example.com', channel: 'email', outcome: 'completed', lastStep: 'ot-11', reach: 9, durationSec: 64, version: 3, ticketId: 'GB-1077' },
])
