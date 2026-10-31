import { KB, LEGACY_ARTICLES, LEGACY_TOPICS, MERGED_SLUGS, QUICK_ANSWERS, type KbArticle, type KbFolder, type KbIcon } from '@/mocks/helpCenter'
import { daysAgo } from '@/mocks/time'
import { ApiError, request } from './client'

export type { KbIcon }
export interface HelpArticle { slug: string; title: string; excerpt: string; body: string; updatedAt: string; readMins: number; path: string; folder: Pick<KbFolder, 'slug' | 'title'> }
export interface HelpFolder { slug: string; title: string; description: string; icon: KbIcon; count: number; articles: HelpArticle[] }
export interface HelpSearch { q: string; total: number; quick: { text: string; sources: HelpArticle[] } | null; groups: { folder: Pick<KbFolder, 'slug' | 'title'>; results: HelpArticle[] }[] }

const toArticle = (f: KbFolder, x: KbArticle): HelpArticle => ({
  slug: x.slug, title: x.title, excerpt: x.excerpt, body: x.body, updatedAt: daysAgo(x.days),
  readMins: Math.max(1, Math.ceil(x.body.split(/\s+/).length / 60)), path: `/help/${f.slug}/${x.slug}`, folder: { slug: f.slug, title: f.title },
})
const toFolder = (f: KbFolder): HelpFolder => ({ slug: f.slug, title: f.title, description: f.description, icon: f.icon, count: f.articles.length, articles: f.articles.map((x) => toArticle(f, x)) })
const all = () => KB.map(toFolder)
const articles = () => all().flatMap((f) => f.articles)
const byPath = (p: string) => articles().find((x) => x.path === `/help/${p}`)
const missing = () => new ApiError("We couldn't find that page.", 404)

// GET /api/help/folders
export const listFolders = () => request(all)
// GET /api/help/folders/:folder
export const getFolder = (folder: string) => request(() => { const f = all().find((x) => x.slug === folder); if (!f) throw missing(); return f })
// GET /api/help/articles/:folder/:article
export const getArticle = (folder: string, article: string) => request(() => {
  const f = all().find((x) => x.slug === folder); const a = f?.articles.find((x) => x.slug === article)
  if (!f || !a) throw missing()
  return { folder: f, article: a, more: f.articles.filter((x) => x.slug !== article).slice(0, 3) }
})

const words = (q: string) => q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2).map((w) => (w.length > 4 ? w.replace(/(es|s)$/, '') : w))
const rank = (q: string) => {
  const ws = words(q)
  return articles().map((a) => {
    const t = a.title.toLowerCase(); const hay = `${a.title} ${a.excerpt} ${a.body}`.toLowerCase()
    return { a, n: ws.reduce((n, w) => n + (t.includes(w) ? 3 : hay.includes(w) ? 1 : 0), 0) }
  }).filter((x) => x.n > 0).sort((x, y) => y.n - x.n)
}
// Typeahead: article titles (sync so it keeps up with typing).
export const suggest = (q: string) => (q.trim().length < 2 ? [] : rank(q).slice(0, 6).map((x) => x.a))
// GET /api/help/search?q=  Quick answer is MOCKED (keyword-matched, no AI).
export const search = (q: string) => request((): HelpSearch => {
  const scored = rank(q)
  const weight = (slug: string) => scored.filter((x) => x.a.folder.slug === slug).reduce((n, x) => n + x.n, 0)
  const groups = KB.map((f) => ({ folder: { slug: f.slug, title: f.title }, results: scored.filter((x) => x.a.folder.slug === f.slug).map((x) => x.a) })).filter((g) => g.results.length)
    .sort((x, y) => weight(y.folder.slug) - weight(x.folder.slug))
  const qa = QUICK_ANSWERS.find((x) => x.keys.test(q))
  return { q, total: scored.length, groups, quick: qa && scored.length ? { text: qa.text, sources: qa.sources.map(byPath).filter(Boolean) as HelpArticle[] } : null }
})

// Old URLs → new path: /help/topic/:id, /help/article/:id, and 3-level /help/:folder/:sub(/:article).
export const legacyPath = (kind: 'topic' | 'article', id: string) => (kind === 'topic' ? (LEGACY_TOPICS[id] ? `/help/${LEGACY_TOPICS[id]}` : '/help') : LEGACY_ARTICLES[id] ? `/help/${LEGACY_ARTICLES[id]}` : '/help')
export const redirectFor = (folder: string, slug?: string): string | null => {
  const f = KB.find((x) => x.slug === folder)
  if (!f) return null
  if (!slug) return `/help/${folder}`
  if (f.articles.some((x) => x.slug === slug)) return `/help/${folder}/${slug}`
  return MERGED_SLUGS[slug] ? `/help/${MERGED_SLUGS[slug]}` : `/help/${folder}`
}
