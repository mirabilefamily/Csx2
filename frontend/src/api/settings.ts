import type { AiSettings, IntegrationId, IntegrationStatus, Role, TestResult, User } from '@/types'
import { isValidEmail } from '@/lib/format'
import { ApiError, request } from './client'
import { db } from './db'

const ms = () => Math.round(120 + Math.random() * 380)

// GET /api/integrations
// Shopify carries the chat widget's embed sub-status (REQ-474).
const withWidget = (i: IntegrationStatus): IntegrationStatus =>
  i.id === 'shopify' ? { ...i, widget: { embedEnabled: db.shopifyInstall.embedEnabled, lastSeenAt: db.shopifyInstall.lastSeenAt } } : i

export function listIntegrations(): Promise<IntegrationStatus[]> {
  return request(() => db.integrations.map(withWidget), { empty: () => [] })
}

// GET /api/integrations/:id
export function getIntegration(id: string): Promise<IntegrationStatus | null> {
  return request(() => { const i = db.integrations.find((x) => x.id === id); return i ? withWidget(i) : null })
}

// PATCH /api/integrations/:id/config
export function saveIntegrationConfig(id: IntegrationId, config: { model?: string }): Promise<IntegrationStatus> {
  return request(() => {
    const i = db.integrations.find((x) => x.id === id)
    if (!i) throw new ApiError('Integration not found', 404)
    if (config.model !== undefined) {
      if (!i.models?.includes(config.model)) throw new ApiError('Choose one of the available models.', 422)
      i.model = config.model
    }
    return i
  })
}

// POST /api/integrations/:id/test
export function testIntegration(id: IntegrationId): Promise<TestResult> {
  return request(() => {
    const i = db.integrations.find((x) => x.id === id)!
    if (i.status !== 'connected') return { ok: false, ms: ms(), message: `Connection failed: ${i.error}` }
    i.lastSyncAt = new Date().toISOString()
    const t = ms()
    return { ok: true, ms: t, message: `Connection OK · ${t}ms` }
  })
}

// POST /api/integrations/:id/prompt  { model, prompt }
export function testPrompt(id: 'claude' | 'grokbot', model: string, prompt: string): Promise<TestResult> {
  return request(() => {
    const i = db.integrations.find((x) => x.id === id)!
    if (i.status !== 'connected') return { ok: false, ms: ms(), message: `Request failed: ${i.error}` }
    i.model = model
    const t = 600 + Math.round(Math.random() * 900)
    return { ok: true, ms: t, message: `(${model}) Thanks for asking! Based on our guidance: ${prompt.trim().slice(0, 80) || 'your question'} — happy to help with that. Our fedoras run true to size, and exchanges are always free.` }
  })
}

// POST /api/integrations/resend/test-email  { to }
export function sendTestEmail(to: string): Promise<TestResult> {
  return request(() => {
    if (!isValidEmail(to)) throw new ApiError('Enter a valid email address.', 422)
    const r = db.integrations.find((x) => x.id === 'resend')!
    if (r.status !== 'connected') return { ok: false, ms: ms(), message: `Couldn't send: ${r.error}` }
    return { ok: true, ms: ms(), message: `Test email sent to ${to}` }
  })
}

// GET /api/settings/ai
export function getAiSettings(): Promise<AiSettings> {
  return request(() => db.aiSettings)
}

// PUT /api/settings/ai
export function saveAiSettings(s: AiSettings): Promise<AiSettings> {
  return request(() => {
    const limit = s.autoRefund.limit
    if (!(limit >= 0 && limit <= 500)) throw new ApiError('Enter an amount between $0 and $500.', 422)
    db.aiSettings = structuredClone(s)
    return db.aiSettings
  })
}

// POST /api/users/invite  { email, role }
export function inviteUser(email: string, role: Role): Promise<User> {
  return request(() => {
    const e = email.trim().toLowerCase()
    if (!isValidEmail(e)) throw new ApiError('Enter a valid email address.', 422)
    if (db.users.some((u) => u.email === e)) throw new ApiError('A user with this email already exists.', 409)
    const user: User = { id: `u-${Date.now()}`, name: e.split('@')[0].replace(/^\w/, (c) => c.toUpperCase()), email: e, role, status: 'invited', lastLoginAt: null, invitedAt: new Date().toISOString() }
    db.users.push(user)
    return user
  })
}

// POST /api/users/:id/resend-invite
export function resendInvite(id: string): Promise<User> {
  return request(() => {
    const u = db.users.find((x) => x.id === id)!
    u.invitedAt = new Date().toISOString()
    return { ...u }
  })
}

// PATCH /api/users/:id  { role?, status? }
export function updateUser(id: string, patch: Partial<Pick<User, 'role' | 'status'>>, actorId: string): Promise<User> {
  return request(() => {
    if (id === actorId) throw new ApiError("You can't change your own account", 403)
    const u = db.users.find((x) => x.id === id)!
    Object.assign(u, patch)
    return u
  })
}

// POST /api/users/:id/reset-password
export function resetPassword(id: string): Promise<{ email: string }> {
  return request(() => ({ email: db.users.find((x) => x.id === id)!.email }))
}
