import type { ArticleInput, GuidanceArticle, ImportRow, SandboxResult, SessionUser } from '@/types'
import { ApiError, request } from './client'
import { db } from './db'

const now = () => new Date().toISOString()

// PUT /api/guidance/articles/:id  ·  POST /api/guidance/articles
export function saveArticle(input: ArticleInput, actor: SessionUser): Promise<GuidanceArticle> {
  return request(() => {
    if (!input.title.trim()) throw new ApiError('Title is required.', 422)
    if (!input.body.trim()) throw new ApiError('Article body is required.', 422)
    const existing = db.guidanceArticles.find((a) => a.id === input.id)
    const version = (existing?.version ?? 0) + 1
    const at = now()
    const article: GuidanceArticle = { ...input, id: existing?.id ?? `ga-${Date.now()}`, title: input.title.trim(), updatedAt: at, updatedBy: actor.name, version, aiUses30d: existing?.aiUses30d ?? 0, history: [{ version, editor: actor.name, at }, ...(existing?.history ?? [])].slice(0, 5) }
    db.guidanceArticles = [article, ...db.guidanceArticles.filter((a) => a.id !== article.id)]
    return article
  })
}

// PATCH /api/guidance/articles/:id  { active }
export function setArticleActive(id: string, active: boolean): Promise<GuidanceArticle> {
  return request(() => {
    const a = db.guidanceArticles.find((x) => x.id === id)
    if (!a) throw new ApiError('Article not found', 404)
    a.active = active
    a.updatedAt = now()
    return a
  })
}

// POST /api/guidance/articles/import
export function importArticles(rows: ImportRow[], actor: SessionUser): Promise<{ imported: number; skipped: number }> {
  return request(() => {
    const valid = rows.filter((r) => r.title?.trim())
    valid.forEach((r, i) =>
      db.guidanceArticles.unshift({
        id: `ga-imp-${Date.now()}-${i}`,
        title: r.title!.trim(),
        body: r.body?.trim() || '_No body yet._',
        category: r.category?.trim() || 'Imported',
        tags: (r.tags ?? '').split(/[;,|]/).map((t) => t.trim()).filter(Boolean),
        active: !/^(false|no|0|inactive)$/i.test(r.active?.trim() ?? ''),
        updatedAt: now(),
        updatedBy: actor.name,
        version: 1,
        aiUses30d: 0,
        history: [{ version: 1, editor: actor.name, at: now() }],
      }),
    )
    return { imported: valid.length, skipped: rows.length - valid.length }
  })
}

const STOP = new Set(['the', 'and', 'for', 'you', 'your', 'can', 'what', 'how', 'with', 'this', 'that', 'have', 'does', 'are', 'was', 'not', 'but', 'get', 'should', 'would', 'about', 'there', 'from', 'when', 'my', 'is', 'it', 'do', 'to', 'of', 'in', 'on', 'me', 'we', 'our'])
const SYNONYMS: Record<string, string[]> = {
  size: ['sizing'], sizes: ['sizing'], fit: ['sizing'], tight: ['sizing'], measure: ['sizing'], head: ['sizing'],
  track: ['order-status', 'tracking'], tracking: ['order-status'], where: ['order-status'], shipped: ['order-status'], package: ['order-status'],
  return: ['returns'], refund: ['returns', 'refund'], exchange: ['exchange', 'returns'],
  damaged: ['damaged'], crushed: ['damaged'], broken: ['damaged'], dent: ['damaged'], stain: ['damaged'],
  wholesale: ['wholesale'], bulk: ['wholesale'], boutique: ['wholesale'], retailer: ['wholesale'], stock: ['wholesale'],
  rain: ['care'], clean: ['care'], straw: ['care'], felt: ['care'], gift: ['gift-card'], promo: ['promo'],
}
const DRAFTS: Record<string, string> = {
  sizing: "Happy to help with sizing! Measure around your head about a finger above your brows. 22.5 inches is a Medium in our fedoras, and if you're between sizes we recommend going up. Each hat includes a sizing tape for a snug fit.",
  'order-status': "Thanks for checking in! I've looked up your order and it's on its way. You can follow it with the tracking link in your shipping email, and I'll keep an eye on it for you.",
  returns: "No problem. Unworn hats can be returned within 30 days of delivery. I'll email you a prepaid return label, and your refund posts within 5–7 business days of the return arriving.",
  damaged: "I'm so sorry your hat arrived damaged. Could you send a photo or two? As soon as I see it, I'll ship a replacement with expedited shipping, no need to send the damaged one back.",
  wholesale: "Thanks for your interest in carrying Goorin! I'm passing your details to our wholesale desk, who will reply within one business day with our line sheet, pricing and minimums.",
  care: "Let it air-dry crown-down on a clean towel, away from direct heat, and gently reshape the brim while it's still slightly damp.",
}

const tokenize = (q: string) => {
  const words = q.toLowerCase().match(/[a-z0-9-]+/g) ?? []
  const base = words.filter((w) => w.length > 2 && !STOP.has(w))
  return [...new Set([...base, ...base.flatMap((w) => SYNONYMS[w] ?? [])])]
}

// POST /api/guidance/sandbox  { question, orderNumber? }  — deterministic mock retrieval
export function runSandbox(question: string, orderNumber?: string): Promise<SandboxResult> {
  return request(() => {
    const tokens = tokenize(question)
    const scored = db.guidanceArticles
      .filter((a) => a.active)
      .map((a) => {
        const title = a.title.toLowerCase()
        const body = a.body.toLowerCase()
        const raw = tokens.reduce((s, t) => s + (a.tags.includes(t) ? 6 : 0) + (title.includes(t) ? 3 : 0) + (body.includes(t) ? 1 : 0), 0)
        return { id: a.id, title: a.title, category: a.category, tags: a.tags, raw }
      })
      .filter((a) => a.raw > 0)
      .sort((a, b) => b.raw - a.raw)
      .slice(0, 5)
    const top = scored[0]
    const articles = scored.map((a) => ({ id: a.id, title: a.title, category: a.category, score: Math.min(99, Math.round((100 * a.raw) / (a.raw + 5))) }))
    const num = orderNumber?.replace(/[^0-9]/g, '')
    const order = num ? db.customers.flatMap((c) => c.orders).find((o) => o.number === `#GB${num}`) ?? null : null
    let confidence = top ? Math.min(96, articles[0].score + 4) : 18
    const policy = top && top.tags.some((t) => ['wholesale', 'custom-order', 'internal', 'refund'].includes(t))
    if (policy) confidence = Math.min(confidence, 62)
    if (order) confidence = Math.min(97, confidence + 2)
    const key = top?.tags.find((t) => DRAFTS[t])
    const draft = !top
      ? "Thanks for reaching out to Goorin Bros. I want to make sure you get the right answer, so I'm passing this to a teammate who will follow up shortly."
      : `${order ? `I found your order ${order.number} (${order.status.replace('_', ' ')}, ${order.lineItems.map((l) => l.title).join(', ')}). ` : ''}${key ? DRAFTS[key] : `Here's what our guide "${top.title}" says: ${db.guidanceArticles.find((a) => a.id === top.id)!.body.replace(/[#*|_-]+/g, ' ').slice(0, 180).trim()}…`}`
    const threshold = db.aiSettings.threshold
    return { articles, draft, confidence, threshold, wouldEscalate: confidence < threshold, order, orderNotFound: num && !order ? (orderNumber ?? '').trim() : null }
  })
}
