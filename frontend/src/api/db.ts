import type { AIAttempt, AIDraft, Customer, FraudAlert, GuidanceArticle, LoopReturn, Message, RefundRecord, Ticket, User, Workflow } from '@/types'
import * as seed from '@/mocks'

export const CSAT_QUESTIONS_KEY = 'goorin.csatQuestions'

// Only the CSAT questions survive a reload (same tab) so the hosted survey follows CSAT Settings.
function storedCsatQuestions(): typeof seed.csatSurvey.questions | null {
  try {
    const raw = sessionStorage.getItem(CSAT_QUESTIONS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// In-memory database. Rebuilt from the seed on every page load, so edits reset on reload.
export const db = {
  users: structuredClone(seed.users) as User[],
  customers: structuredClone(seed.customers) as Customer[],
  tickets: structuredClone(seed.tickets) as Ticket[],
  messages: structuredClone(seed.messages) as Message[],
  aiAttempts: structuredClone(seed.aiAttempts) as AIAttempt[],
  aiDrafts: structuredClone(seed.aiDrafts) as AIDraft[],
  guidanceArticles: structuredClone(seed.guidanceArticles) as GuidanceArticle[],
  dailyMetrics: seed.dailyMetrics,
  csatSurvey: { ...structuredClone(seed.csatSurvey), questions: storedCsatQuestions() ?? structuredClone(seed.csatSurvey.questions) },
  csatResponses: seed.csatResponses,
  invites: seed.invites,
  integrations: structuredClone(seed.integrations),
  aiSettings: structuredClone(seed.aiSettings),
  widgetSettings: structuredClone(seed.widgetSettings),
  shopifyInstall: structuredClone(seed.shopifyInstall),
  themeEmbed: structuredClone(seed.themeEmbed),
  storeProducts: seed.storeProducts,
  surveyTokens: structuredClone(seed.surveyTokens),
  refunds: structuredClone(seed.refunds) as RefundRecord[],
  fraudAlerts: structuredClone(seed.fraudAlerts) as FraudAlert[],
  loopReturns: structuredClone(seed.loopReturns) as LoopReturn[],
  brandVoice: structuredClone(seed.brandVoice),
  contactForm: structuredClone(seed.contactForm),
  emailChannel: structuredClone(seed.emailChannel),
  notificationPrefs: structuredClone(seed.notificationPrefs),
  workflows: structuredClone(seed.workflows) as Workflow[],
}

// Keeps the ticket's fraud flag (Inbox shield + banner) in step with its open alert.
export function syncFraudFlag(ticketId: string) {
  const t = db.tickets.find((x) => x.id === ticketId)
  if (!t) return
  const a = db.fraudAlerts.find((x) => x.ticketId === ticketId && x.status === 'open')
  t.fraud = a ? { alertId: a.id, level: a.level, score: a.riskScore } : null
}
db.fraudAlerts.forEach((a) => syncFraudFlag(a.ticketId))
