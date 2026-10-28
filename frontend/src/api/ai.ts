import { BRAND_VOICE_LIMITS, type BrandVoice, type ConversationTestInput, type ReplyImpact, type TestCustomer, type TestTurn, type VoiceSample } from '@/types'
import { ApiError, request } from './client'
import { db } from './db'
import { runSandbox } from './guidance'

// GET /api/ai/brand-voice
export function getBrandVoice(): Promise<BrandVoice> {
  return request(() => db.brandVoice)
}

// PUT /api/ai/brand-voice
export function saveBrandVoice(v: BrandVoice): Promise<BrandVoice> {
  return request(() => {
    for (const [k, max] of Object.entries(BRAND_VOICE_LIMITS)) {
      if (v[k as keyof typeof BRAND_VOICE_LIMITS].length > max) throw new ApiError(`Keep this under ${max.toLocaleString()} characters.`, 422)
    }
    db.brandVoice = { ...structuredClone(v), updatedAt: new Date().toISOString() }
    return db.brandVoice
  })
}

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)

// Applies the brand voice to a draft: opener phrase, banned phrases removed, chat kept short, email signed.
export function styleWithVoice(draft: string, voice: BrandVoice, channel: 'email' | 'chat'): string {
  if (!voice.enabled) return draft
  let out = draft
  for (const p of lines(voice.phrasesToAvoid)) out = out.replace(new RegExp(`${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},?\\s*`, 'gi'), '')
  const opener = lines(voice.phrasesToUse)[0]
  if (opener && !out.toLowerCase().startsWith(opener.toLowerCase())) out = `${opener}! ${out.charAt(0).toUpperCase()}${out.slice(1)}`
  if (channel === 'chat') out = (out.match(/[^.!?]+[.!?]+/g) ?? [out]).slice(0, 3).join('').trim()
  else out = `${out}\n\n${voice.signOff || `Warmly,\nThe ${voice.brandName || 'support'} team`}`
  return out
}

// POST /api/ai/test-conversation  { history, message, channel, orderNumber?, voice? }
// Follow-ups (a prior AI turn exists) answer the new question from seed data: ETA, sizing, return window, else a hand-over reason.
const FOLLOW_UPS: [RegExp, string][] = [
  [/\b(arrive|arrival|eta|deliver|before|by (mon|tues|wednes|thurs|fri|satur|sun)day|when)\b/i, 'eta'],
  [/\b(size|fit|tight|loose|bigger|smaller|between)\b/i, 'size'],
  [/\b(return|refund|window|exchange|how long)\b/i, 'return'],
]
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7)

export async function testConversation(input: ConversationTestInput): Promise<TestTurn> {
  const voice = input.voice ?? db.brandVoice
  const r = await runSandbox(input.message, input.orderNumber || undefined)
  const followUp = input.history.some((t) => t.role === 'ai')
  let draft = r.draft
  let confidence = r.confidence
  if (followUp) {
    const kind = FOLLOW_UPS.find(([re]) => re.test(input.message))?.[1]
    const o = r.order
    if (kind === 'eta') {
      draft = !o ? "I can't see an order on this conversation yet. Share the order number and I'll check the tracking for you."
        : /deliver/i.test(o.status) ? `Good news: ${o.number} was already delivered${o.carrier ? ` by ${o.carrier}` : ''}. If it's not at your door, I can open a carrier claim.`
        : /transit|shipped|fulfilled/i.test(o.status) ? `${o.number} is with ${o.carrier ?? 'the carrier'} now and tracking shows delivery by Thursday, so it should arrive before Saturday.`
        : `${o.number} hasn't shipped yet. Orders leave our workshop within 2 business days, so Saturday is tight. I can ask the team to rush it.`
      confidence = o ? 84 + (hash(input.message) % 8) : 58
    } else if (kind === 'size') {
      draft = 'If you sit between sizes, go up one and add the free sizing tape inside the band. Felt hats loosen a little with wear, so a snug fit at first is normal.'
      confidence = 80 + (hash(input.message) % 10)
    } else if (kind === 'return') {
      draft = 'You can return unworn hats within 30 days of delivery for a refund or exchange. Start it from our returns page and the label is free in the US.'
      confidence = 82 + (hash(input.message) % 9)
    } else {
      draft = `I'd hand this to a person: the question "${input.message.slice(0, 60)}" isn't covered by our guidance, and I don't want to guess.`
      confidence = 40 + (hash(input.message) % 15)
    }
  }
  const threshold = db.aiSettings.threshold
  const prior = [...input.history].reverse().find((t) => t.role === 'ai')?.result?.articles ?? []
  const pool = r.articles.length ? r.articles : prior
  const articles = followUp ? pool.slice(0, 1 + (hash(input.message) % Math.max(1, pool.length))) : r.articles
  const text = styleWithVoice(draft, voice, input.channel)
  return { role: 'ai', text, result: { ...r, articles, confidence, threshold, wouldEscalate: confidence < threshold, draft: text } }
}

// Voice preview samples (REQ-809). Late order uses seeded #GB20398 tracking.
export const VOICE_SAMPLES: VoiceSample[] = [
  { id: 'sizing', label: 'Sizing', customer: "My head is 22.5 inches. Which fedora size should I get?", draft: '22.5 inches is about 57 cm, which is a Medium in our fedoras. To double-check, wrap a soft tape around your head a finger above your brows and ears. If you sit between sizes, go up one and add the free sizing tape.' },
  { id: 'late', label: 'Late order', customer: "It's been 9 days and my hat still hasn't arrived.", draft: "Sorry for the wait, and no cheap excuses here. Your order #GB20398 left our workshop on Oct 2 with UPS and tracking shows it out for delivery in Brooklyn. If it hasn't arrived by Friday, reply here and I'll send a replacement right away." },
  { id: 'damaged', label: 'Damaged item', customer: 'My fedora arrived crushed with a dent in the brim.', draft: "I'm so sorry your fedora arrived crushed. That's not how a Goorin hat should reach you. I can send a replacement today at no cost, or refund you in full, whichever you prefer. A quick photo of the dent helps our packing team." },
]

// Rewrites a sample reply with a (draft) voice: avoid list, Use phrases, tone hints and sign-off. Client-side mock of POST /api/ai/voice-preview.
export function previewVoice(voice: BrandVoice, sampleId: VoiceSample['id']): string {
  const s = VOICE_SAMPLES.find((x) => x.id === sampleId) ?? VOICE_SAMPLES[0]
  if (!voice.enabled) return s.draft
  let out = s.draft
  for (const p of lines(voice.phrasesToAvoid)) out = out.replace(new RegExp(`${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},?\\s*`, 'gi'), '')
  const use = lines(voice.phrasesToUse)
  if (use[0] && !out.toLowerCase().startsWith(use[0].toLowerCase())) out = `${use[0]}! ${out}`
  if (/concise/i.test(voice.tone)) out = (out.match(/[^.!?]+[.!?]+/g) ?? [out]).slice(0, 3).join('').trim()
  if (/formal/i.test(voice.tone)) out = out.replace(/\bSorry\b/, 'We apologise').replace(/\bI'm\b/g, 'I am').replace(/\bI'll\b/g, 'I will')
  if (/playful/i.test(voice.tone)) out = `${out} Hats off to you!`
  if (use[1]) out = `${out} ${use[1].charAt(0).toUpperCase()}${use[1].slice(1)}.`
  return voice.signOff ? `${out}\n\n${voice.signOff}` : out
}

// GET /api/ai/impact (last 30 days). MOCKED.
export const getReplyImpact = (): Promise<ReplyImpact> => request(() => ({ resolvedPct: 78, handedPct: 22, autoSent: 1284, autoRefunds: 37, autoRefundTotal: 1642 }))

// Share of last month's replies at or above a threshold (mock curve; 75% → 78%).
export const estimateAutoSend = (threshold: number) => Math.round(Math.max(5, Math.min(99, 100 - (threshold * threshold) / 256)))

// GET /api/ai/test-customers: seeded customers for Conversation testing, with their latest order.
export const listTestCustomers = (): Promise<TestCustomer[]> => request(() => db.customers.filter((c) => c.orders.length).slice(0, 6).map((c) => ({ id: c.id, name: c.name, email: c.email, orderNumber: c.orders[0]?.number ?? null })))
