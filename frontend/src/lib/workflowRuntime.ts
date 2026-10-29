import type { RunChatMessage, RunOrder, Step, TestRun, Workflow, WorkflowChannel } from '@/types'
import { handlesOf, outEdge } from './workflowGraph'

// MOCKED runtime shared by Test workflow and the widget demo. Order details never reach chat before the code is verified (REQ-748, Q-87).
type Wf = Pick<Workflow, 'id' | 'steps' | 'edges'> & { name?: string }
export interface RuntimeDeps { findOrders: (email: string) => RunOrder[]; handoverText?: string; resolve?: (id: string) => Wf | null; refundLimit?: number }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
let seq = 0
const mid = () => `m${++seq}`
const code6 = () => String(Math.floor(100000 + Math.random() * 900000))
const money = (n: number) => `$${n.toFixed(2)}`
const ORDER_STEPS = ['pick_order', 'pick_items', 'show_orders', 'upload_photos']

function fill(text: string, vars: Record<string, unknown>) {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k: string) => (vars[k] != null ? (typeof vars[k] === 'number' && /amount|total|price|limit/.test(k) ? money(vars[k] as number) : String(vars[k])) : m))
}

export function startRun(wf: Wf, channel: WorkflowChannel, deps: RuntimeDeps, sender?: string, firstMessage?: string): TestRun {
  const run: TestRun = { workflowId: wf.id, channel, vars: { channel, 'refund.limit': deps.refundLimit ?? 75, ...(channel !== 'chat' && sender ? { email: sender } : {}) }, current: null, waitingFor: null, attempts: 0, chat: firstMessage ? [{ id: mid(), from: 'customer', text: firstMessage }] : [], inbox: [], log: [{ stepId: 'trigger', text: firstMessage ? `Trigger matched: “${firstMessage}”` : 'Trigger started', ok: true }], ended: null }
  return advance(wf, run, outEdge(wf, 'trigger', 'next')?.target ?? null, deps)
}

function bot(run: TestRun, text: string, extra: Partial<RunChatMessage> = {}) { run.chat.push({ id: mid(), from: 'bot', text, ...extra }) }
const email = (run: TestRun, subject: string, body: string) => run.inbox.unshift({ id: mid(), from: 'Goorin Bros. <support@goorin.com>', to: String(run.vars.email ?? ''), subject, body, at: new Date().toISOString() })

function sendCode(run: TestRun, st: Step) {
  const code = code6()
  run.vars.code = code
  run.vars.verified = false
  email(run, 'Your Goorin verification code', `Your verification code is ${code}. It expires in 10 minutes. If you didn't ask for this, you can ignore this email.`)
  run.log.push({ stepId: st.id, text: `Sent code email to ${run.vars.email}`, ok: true })
}

function ordersFor(run: TestRun, st: Step, deps: RuntimeDeps) {
  const c = st.config
  const all = deps.findOrders(String(run.vars.email ?? ''))
  return all.filter((o) => (c.orderFilter === 'unfulfilled' ? !o.fulfilled : c.orderFilter === 'delivered' ? o.fulfilled && (o.ageDays ?? 0) <= (c.withinDays ?? 30) : true)).slice(0, 5)
}

function advance(wf: Wf, prev: TestRun, startId: string | null, deps: RuntimeDeps): TestRun {
  const run: TestRun = structuredClone(prev)
  let id = startId
  for (let guard = 0; id && guard < 80; guard++) {
    const st = wf.steps.find((x) => x.id === id)
    if (!st) break
    run.current = st.id
    const c = st.config
    const go = (h: string) => outEdge(wf, st.id, h)?.target ?? null
    const next = () => go(handlesOf(st)[0]?.[0] ?? 'next')
    const log = (text: string, ok = true) => run.log.push({ stepId: st.id, text, ok })
    const wait = (text: string, extra: Partial<RunChatMessage> = {}) => { bot(run, fill(text, run.vars), extra); run.waitingFor = st.id; log('Waiting for the customer'); return run }
    if (run.channel === 'chat' && run.vars.verified !== true && ORDER_STEPS.includes(st.type)) {
      log('Blocked: code not verified, no order details shown', false); bot(run, 'I need to verify your email before I can share order details.'); run.ended = 'blocked'; run.current = null; return run
    }
    switch (st.type) {
      case 'message': bot(run, fill(c.text ?? '', run.vars), c.linkLabel && c.linkUrl ? { link: { label: fill(c.linkLabel, run.vars), url: fill(c.linkUrl, run.vars) } } : {}); log('Sent message'); id = next(); continue
      case 'ask':
        if (c.variable === 'email' && run.vars.email && (run.channel !== 'chat' || run.vars.verified === true)) { log(`Used the known email ${run.vars.email}`); id = next(); continue }
        return wait(c.text ?? '', c.kind === 'buttons' ? { buttons: (c.options ?? []).map((o) => o.label) } : c.helpLabel ? { buttons: [c.helpLabel] } : {})
      case 'send_code':
        if (run.channel !== 'chat' || run.vars.verified === true) { log(run.vars.verified === true ? 'Already verified' : 'Skipped: the sender is already known on email'); id = next(); continue }
        sendCode(run, st); bot(run, fill(c.text ?? '', run.vars)); id = next(); continue
      case 'check_code':
        if (run.channel !== 'chat' || run.vars.verified === true) { if (run.channel !== 'chat') run.vars.verified = true; id = go('ok'); continue }
        run.attempts = 0; run.waitingFor = st.id; return run
      case 'find_orders': {
        const orders = deps.findOrders(String(run.vars[c.variable ?? 'email'] ?? ''))
        run.vars.orders = orders; run.vars['orders.count'] = orders.length; run.vars['orders.unfulfilled'] = orders.filter((o) => !o.fulfilled).length
        if (orders[0]) { run.vars['order.number'] = orders[0].number; run.vars['order.tracking_url'] = orders[0].trackingUrl ?? '' }
        log(`Found ${orders.length} order${orders.length === 1 ? '' : 's'} for ${run.vars.email}`); id = next(); continue
      }
      case 'show_orders': {
        const orders = ((run.vars.orders as RunOrder[]) ?? []).slice(0, c.limit ?? 3)
        if (run.channel === 'chat') bot(run, `Here ${orders.length === 1 ? 'is your latest order' : `are your latest ${orders.length} orders`}:`, { orders })
        else { email(run, 'Your Goorin orders', orders.map((o) => `${o.number} · ${o.date} · ${o.items} · ${o.status}${o.trackingUrl ? ` · Track: ${o.trackingUrl}` : ''}`).join('\n')); bot(run, `I've emailed your order details to ${run.vars.email}.`) }
        log(`Showed ${orders.length} order${orders.length === 1 ? '' : 's'}`); id = next(); continue
      }
      case 'pick_order': {
        const orders = ordersFor(run, st, deps)
        run.vars.orders = orders
        if (!orders.length) { bot(run, fill(c.noneText || "I don't see a matching order.", run.vars)); log('No matching orders'); id = go('none'); continue }
        return wait(c.text || 'Which order is this about?', { orders, buttons: orders.map((o) => o.number) })
      }
      case 'pick_items': {
        const items = (run.vars['order.lineItems'] as { title: string }[]) ?? []
        return wait(c.text || 'Which items?', { buttons: items.map((i) => i.title) })
      }
      case 'address_form': return wait(`${c.text || "What's the new shipping address?"} Include street, city, state and ZIP.`)
      case 'upload_photos': return wait(c.text ?? '', { buttons: ['Attach 1 photo', 'Attach 2 photos', 'Attach 3 photos', 'Continue'] })
      case 'consent': return wait(`Please confirm: ${c.text}`, { buttons: ['I agree'] })
      case 'condition': {
        const v = c.condVar === 'channel' ? run.channel : run.vars[c.condVar ?? '']
        const n = Number(v), m = Number(c.condValue)
        const yes = c.op === 'gt' ? n > m : c.op === 'lt' ? n < m : String(v ?? '') === String(c.condValue ?? '')
        log(`${yes ? c.yesLabel : c.noLabel}`); id = go(yes ? 'yes' : 'no'); continue
      }
      case 'start_return': run.vars.rma = `#LR-${Math.floor(1000 + Math.random() * 9000)}`; log(`Loop: started return ${run.vars.rma} for ${run.vars.item ?? 'the picked items'}`); id = next(); continue
      case 'update_address': log(`Shopify: updated ${run.vars['order.number']} to ${run.vars.new_address}`); id = next(); continue
      case 'check_inventory': {
        const out = /panama/i.test(String(run.vars.item ?? ''))
        run.vars['stock.qty'] = out ? 0 : 12
        log(`Shopify: ${run.vars.item} ${out ? 'out of stock' : 'in stock (12)'}`); id = go(out ? 'out' : 'next'); continue
      }
      case 'cancel_order':
        if (run.vars['order.fulfilled'] === 'true') { log(`Shopify: ${run.vars['order.number']} already shipped, can't cancel`, false); id = go('failed'); continue }
        run.vars['refund.total'] = run.vars['order.total']; log(`Shopify: cancelled ${run.vars['order.number']}, refund ${money(Number(run.vars['order.total']))}`); id = next(); continue
      case 'create_replacement': run.vars.replacement = `#D${Math.floor(4000 + Math.random() * 900)}`; log(`Shopify: $0 replacement order ${run.vars.replacement} for ${run.vars.item}`); id = next(); continue
      case 'issue_refund': {
        const amount = c.amountMode === 'custom' ? Number(c.amount ?? 0) : Number(run.vars['item.price'] ?? run.vars['order.total'] ?? 0)
        const limit = deps.refundLimit ?? 75
        run.vars['refund.amount'] = amount
        if (amount > limit) { log(`Needs approval: refund ${money(amount)} above ${money(limit).replace('.00', '')} limit`, false); id = go('approval'); continue }
        log(`Shopify: refunded ${money(amount)} to the original payment`); id = next(); continue
      }
      case 'create_discount': run.vars.discount_code = `GOORIN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; log(`Shopify: created ${run.vars.discount_code}`); id = next(); continue
      case 'send_email': email(run, fill(c.subject ?? '', run.vars), fill(c.body ?? '', run.vars)); log(`Sent email “${fill(c.subject ?? '', run.vars)}”`); id = next(); continue
      case 'wait': log(c.waitFor === 'reply' ? 'Waited for a reply (skipped in test)' : `Waited ${c.waitMinutes ?? 60} min (skipped in test)`); id = next(); continue
      case 'add_to_list': log(`Added ${run.vars.email} to ${c.listId}`); id = next(); continue
      case 'add_tag': log(`Tagged “${c.tag}”`); run.vars.tags = [...((run.vars.tags as string[]) ?? []), c.tag]; id = next(); continue
      case 'run_workflow': {
        const sub = c.workflowId ? deps.resolve?.(c.workflowId) : null
        if (!sub) { log('The linked workflow is off or missing', false); run.ended = 'stopped'; return run }
        log(`Switched to ${sub.name ?? sub.id}`)
        run.workflowId = sub.id; run.vars.switchedTo = sub.name
        return advance(sub, run, outEdge(sub, 'trigger', 'next')?.target ?? null, deps)
      }
      case 'handover': {
        const note = fill(c.note ?? '', run.vars)
        bot(run, deps.handoverText ?? 'Test run ended: handed to a person (no real ticket created).')
        log(`Handed to a person${c.tag ? ` · tag ${c.tag}` : ''}${note ? ` · note: ${note}` : ''}`); run.ended = 'handed to a person'; run.current = st.id; return run
      }
      case 'end':
        if (c.csat) bot(run, 'Thanks! How did we do today? (1–5)')
        log('Workflow ended'); run.ended = 'completed'; return run
      default: log(`${st.type.replace('_', ' ')} (mock)`); id = next(); continue
    }
  }
  if (!run.ended && !run.waitingFor) { run.ended = 'stopped'; run.log.push({ stepId: run.current ?? 'trigger', text: 'Path stopped: no next step', ok: false }) }
  return run
}

export function replyRun(wf0: Wf, prev: TestRun, text: string, deps: RuntimeDeps): TestRun {
  if (!prev.waitingFor || prev.ended) return prev
  const wf = prev.workflowId !== wf0.id ? deps.resolve?.(prev.workflowId) ?? wf0 : wf0
  const run: TestRun = structuredClone(prev)
  const photos = Number(/Attach (\d)/.exec(text)?.[1] ?? 0)
  run.chat.push({ id: mid(), from: 'customer', text: photos ? `${photos} photo${photos === 1 ? '' : 's'} attached` : text, ...(photos ? { photos } : {}) })
  const st = wf.steps.find((x) => x.id === run.waitingFor)!
  const c = st.config
  const go = (h: string) => outEdge(wf, st.id, h)?.target ?? null
  const again = (msg: string, extra: Partial<RunChatMessage> = {}) => { bot(run, msg, extra); run.waitingFor = st.id; return run }
  run.waitingFor = null
  if (st.type === 'check_code') {
    if (/resend/i.test(text)) { sendCode(run, st); bot(run, `We've sent a new code to ${run.vars.email}. The old one no longer works.`); run.waitingFor = st.id; return run }
    if (text.trim() === run.vars.code) { run.vars.verified = true; run.log.push({ stepId: st.id, text: 'Code verified', ok: true }); return advance(wf, run, go('ok'), deps) }
    run.attempts += 1
    const left = (c.attempts ?? 3) - run.attempts
    run.log.push({ stepId: st.id, text: `Wrong code (${run.attempts}/${c.attempts ?? 3})`, ok: false })
    if (left <= 0) return advance(wf, run, go('fail'), deps)
    return again(fill(c.wrongText ?? '', { ...run.vars, tries_left: left, tries_left_text: `You have ${left} ${left === 1 ? 'try' : 'tries'} left.` }), { buttons: ['Resend code'] })
  }
  if (st.type === 'pick_order') {
    const orders = (run.vars.orders as RunOrder[]) ?? []
    const o = orders.find((x) => text.includes(x.number) || text.replace('#', '').includes(x.number.replace('#', '')))
    if (!o) return again('Please pick one of your orders.', { buttons: orders.map((x) => x.number) })
    Object.assign(run.vars, { 'order.number': o.number, 'order.total': o.total, 'order.items': o.items, 'order.fulfilled': String(!!o.fulfilled), 'order.lineItems': o.lineItems ?? [] })
    run.log.push({ stepId: st.id, text: `Picked ${o.number}`, ok: true })
    return advance(wf, run, go('next'), deps)
  }
  if (st.type === 'pick_items') {
    const items = (run.vars['order.lineItems'] as { title: string; price: number }[]) ?? []
    const it = items.find((i) => i.title.toLowerCase() === text.trim().toLowerCase()) ?? (items.length === 1 && /yes|that|this|it/i.test(text) ? items[0] : undefined)
    if (!it) return again('Please pick an item from the order.', { buttons: items.map((i) => i.title) })
    run.vars.item = it.title; run.vars['item.price'] = it.price
    run.log.push({ stepId: st.id, text: `Picked ${it.title} ×1`, ok: true })
    return advance(wf, run, go('next'), deps)
  }
  if (st.type === 'address_form') {
    if (!/\d+\s+\w+/.test(text) || !/\b\d{5}(-\d{4})?\b/.test(text)) return again('Please include the street address and a 5-digit ZIP code.')
    run.vars.new_address = text.trim()
    run.log.push({ stepId: st.id, text: 'Address validated', ok: true })
    return advance(wf, run, go('next'), deps)
  }
  if (st.type === 'upload_photos') {
    const have = Number(run.vars.photos ?? 0) + photos
    run.vars.photos = Math.min(have, c.maxPhotos ?? 3)
    if (photos) { run.log.push({ stepId: st.id, text: `${run.vars.photos} photo${run.vars.photos === 1 ? '' : 's'} uploaded (preview only)`, ok: true }); return again('Got it. Add more or tap Continue.', { buttons: ['Attach 1 photo', 'Continue'] }) }
    if (c.required !== false && have < (c.minPhotos ?? 1)) return again(`Add at least ${c.minPhotos ?? 1} photo.`, { buttons: ['Attach 1 photo', 'Attach 2 photos', 'Attach 3 photos'] })
    return advance(wf, run, go('next'), deps)
  }
  if (st.type === 'consent') {
    if (!/agree|yes/i.test(text)) return again('Please tick the box to continue.', { buttons: ['I agree'] })
    run.vars.consent = true; run.log.push({ stepId: st.id, text: 'Consent given', ok: true })
    return advance(wf, run, go('next'), deps)
  }
  if (c.kind === 'buttons') {
    const opt = (c.options ?? []).find((o) => o.label.toLowerCase() === text.trim().toLowerCase())
    if (!opt) return again('Please pick one of the options.', { buttons: (c.options ?? []).map((o) => o.label) })
    run.vars[c.variable || st.id] = opt.label
    return advance(wf, run, go(opt.id), deps)
  }
  if (c.kind === 'email' && !EMAIL_RE.test(text.trim())) return again(c.validation || "That doesn't look like an email address.")
  if (c.helpText && (/(don'?t|do not) know|not sure|no idea/i.test(text) || text.trim().toLowerCase() === (c.helpLabel ?? '').toLowerCase())) { bot(run, c.helpText); run.log.push({ stepId: st.id, text: 'Showed the help tip and asked again', ok: true }); return again(fill(c.text ?? '', run.vars), c.helpLabel ? { buttons: [c.helpLabel] } : {}) }
  if (c.kind === 'number') {
    const n = parseFloat(text.replace(',', '.'))
    if (Number.isNaN(n)) return again('Please enter a number.', c.helpLabel ? { buttons: [c.helpLabel] } : {})
    const cm = /\bin(ch(es)?)?\b|"/i.test(text) || n < 30 ? Math.round(n * 2.54) : n
    run.vars[c.variable || st.id] = c.variable === 'head_cm' ? cm : n
    run.log.push({ stepId: st.id, text: `Saved {{${c.variable}}} = ${run.vars[c.variable || st.id]}`, ok: true })
    return advance(wf, run, go('next'), deps)
  }
  if (c.validation && c.variable === 'store_url' && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(text.trim())) return again(c.validation)
  run.vars[c.variable || st.id] = c.kind === 'email' ? text.trim().toLowerCase() : text.trim()
  run.log.push({ stepId: st.id, text: `Saved {{${c.variable}}}`, ok: true })
  return advance(wf, run, go('next'), deps)
}
