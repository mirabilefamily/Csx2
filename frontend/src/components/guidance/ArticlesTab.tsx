import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, SearchX } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'
import { toast } from 'sonner'
import type { GuidanceArticle } from '@/types'
import { directoryApi, guidanceApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/overlay'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ArticleEditor } from './ArticleEditor'

type Status = 'all' | 'active' | 'off'
type Sort = 'recent' | 'used' | 'az'
export const plainExcerpt = (md: string) => md.split('\n').map((l) => l.trim())
  .filter((l) => l && !l.startsWith('|') && !/^[-|:\s]+$/.test(l))
  .map((l) => (/^#+\s/.test(l) ? l.replace(/^#+\s*/, '').replace(/[.:!?]?$/, '.') : l.replace(/^([-*]|\d+\.)\s+/, '')))
  .join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`>]/g, '').replace(/\s+/g, ' ').trim()

function Segmented({ value, onChange, counts }: { value: Status; onChange: (s: Status) => void; counts: Record<Status, number> }) {
  return (
    <div role="radiogroup" aria-label="Status" className="inline-flex shrink-0 rounded-lg bg-surface-muted p-1" data-testid="article-active-filter">
      {(['all', 'active', 'off'] as const).map((s) => (
        <button key={s} type="button" role="radio" aria-checked={value === s} onClick={() => onChange(s)} className={cn('inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:h-11', value === s ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`article-status-${s}`}>
          {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Off'}<span className="text-xs tabular-nums text-ink-muted">{counts[s]}</span>
        </button>
      ))}
    </div>
  )
}

function Row({ a, onOpen, onToggle }: { a: GuidanceArticle; onOpen: () => void; onToggle: (v: boolean) => void }) {
  const extra = a.tags.length - 2
  return (
    <li className={cn('flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-sunken max-sm:px-4', !a.active && 'bg-surface-sunken/60')} data-testid={`article-row-${a.id}`}>
      <button type="button" onClick={onOpen} className="min-h-11 min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`article-open-${a.id}`}>
        <span className="flex items-center gap-2"><span className={cn('truncate text-sm font-semibold', a.active ? 'text-ink' : 'text-ink-muted')}>{a.title}</span>{!a.active && <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted ring-1 ring-border" data-testid={`article-off-${a.id}`}>Off</span>}</span>
        <span className="mt-0.5 block truncate text-[13px] text-ink-muted" data-testid={`article-excerpt-${a.id}`}>{plainExcerpt(a.body)}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
          <span className="flex flex-wrap gap-1">
            <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-ink">{a.category}</span>
            {a.tags.slice(0, 2).map((t) => <span key={t} className="rounded-full px-2 py-0.5 ring-1 ring-border">{t}</span>)}
            {extra > 0 && <span className="rounded-full px-2 py-0.5 ring-1 ring-border" data-testid={`article-tags-more-${a.id}`}>+{extra}</span>}
          </span>
          <span data-testid={`article-version-${a.id}`}>Updated {timeAgo(a.updatedAt)} by {a.updatedBy}</span>
          <span data-testid={`article-uses-${a.id}`}>{a.active ? `Used in ${a.aiUses30d} AI replies · 30 days` : 'Not used by the AI'}</span>
        </span>
      </button>
      <label className="flex min-h-11 items-center"><Switch checked={a.active} onCheckedChange={onToggle} aria-label={`${a.title} active`} data-testid={`article-active-${a.id}`} /></label>
    </li>
  )
}

export function ArticlesTab({ articleId, openArticle }: { articleId: string | null; openArticle: (id: string | null) => void }) {
  const [rev, setRev] = useState(0)
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi(() => directoryApi.listArticles(), [rev])
  const [articles, setArticles] = useState<GuidanceArticle[]>([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [tag, setTag] = useState('all')
  const [status, setStatus] = useState<Status>('all')
  const [sort, setSort] = useState<Sort>('recent')
  useEffect(() => { setArticles(data ?? []) }, [data])

  const cats = useMemo(() => [...new Set(articles.map((a) => a.category))].sort().map((c) => [c, articles.filter((a) => a.category === c).length] as const), [articles])
  const tags = useMemo(() => [...new Set(articles.flatMap((a) => a.tags))].sort(), [articles])
  const counts = { all: articles.length, active: articles.filter((a) => a.active).length, off: articles.filter((a) => !a.active).length }
  const s = q.trim().toLowerCase()
  const rows = articles
    .filter((a) => (!s || a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s)) && (category === 'all' || a.category === category) && (tag === 'all' || a.tags.includes(tag)) && (status === 'all' || a.active === (status === 'active')))
    .sort((a, b) => (sort === 'az' ? a.title.localeCompare(b.title) : sort === 'used' ? b.aiUses30d - a.aiUses30d : b.updatedAt.localeCompare(a.updatedAt)))
  const clear = () => { setQ(''); setCategory('all'); setTag('all'); setStatus('all') }

  const toggle = async (a: GuidanceArticle, active: boolean) => {
    setArticles((list) => list.map((x) => (x.id === a.id ? { ...x, active } : x)))
    try {
      const u = await guidanceApi.setArticleActive(a.id, active)
      setArticles((list) => list.map((x) => (x.id === u.id ? { ...u } : x)))
      toast.success(active ? 'Article activated' : 'Article turned off')
    } catch {
      setArticles((list) => list.map((x) => (x.id === a.id ? a : x)))
      toast.error("Couldn't update the article. Try again.")
    }
  }

  if (articleId && data) {
    const article = articles.find((a) => a.id === articleId) ?? null
    return <ArticleEditor key={articleId} article={articleId === 'new' ? null : article} categories={cats.map(([c]) => c)} onClose={() => openArticle(null)} onSaved={() => { setRev((r) => r + 1); setSort('recent'); openArticle(null) }} />
  }

  const catButton = (id: string, label: string, n: number, chip: boolean) => (
    <button key={id} type="button" onClick={() => setCategory(id)} aria-pressed={category === id} className={cn('flex shrink-0 items-center justify-between gap-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', chip ? 'min-h-11 rounded-full px-3.5 ring-1' : 'min-h-9 w-full rounded-lg px-3', category === id ? (chip ? 'bg-surface font-medium text-ink ring-ink/30' : 'bg-surface font-medium text-ink shadow-card') : (chip ? 'text-ink-muted ring-border' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'))} data-testid={`article-category-${id === 'all' ? 'all' : id.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
      <span className="truncate">{label}</span><span className="text-xs tabular-nums text-ink-muted">{n}</span>
    </button>
  )

  return (
    <div className="space-y-4" data-testid="articles-tab">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-ink-muted" data-testid="guidance-summary">{loading ? '\u00a0' : `${counts.all} articles · ${counts.active} active · ${counts.off} off`}</p>
        {user?.role === 'admin' && <Link to="/ai" className="inline-flex min-h-11 items-center gap-1 rounded text-sm text-ink-muted hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="guidance-ai-link">Brand voice and workflows live in AI & Workflows <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></Link>}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Categories" data-testid="article-category-chips">
        {catButton('all', 'All articles', counts.all, true)}
        {cats.map(([c, n]) => catButton(c, c, n, true))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Categories" className="hidden self-start lg:sticky lg:top-6 lg:block" data-testid="article-category-rail">
          <p className="mb-2 px-3 text-xs font-medium text-ink-subtle">Categories</p>
          <div className="space-y-0.5">{catButton('all', 'All articles', counts.all, false)}{cats.map(([c, n]) => catButton(c, c, n, false))}</div>
        </nav>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2" data-testid="article-toolbar">
            <Input type="search" placeholder="Search titles and text" aria-label="Search articles" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 w-full min-w-0 sm:w-60" data-testid="article-search" />
            <Segmented value={status} onChange={setStatus} counts={counts} />
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="h-10 w-[150px] max-sm:w-[calc(50%-4px)]" aria-label="Tag" data-testid="article-tag-filter"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All tags</SelectItem>{tags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="h-10 w-[170px] max-sm:w-[calc(50%-4px)]" aria-label="Sort" data-testid="article-sort"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="recent">Recently updated</SelectItem><SelectItem value="used">Most used by AI</SelectItem><SelectItem value="az">A–Z</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04]">
            {loading ? (
              <div className="space-y-2 p-4" data-testid="articles-loading">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : error ? (
              <ErrorState compact title="Articles didn't load" onRetry={reload} testId="articles-error" />
            ) : !articles.length ? (
              <EmptyState compact title="No articles yet" description="Write your first article or import a CSV." testId="articles-empty" />
            ) : !rows.length ? (
              <EmptyState compact title="No articles match" icon={<SearchX className="h-5 w-5" aria-hidden />} action={<Button size="sm" variant="outline" onClick={clear} data-testid="articles-clear-filters">Clear filters</Button>} testId="articles-no-match" />
            ) : (
              <ul className="divide-y divide-border/70" data-testid="articles-table">{rows.map((a) => <Row key={a.id} a={a} onOpen={() => openArticle(a.id)} onToggle={(v) => toggle(a, v)} />)}</ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
