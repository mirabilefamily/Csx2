import { HELP_EXTRA, HELP_INTENTS, HELP_TOPICS, PUBLIC_BODIES, SIZE_CHART, type HelpAction, type HelpTopic } from '@/mocks/helpCenter'
import { daysAgo } from '@/mocks/time'
import { ApiError, request } from './client'
import { db } from './db'

export type { HelpAction, HelpTopic }
export { HELP_TOPICS, NEXT_DROP } from '@/mocks/helpCenter'

export interface HelpArticle { id: string; title: string; topic: HelpTopic; excerpt: string; body: string; readMins: number; updatedAt: string }
export interface HelpAnswer { q: string; text: string; confident: boolean; sources: HelpArticle[]; followUps: string[]; action: HelpAction | null; related: HelpArticle[] }
export interface HelpSuggestion { kind: 'question' | 'article'; label: string; meta: string; id?: string }
export interface TrackResult { number: string; status: string; carrier: string | null; items: string[]; canEdit: boolean; steps: { label: string; at: string | null; done: boolean }[] }

const topicFor = (category: string) => HELP_TOPICS.find((t) => t.categories.includes(category)) ?? HELP_TOPICS[0]
const plain = (md: string) => md.replace(/^#+ .*$/gm, '').replace(/\|.*\|/g, '').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim()
function make(id: string, title: string, category: string, body: string, updatedAt: string): HelpArticle {
  const p = plain(body)
  return { id, title, topic: topicFor(category), body, updatedAt, excerpt: p.length > 120 ? `${p.slice(0, 117).replace(/\s\S*$/, '')}…` : p, readMins: Math.max(1, Math.round(body.split(/\s+/).length / 120)) }
}
function all(): HelpArticle[] {
  const guidance = db.guidanceArticles.filter((a) => a.active && !a.tags.includes('internal')).map((a) => make(a.id, a.title, a.category, PUBLIC_BODIES[a.id] ?? a.body, a.updatedAt))
  return [...guidance, ...HELP_EXTRA.map(([id, title, cat, age, body]) => make(id, title, cat, body, daysAgo(age)))]
}
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)
const score = (a: HelpArticle, q: string) => { const ws = words(q); const hay = `${a.title} ${a.topic.title} ${a.body}`.toLowerCase(); return ws.reduce((n, w) => n + (a.title.toLowerCase().includes(w) ? 3 : hay.includes(w) ? 1 : 0), 0) }
const closest = (q: string, n: number, pool = all()) => [...pool].sort((a, b) => score(b, q) - score(a, q)).slice(0, n)

// GET /api/help/topics
export const listTopics = () => request(() => { const as = all(); return HELP_TOPICS.map((t) => ({ ...t, count: as.filter((a) => a.topic.slug === t.slug).length })) })
// GET /api/help/topics/:slug
export const getTopic = (slug: string) => request(() => { const t = HELP_TOPICS.find((x) => x.slug === slug); if (!t) throw new ApiError("That topic doesn't exist.", 404); return { topic: t, articles: all().filter((a) => a.topic.slug === slug) } })
// GET /api/help/articles/:id
export const getArticle = (id: string) => request(() => {
  const as = all()
  const a = as.find((x) => x.id === id)
  if (!a) throw new ApiError("That article doesn't exist.", 404)
  return { article: a, related: [...as.filter((x) => x.topic.slug === a.topic.slug && x.id !== id), ...closest(a.title, 4, as.filter((x) => x.topic.slug !== a.topic.slug))].slice(0, 4) }
})

// Typeahead (sync so it keeps up with typing). GET /api/help/suggest?q=
export function suggest(q: string, topic?: string): HelpSuggestion[] {
  const s = q.trim().toLowerCase()
  if (s.length < 2) return []
  const ws = words(s)
  const hit = (t: string) => t.toLowerCase().includes(s) || (ws.length > 0 && ws.every((w) => t.toLowerCase().includes(w)))
  const qs = HELP_INTENTS.flatMap((i) => i.questions.map((label) => ({ label, i }))).filter(({ label, i }) => hit(label) || i.keys.test(s)).slice(0, 4).map(({ label }) => ({ kind: 'question' as const, label, meta: 'Ask AI' }))
  const as = all().filter((a) => (!topic || a.topic.slug === topic) && (hit(a.title) || score(a, s) >= 3)).slice(0, 4).map((a) => ({ kind: 'article' as const, label: a.title, meta: a.topic.title, id: a.id }))
  return [...qs, ...as].slice(0, 7)
}

// POST /api/help/ask  { q, topic?, articleId? }  MOCKED canned answers.
export function ask(q: string, opts: { topic?: string; articleId?: string } = {}): Promise<HelpAnswer> {
  return request(() => {
    const as = all()
    const byId = (id: string) => as.find((a) => a.id === id)
    const intent = HELP_INTENTS.find((i) => i.keys.test(q))
    if (intent) {
      const sources = intent.sources.map(byId).filter(Boolean) as HelpArticle[]
      return { q, text: intent.text, confident: true, sources, followUps: intent.followUps, action: intent.action ?? null, related: closest(q, 6, as.filter((a) => !intent.sources.includes(a.id))).slice(0, 3) }
    }
    const art = opts.articleId ? byId(opts.articleId) : undefined
    if (art && words(q).length) {
      return { q, text: `From "${art.title}": ${plain(art.body).split(/(?<=\.)\s/).slice(0, 2).join(' ')}`, confident: true, sources: [art], followUps: [], action: null, related: [] }
    }
    const pool = opts.topic ? as.filter((a) => a.topic.slug === opts.topic) : as
    return { q, text: "I'm not sure about that one. These articles are the closest match, or our crew can help in chat.", confident: false, sources: [], followUps: [], action: null, related: closest(q, 3, pool) }
  })
}

// POST /api/help/track  { email, orderNumber }  MOCKED from customer orders.
export function trackOrder(email: string, orderNumber: string): Promise<TrackResult> {
  return request(() => {
    const num = orderNumber.trim().toUpperCase().replace(/^#?/, '#').replace(/^#(\d)/, '#GB$1')
    const c = db.customers.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    const o = c?.orders.find((x) => x.number.toUpperCase() === num)
    if (!c || !o) throw new ApiError("We couldn't find an order with that email and number. Check both and try again.", 404)
    const placed = new Date(o.createdAt).getTime()
    const at = (d: number) => new Date(placed + d * 864e5).toISOString()
    const rank = { unfulfilled: 1, in_transit: 3, delivered: 4, returned: 4, cancelled: 0 }[o.status]
    return {
      number: o.number, status: o.status, carrier: o.carrier, items: o.lineItems.map((l) => `${l.title} · ${l.variant}`), canEdit: o.status === 'unfulfilled',
      steps: [
        { label: 'Order placed', at: at(0), done: rank >= 1 },
        { label: 'Packed at our workshop', at: rank >= 2 || rank >= 3 ? at(1) : null, done: rank >= 3 },
        { label: `Shipped with ${o.carrier ?? 'UPS'}`, at: rank >= 3 ? at(1) : null, done: rank >= 3 },
        { label: 'Delivered', at: rank >= 4 ? at(4) : null, done: rank >= 4 },
      ],
    }
  })
}

// Head measurement → size (sync, local maths).
export function sizeFor(cm: number) {
  const row = SIZE_CHART.find(([min, max]) => cm >= min && cm <= max + 0.09)
  if (!row) return null
  const [min, max, size, inches] = row
  const top = cm >= max - 0.5
  return { size, range: `${min}–${Math.floor(max)} cm · ${inches} in`, note: top ? `You're at the top of ${size}. For felt and straw, size up and use the sizing tape.` : `${size} should feel snug, not tight. Felt relaxes a little as you wear it.` }
}
