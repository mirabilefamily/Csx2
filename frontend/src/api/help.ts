import { KB, LEGACY_ARTICLES, LEGACY_TOPICS, QUICK_ANSWERS, type KbArticle, type KbFolder, type KbIcon, type KbSub } from '@/mocks/helpCenter'
import { daysAgo } from '@/mocks/time'
import { ApiError, request } from './client'

export type { KbIcon }
export interface HelpArticle { slug: string; title: string; excerpt: string; body: string; updatedAt: string; readMins: number; path: string; folder: Pick<KbFolder, 'slug' | 'title'>; sub: Pick<KbSub, 'slug' | 'title'> }
export interface HelpSub { slug: string; title: string; path: string; articles: HelpArticle[] }
export interface HelpFolder { slug: string; title: string; description: string; icon: KbIcon; count: number; subs: HelpSub[] }
export interface HelpSearch { q: string; total: number; quick: { text: string; sources: HelpArticle[] } | null; groups: { folder: Pick<KbFolder, 'slug' | 'title'>; results: HelpArticle[] }[] }

const toArticle = (f: KbFolder, s: KbSub, x: KbArticle): HelpArticle => ({
  slug: x.slug, title: x.title, excerpt: x.excerpt, body: x.body, updatedAt: daysAgo(x.days),
  readMins: Math.max(1, Math.ceil(x.body.split(/\s+/).length / 60)), path: `/help/${f.slug}/${s.slug}/${x.slug}`,
  folder: { slug: f.slug, title: f.title }, sub: { slug: s.slug, title: s.title },
})
const toFolder = (f: KbFolder): HelpFolder => {
  const subs = f.subs.map((s) => ({ slug: s.slug, title: s.title, path: `/help/${f.slug}/${s.slug}`, articles: s.articles.map((x) => toArticle(f, s, x)) }))
  return { slug: f.slug, title: f.title, description: f.description, icon: f.icon, subs, count: subs.reduce((n, s) => n + s.articles.length, 0) }
}
const all = () => KB.map(toFolder)
const byPath = (p: string) => all().flatMap((f) => f.subs.flatMap((s) => s.articles)).find((x) => x.path === `/help/${p}`)
const missing = () => new ApiError("We couldn't find that page.", 404)

// GET /api/help/folders
export const listFolders = () => request(all)
// GET /api/help/folders/:folder
export const getFolder = (folder: string) => request(() => { const f = all().find((x) => x.slug === folder); if (!f) throw missing(); return f })
// GET /api/help/folders/:folder/:sub
export const getSub = (folder: string, sub: string) => request(() => {
  const f = all().find((x) => x.slug === folder); const s = f?.subs.find((x) => x.slug === sub)
  if (!f || !s) throw missing()
  return { folder: f, sub: s }
})
// GET /api/help/articles/:folder/:sub/:article
export const getArticle = (folder: string, sub: string, article: string) => request(() => {
  const f = all().find((x) => x.slug === folder); const s = f?.subs.find((x) => x.slug === sub); const a = s?.articles.find((x) => x.slug === article)
  if (!f || !s || !a) throw missing()
  return { folder: f, sub: s, article: a, more: s.articles.filter((x) => x.slug !== article).slice(0, 3) }
})

const words = (q: string) => q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2).map((w) => (w.length > 4 ? w.replace(/(es|s)$/, '') : w))
// GET /api/help/search?q=  Quick answer is MOCKED (keyword-matched, no AI).
const rank = (q: string) => {
  const ws = words(q)
  return all().flatMap((f) => f.subs.flatMap((s) => s.articles)).map((a) => {
    const t = a.title.toLowerCase(); const hay = `${a.title} ${a.excerpt} ${a.body} ${a.sub.title}`.toLowerCase()
    return { a, n: ws.reduce((n, w) => n + (t.includes(w) ? 3 : hay.includes(w) ? 1 : 0), 0) }
  }).filter((x) => x.n > 0).sort((x, y) => y.n - x.n)
}
// Typeahead: article titles (sync so it keeps up with typing).
export const suggest = (q: string) => (q.trim().length < 2 ? [] : rank(q).slice(0, 6).map((x) => x.a))
export const search = (q: string) => request((): HelpSearch => {
  const scored = rank(q)
  const weight = (slug: string) => scored.filter((x) => x.a.folder.slug === slug).reduce((n, x) => n + x.n, 0)
  const groups = KB.map((f) => ({ folder: { slug: f.slug, title: f.title }, results: scored.filter((x) => x.a.folder.slug === f.slug).map((x) => x.a) })).filter((g) => g.results.length)
    .sort((x, y) => weight(y.folder.slug) - weight(x.folder.slug))
  const qa = QUICK_ANSWERS.find((x) => x.keys.test(q))
  return { q, total: scored.length, groups, quick: qa && scored.length ? { text: qa.text, sources: qa.sources.map(byPath).filter(Boolean) as HelpArticle[] } : null }
})

// Old /help/topic/:slug and /help/article/:id → new path.
export const legacyPath = (kind: 'topic' | 'article', id: string) => (kind === 'topic' ? (LEGACY_TOPICS[id] ? `/help/${LEGACY_TOPICS[id]}` : '/help') : LEGACY_ARTICLES[id] ? `/help/${LEGACY_ARTICLES[id]}` : '/help')
