import type { RunOrder, Workflow, WorkflowRun, WorkflowSnapshot } from '@/types'
import { request, ApiError } from './client'
import { db } from './db'
import { MAIN_PATH, workflowRuns } from '@/mocks/workflows'
import { STEP_LABEL, matchesTrigger, validate } from '@/lib/workflowGraph'

// MOCKED process automations (Phases 13 + 16). In-memory; resets on reload.
// steps/edges/trigger on a Workflow are the working copy (the draft); `published` is what runs live (REQ-842).
const now = () => new Date().toISOString()
const uid = () => `wf-${Math.random().toString(36).slice(2, 8)}`
const runs: Omit<WorkflowRun, 'timeline'>[] = structuredClone(workflowRuns)
const snap = (w: WorkflowSnapshot): WorkflowSnapshot => structuredClone({ name: w.name, description: w.description, trigger: w.trigger, steps: w.steps, edges: w.edges })
const same = (a: WorkflowSnapshot, b: WorkflowSnapshot) => JSON.stringify({ ...snap(a), name: '' }) === JSON.stringify({ ...snap(b), name: '' })
export const hasDraft = (w: Workflow) => !w.published || !same(w, w.published)
export const liveVersion = (w: Workflow) => w.versions.length
export const setupIssues = (w: Workflow) => validate(w.published ?? w)
const DAY = 864e5
const inRange = (at: string, days: number) => Date.now() - new Date(at).getTime() <= days * DAY

export function runStats(id: string, days = 7) {
  const list = runs.filter((r) => r.workflowId === id && inRange(r.at, days))
  const c = (o: WorkflowRun['outcome']) => list.filter((r) => r.outcome === o).length
  return { runs: list.length, completed: c('completed'), handed: c('handed'), dropped: c('dropped'), failed: c('failed') }
}
const withStats = (w: Workflow): Workflow => {
  const s = runStats(w.id)
  return { ...w, runs7d: s.runs, completedPct: s.runs ? Math.round((s.completed / s.runs) * 100) : null, handedPct: s.runs ? Math.round((s.handed / s.runs) * 100) : null }
}

// GET /api/workflows (list order = run priority)
export const listWorkflows = () => request(() => db.workflows.map(withStats), { empty: () => [] })

// GET /api/workflows/:id
export const getWorkflow = (id: string) => request(() => { const w = db.workflows.find((x) => x.id === id); return w ? withStats(structuredClone(w)) : null })

// POST /api/workflows: a blank, never-published draft (REQ-828).
export const createWorkflow = (by: string) =>
  request(() => {
    const wf: Workflow = { id: uid(), status: 'off', runs7d: 0, completedPct: null, handedPct: null, editedAt: now(), editedBy: by, name: 'Untitled workflow', description: '', trigger: { intent: '', phrases: [], channels: ['chat'], quickReply: null }, steps: [], edges: [], published: null, versions: [] }
    db.workflows.push(wf)
    return wf
  })

// PUT /api/workflows/:id/draft: edits always go to the draft; live keeps running the published version.
export const saveWorkflow = (wf: Workflow, by: string) =>
  request(() => {
    const cur = db.workflows.find((w) => w.id === wf.id)!
    Object.assign(cur, snap(wf), { editedAt: now(), editedBy: by })
    return withStats(structuredClone(cur))
  })

// POST /api/workflows/:id/publish { note }: blocked while the draft has issues (REQ-844, REQ-845).
export const publishWorkflow = (wf: Workflow, note: string, by: string) =>
  request(() => {
    const n = validate(wf).length
    if (n) throw new ApiError(`Fix ${n} issue${n === 1 ? '' : 's'} before publishing.`, 422)
    const cur = db.workflows.find((w) => w.id === wf.id)!
    Object.assign(cur, snap(wf), { editedAt: now(), editedBy: by })
    cur.published = snap(wf)
    cur.versions = [...cur.versions, { n: cur.versions.length + 1, by, at: now(), note: note.trim() || 'No note', snap: snap(wf) }]
    return withStats(structuredClone(cur))
  })

// POST /api/workflows/:id/discard-draft
export const discardDraft = (id: string) => request(() => { const cur = db.workflows.find((w) => w.id === id)!; if (cur.published) Object.assign(cur, snap(cur.published)); return withStats(structuredClone(cur)) })

// POST /api/workflows/:id/versions/:n/restore: creates a draft equal to that version (REQ-849).
export const restoreVersion = (id: string, n: number, by: string) =>
  request(() => { const cur = db.workflows.find((w) => w.id === id)!; const v = cur.versions.find((x) => x.n === n)!; Object.assign(cur, snap(v.snap), { editedAt: now(), editedBy: by }); return withStats(structuredClone(cur)) })

// "+2 steps, 1 changed" against the previous version.
export function changeSummary(w: Workflow, n: number) {
  const v = w.versions.find((x) => x.n === n)!
  const prev = w.versions.find((x) => x.n === n - 1)
  if (!prev) return `${v.snap.steps.length} steps`
  const ids = new Set(prev.snap.steps.map((s) => s.id))
  const added = v.snap.steps.filter((s) => !ids.has(s.id)).length
  const removed = prev.snap.steps.filter((s) => !v.snap.steps.some((x) => x.id === s.id)).length
  const changed = v.snap.steps.filter((s) => { const p = prev.snap.steps.find((x) => x.id === s.id); return p && JSON.stringify([p.type, p.config]) !== JSON.stringify([s.type, s.config]) }).length
  const out = [added && `+${added} step${added === 1 ? '' : 's'}`, removed && `−${removed} step${removed === 1 ? '' : 's'}`, changed && `${changed} changed`].filter(Boolean)
  return out.length ? out.join(', ') : 'Paths changed'
}

// POST /api/workflows/:id/status: needs a published version without issues (REQ-830, REQ-847).
export const setStatus = (id: string, status: Workflow['status'], by: string) =>
  request(() => {
    const wf = db.workflows.find((w) => w.id === id)
    if (!wf) throw new ApiError('Workflow not found', 404)
    if (status === 'active' && !wf.published) throw new ApiError('Publish this workflow before turning it on.', 422)
    const n = setupIssues(wf).length
    if (status === 'active' && n) throw new ApiError(`Fix ${n} issue${n === 1 ? '' : 's'} before turning this on.`, 422)
    Object.assign(wf, { status, editedAt: now(), editedBy: by })
    return withStats(structuredClone(wf))
  })

export const duplicateWorkflow = (id: string, by: string) =>
  request(() => {
    const src = db.workflows.find((w) => w.id === id)!
    const copy: Workflow = { ...structuredClone(src), id: uid(), name: `${src.name} (copy)`, status: 'off', published: null, versions: [], editedAt: now(), editedBy: by }
    db.workflows.splice(db.workflows.indexOf(src) + 1, 0, copy)
    return copy
  })

export const renameWorkflow = (id: string, name: string, by: string) => request(() => { const wf = db.workflows.find((w) => w.id === id)!; Object.assign(wf, { name, editedAt: now(), editedBy: by }); return wf })

export const deleteWorkflow = (id: string) => request(() => { db.workflows = db.workflows.filter((w) => w.id !== id); return true })

// PUT /api/workflows/order
export const reorderWorkflows = (ids: string[]) => request(() => { db.workflows = ids.map((id) => db.workflows.find((w) => w.id === id)!).filter(Boolean); return db.workflows.map(withStats) })

// GET /api/workflows/:id/runs?days=  (test runs are never recorded here, REQ-854)
export const listRuns = (id: string, days: number) => request(() => runs.filter((r) => r.workflowId === id && inRange(r.at, days)).sort((a, b) => b.at.localeCompare(a.at)), { empty: () => [] })

// Step funnel: how many runs reached each main-path step (REQ-850, REQ-853).
export function funnel(id: string, days: number) {
  const w = db.workflows.find((x) => x.id === id)
  const path = MAIN_PATH[id] ?? []
  const list = runs.filter((r) => r.workflowId === id && inRange(r.at, days))
  return path.map((stepId, i) => ({ stepId, label: w?.steps.find((s) => s.id === stepId) ? STEP_LABEL[w.steps.find((s) => s.id === stepId)!.type] : stepId, reached: list.filter((r) => r.reach >= i).length }))
}

const DETAIL: Record<string, (r: Omit<WorkflowRun, 'timeline'>) => string> = {
  ask: (r) => `Answered by ${r.customer}`, send_code: () => 'Code sent: ••••••', check_code: () => 'Code ••••••: verified', pick_order: (r) => (r.ticketId === 'GB-1076' ? 'Picked #GB20398 · $148.00' : 'Picked an order'),
  pick_items: (r) => (r.ticketId === 'GB-1076' ? 'Hampton Wool Fedora ×1' : 'Picked 1 item'), upload_photos: () => '2 photos (previews only)', issue_refund: (r) => (r.note ? `Needs approval: ${r.note}` : 'Refunded within the limit'),
}
// GET /api/workflow-runs/:id: timeline with masked email and code (REQ-851).
export const getRun = (runId: string) =>
  request(() => {
    const r = runs.find((x) => x.id === runId)
    if (!r) return null
    const w = db.workflows.find((x) => x.id === r.workflowId)!
    const path = (MAIN_PATH[r.workflowId] ?? []).slice(0, r.reach + 1)
    const steps = r.outcome === 'handed' && r.lastStep && !path.includes(r.lastStep) ? [...path, r.lastStep] : path
    const timeline = steps.map((sid) => { const st = w.steps.find((s) => s.id === sid); return { stepId: sid, label: st ? STEP_LABEL[st.type] : sid, detail: st ? (st.type === 'ask' && st.config.variable !== 'email' ? (r.ticketId === 'GB-1076' && st.config.variable === 'remedy' ? 'Customer chose “Refund me”' : 'Customer answered') : DETAIL[st.type]?.(r) ?? (st.type === 'handover' ? `Handed to a person${r.note ? ` · ${r.note}` : ''}` : 'Done')) : '' } })
    return { ...r, timeline } as WorkflowRun
  })

const live = (w: Workflow): Workflow => ({ ...w, ...structuredClone(w.published!) })
// Active chat workflow whose live trigger matches the message (widget runtime, REQ-757, REQ-841). Drafts never run live.
export function activeWorkflowFor(text: string, channel: 'chat' | 'email' = 'chat'): Workflow | null {
  const w = db.workflows.find((x) => x.status === 'active' && x.published && x.published.trigger.channels.includes(channel) && matchesTrigger(x.published.trigger, text))
  return w ? live(w) : null
}
export const activeWorkflowById = (id: string) => { const w = db.workflows.find((x) => x.id === id && x.status === 'active' && x.published); return w ? live(w) : null }
export const activeOrderTracking = () => activeWorkflowById('wf-order-tracking')
// Run another workflow: live version on the widget, working copy in Test workflow.
export const resolveLive = (id: string) => activeWorkflowById(id)
export const resolveDraft = (id: string) => db.workflows.find((w) => w.id === id) ?? null
export const starterWorkflowChoices = () => db.workflows.map((w) => ({ id: w.id, name: w.name, active: w.status === 'active' }))
export const workflowName = (id: string) => db.workflows.find((w) => w.id === id)?.name

// GET /api/shopify/orders?email= (MOCKED, same data as the Inbox panel). Sync for the step runtime.
export function findOrdersByEmail(email: string): RunOrder[] {
  const c = db.customers.find((x) => x.email.toLowerCase() === email.toLowerCase())
  return (c?.orders ?? []).filter((o) => !o.isDraft).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((o) => ({
    number: o.number, date: new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), items: o.lineItems.map((l) => `${l.title}${l.quantity > 1 ? ` ×${l.quantity}` : ''}`).join(', '),
    status: o.fulfillmentStatus === 'fulfilled' || o.trackingUrl ? `Shipped${o.carrier ? ` via ${o.carrier}` : ''}` : o.fulfillmentStatus.replace('_', ' ').replace(/^./, (x) => x.toUpperCase()), total: o.total, carrier: o.carrier, trackingUrl: o.trackingUrl,
    fulfilled: o.fulfillmentStatus !== 'unfulfilled' || !!o.trackingUrl, ageDays: Math.round((Date.now() - new Date(o.createdAt).getTime()) / DAY), lineItems: o.lineItems.map((l) => ({ title: l.title, price: l.price })),
  }))
}
