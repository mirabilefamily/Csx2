import type { GuidanceArticle, SearchResults, User } from '@/types'
import { request } from './client'
import { db } from './db'

// GET /api/search?q=
export function search(query: string): Promise<SearchResults> {
  const q = query.trim().toLowerCase()
  const empty = (): SearchResults => ({ query, tickets: [], customers: [], articles: [] })
  return request(() => {
    if (!q) return empty()
    const has = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(q))
    const tickets = db.tickets
      .filter((t) => has(t.id, t.subject, t.preview, t.customer.name, t.orderNumber ?? '', ...t.tags))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)
    const customers = db.customers
      .filter((c) => has(c.name, c.email))
      .slice(0, 5)
      .map((c) => {
        const own = db.tickets.filter((t) => t.customer.id === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        return { id: c.id, name: c.name, email: c.email, latestTicketId: own[0]?.id ?? null, ticketCount: own.length }
      })
    const articles = db.guidanceArticles
      .filter((a) => has(a.title, a.category, ...a.tags))
      .slice(0, 5)
      .map(({ id, title, category }) => ({ id, title, category }))
    return { query, tickets, customers, articles }
  }, { empty })
}

// GET /api/guidance/articles
export function listArticles(): Promise<GuidanceArticle[]> {
  return request(() => db.guidanceArticles, { empty: () => [] })
}

// GET /api/users
export function listUsers(): Promise<User[]> {
  return request(() => db.users, { empty: () => [] })
}
