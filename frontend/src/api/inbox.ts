import type { AIDraft, BulkPatch, Message, NewMessage, NewTicketInput, SessionUser, Ticket, TicketDetail, TicketPatch } from '@/types'
import { STATUS_LABELS } from '@/lib/labels'
import { isValidEmail } from '@/lib/format'
import { ApiError, request } from './client'
import { HANDOVER_REASONS } from '@/mocks/tickets'
import { db } from './db'

const PRIORITY_LABELS = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' } as const
const now = () => new Date().toISOString()
const userName = (id: string | null) => db.users.find((u) => u.id === id)?.name ?? 'Unassigned'

function detail(id: string): TicketDetail | null {
  const ticket = db.tickets.find((t) => t.id === id)
  if (!ticket) return null
  const attempts = db.aiAttempts.filter((a) => a.ticketId === id)
  const drafts = db.aiDrafts.filter((d) => d.ticketId === id)
  const ids = new Set([...attempts.flatMap((a) => a.guidanceIds), ...drafts.flatMap((d) => d.guidanceIds)])
  return {
    ticket,
    messages: db.messages.filter((m) => m.ticketId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    drafts,
    attempts,
    customer: db.customers.find((c) => c.id === ticket.customer.id) ?? null,
    pastTickets: db.tickets.filter((t) => t.customer.id === ticket.customer.id && t.id !== id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    guidanceTitles: Object.fromEntries(db.guidanceArticles.filter((a) => ids.has(a.id)).map((a) => [a.id, a.title])),
    fraudAlert: db.fraudAlerts.find((a) => a.ticketId === id && a.status === 'open') ?? db.fraudAlerts.find((a) => a.ticketId === id && a.reviewNote) ?? null,
  }
}

function addMessage(ticketId: string, m: Omit<Message, 'id' | 'ticketId' | 'createdAt'>) {
  db.messages.push({ ...m, id: `${ticketId}-m${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ticketId, createdAt: now() })
}

const system = (ticketId: string, body: string) => addMessage(ticketId, { authorType: 'system', authorName: 'System', body, isInternal: false })

function applyPatch(t: Ticket, patch: TicketPatch | BulkPatch, actor: SessionUser) {
  if (patch.status && patch.status !== t.status) {
    t.status = patch.status
    if ((patch.status === 'resolved' || patch.status === 'closed') && !t.resolvedBy) t.resolvedBy = 'human'
    if (patch.status !== 'resolved' && patch.status !== 'closed') t.resolvedBy = null
    system(t.id, `${actor.name} changed status to ${STATUS_LABELS[patch.status]}`)
  }
  if ('priority' in patch && patch.priority && patch.priority !== t.priority) {
    t.priority = patch.priority
    system(t.id, `${actor.name} changed priority to ${PRIORITY_LABELS[patch.priority]}`)
  }
  if (patch.assignee !== undefined && patch.assignee !== t.assignee) {
    t.assignee = patch.assignee
    system(t.id, patch.assignee ? `${actor.name} assigned the ticket to ${userName(patch.assignee)}` : `${actor.name} unassigned the ticket`)
  }
  if ('tags' in patch && patch.tags) t.tags = [...patch.tags]
  if ('addTag' in patch && patch.addTag && !t.tags.includes(patch.addTag)) {
    t.tags = [...t.tags, patch.addTag]
    system(t.id, `${actor.name} added tag ${patch.addTag}`)
  }
  t.updatedAt = now()
}

function mustDetail(id: string) {
  const d = detail(id)
  if (!d) throw new Error('Ticket not found')
  return d
}

// GET /api/tickets/:id/detail
export function getTicketDetail(id: string): Promise<TicketDetail | null> {
  return request(() => detail(id), { empty: () => null })
}

// PATCH /api/tickets/:id
export function updateTicket(id: string, patch: TicketPatch, actor: SessionUser): Promise<TicketDetail> {
  return request(() => {
    applyPatch(mustDetail(id).ticket, patch, actor)
    return mustDetail(id)
  })
}

// POST /api/tickets/bulk
export function bulkUpdate(ids: string[], patch: BulkPatch, actor: SessionUser): Promise<Ticket[]> {
  return request(() => {
    const targets = db.tickets.filter((t) => ids.includes(t.id))
    targets.forEach((t) => applyPatch(t, patch, actor))
    return targets
  })
}

// POST /api/tickets/:id/messages
export function sendMessage(id: string, msg: NewMessage, actor: SessionUser): Promise<TicketDetail> {
  return request(() => {
    const t = mustDetail(id).ticket
    addMessage(id, { authorType: 'agent', authorName: actor.name, body: msg.html, format: 'html', isInternal: msg.isInternal })
    if (msg.draftId) db.aiDrafts = db.aiDrafts.filter((d) => d.id !== msg.draftId)
    t.updatedAt = now()
    return mustDetail(id)
  })
}

// POST /api/tickets/:id/drafts/:draftId/approve
export function approveDraft(id: string, draftId: string, actor: SessionUser): Promise<TicketDetail> {
  return request(() => {
    const draft = db.aiDrafts.find((d) => d.id === draftId && d.ticketId === id)
    if (!draft) throw new Error('Draft not found')
    addMessage(id, { authorType: draft.tier, authorName: draft.tier === 'claude' ? 'AI' : 'Grokbot', body: draft.body, isInternal: false, approvedBy: actor.name })
    db.aiDrafts = db.aiDrafts.filter((d) => d.id !== draftId)
    mustDetail(id).ticket.updatedAt = now()
    return mustDetail(id)
  })
}

export const HANDLED_BY_AI_TODAY = 128
const AI_NAME = (t: Ticket) => (t.status === 'grok_handling' ? 'Grokbot' : 'AI')

// POST /api/tickets/:id/take-over
export function takeOver(id: string, actor: SessionUser): Promise<TicketDetail> {
  return request(() => {
    const t = mustDetail(id).ticket
    const ai = t.resolvedBy === 'grokbot' ? 'Grokbot' : AI_NAME(t)
    t.status = 'needs_human'
    t.assignee = actor.id
    t.handoverReason = t.handoverReason ?? `${actor.name} took over from ${ai}`
    t.updatedAt = now()
    system(id, `${actor.name} took over from ${ai}`)
    return mustDetail(id)
  })
}

// POST /api/tickets/:id/hand-back  { html? }  sends the reply (if any) then returns the ticket to the AI
export function handBack(id: string, actor: SessionUser, reply?: { html: string; draftId?: string }): Promise<TicketDetail> {
  return request(() => {
    const t = mustDetail(id).ticket
    if (reply) addMessage(id, { authorType: 'agent', authorName: actor.name, body: reply.html, format: 'html', isInternal: false })
    if (reply?.draftId) db.aiDrafts = db.aiDrafts.filter((d) => d.id !== reply.draftId)
    t.status = 'ai_handling'
    t.updatedAt = now()
    system(id, `Handed back to AI by ${actor.name}`)
    return mustDetail(id)
  })
}

// POST /api/tickets/:id/drafts/generate (MOCKED: built from the ticket's own data)
export function generateDraft(id: string): Promise<TicketDetail> {
  return request(() => {
    const d = mustDetail(id)
    const name = d.ticket.customer.name.split(' ')[0]
    const order = d.customer?.orders[0]
    const body = `Hi ${name},\n\nThanks for your patience, and I'm sorry for the wait. I've read through your messages${order ? ` and pulled up order ${order.number}` : ''}. A member of our team is reviewing this now, and I'll follow up today with a clear answer.\n\nWarmly,\nGoorin Bros.`
    db.aiDrafts.push({ id: `dr-${Date.now()}`, ticketId: id, tier: 'claude', body, confidence: 0.71, guidanceIds: [], createdAt: now() })
    return mustDetail(id)
  })
}

// Phase 11 list enrichment: draft flag, handover reason, AI confidence.
export function enrich(t: Ticket): Ticket {
  const att = db.aiAttempts.filter((a) => a.ticketId === t.id)
  return { ...t, draftReady: db.aiDrafts.some((d) => d.ticketId === t.id), handoverReason: t.handoverReason ?? HANDOVER_REASONS[t.id] ?? null, aiConfidence: att.length ? att[att.length - 1].confidence : null }
}

// DELETE /api/tickets/:id/drafts/:draftId
export function discardDraft(id: string, draftId: string): Promise<TicketDetail> {
  return request(() => {
    db.aiDrafts = db.aiDrafts.filter((d) => d.id !== draftId)
    return mustDetail(id)
  })
}

// POST /api/tickets/:id/drafts  (restore after Undo)
export function restoreDraft(draft: AIDraft): Promise<TicketDetail> {
  return request(() => {
    if (!db.aiDrafts.some((d) => d.id === draft.id)) db.aiDrafts.push(draft)
    return mustDetail(draft.ticketId)
  })
}


// POST /api/tickets/:id/set-aside  { where: 'spam' | 'trash' | null }
export function setAside(id: string, where: 'spam' | 'trash' | null, actor: SessionUser): Promise<Ticket> {
  return request(() => {
    const t = mustDetail(id).ticket
    t.setAside = where
    t.updatedAt = now()
    system(id, where ? `${actor.name} moved the ticket to ${where === 'spam' ? 'Spam' : 'Trash'}` : `${actor.name} restored the ticket`)
    return t
  })
}

// DELETE /api/tickets/:id  (only from Trash or Spam)
export function deleteForever(id: string): Promise<{ id: string }> {
  return request(() => {
    const t = mustDetail(id).ticket
    if (!t.setAside) throw new ApiError('Move the ticket to Trash first.', 409)
    db.tickets = db.tickets.filter((x) => x.id !== id)
    db.messages = db.messages.filter((m) => m.ticketId !== id)
    return { id }
  })
}

// POST /api/tickets  { email, name?, subject, channel, body, isInternal }
export function createTicket(input: NewTicketInput, actor: SessionUser): Promise<Ticket> {
  return request(() => {
    if (!isValidEmail(input.email)) throw new ApiError('Enter a valid email address.', 422)
    if (!input.subject.trim()) throw new ApiError('Add a subject.', 422)
    const c = db.customers.find((x) => x.email.toLowerCase() === input.email.trim().toLowerCase())
    const num = Math.max(...db.tickets.map((t) => Number(t.id.slice(3)) || 0)) + 1
    const id = `GB-${num}`
    const name = c?.name ?? (input.name?.trim() || input.email.split('@')[0])
    const ticket: Ticket = {
      id, subject: input.subject.trim(), preview: input.body.slice(0, 117), channel: input.channel, status: 'open', priority: 'normal', tags: [],
      assignee: actor.id, resolvedBy: null, customer: { id: c?.id ?? `new-${num}`, name, email: input.email.trim() },
      createdAt: now(), updatedAt: now(), escalationReason: null, orderNumber: null, setAside: null,
    }
    db.tickets.unshift(ticket)
    system(id, `${actor.name} created the ticket`)
    if (input.body.trim()) addMessage(id, { authorType: 'agent', authorName: actor.name, body: input.body.trim(), isInternal: input.isInternal })
    return ticket
  })
}
