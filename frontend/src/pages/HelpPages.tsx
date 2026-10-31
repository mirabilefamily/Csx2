import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { helpApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { HelpShell } from '@/components/help/HelpShell'
import { ArticleRow, NotFound, PageTop, SearchField, Vote } from '@/components/help/kb'
import { Skeleton } from '@/components/ui/skeleton'
import { FolderGrid } from './HelpHomePage'

const Loading = () => <div className="space-y-3" data-testid="help-loading"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-5 w-2/3" /><Skeleton className="mt-6 h-40" /></div>
const Title = ({ children }: { children: React.ReactNode }) => <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.01em] text-[#141414] max-sm:text-[26px]" data-testid="help-page-title">{children}</h1>
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function HelpFolderPage() {
  const { folder = '' } = useParams()
  const { data: f, error } = useApi(() => helpApi.getFolder(folder), [folder])
  return (
    <HelpShell>
      <div className="mx-auto max-w-[880px]" data-testid="help-folder-page">
        {error ? <NotFound /> : !f ? <Loading /> : (
          <>
            <PageTop back={['/help', 'All topics']} crumbs={[['Help Center', '/help'], [f.title]]} />
            <Title>{f.title}</Title>
            <p className="mt-2 text-[16px] text-black/65">{f.description}</p>
            <p className="mt-1 text-[14px] text-black/50" data-testid="help-folder-count">{f.count} articles</p>
            <ul className="hc-box mt-8 bg-white px-6 max-sm:px-5" data-testid="help-folder-articles">{f.articles.map((a) => <ArticleRow key={a.slug} a={a} />)}</ul>
          </>
        )}
      </div>
    </HelpShell>
  )
}

export function HelpArticlePage() {
  const { folder = '', article = '' } = useParams()
  const { data, error } = useApi(() => helpApi.getArticle(folder, article), [folder, article])
  if (error) { const to = helpApi.redirectFor(folder, article); if (to && to !== `/help/${folder}/${article}`) return <Navigate to={to} replace /> }
  return (
    <HelpShell>
      <div className="mx-auto max-w-[880px]" data-testid="help-article-page">
        {error ? <NotFound /> : !data ? <Loading /> : (
          <>
            <PageTop back={[`/help/${data.folder.slug}`, data.folder.title]} crumbs={[['Help Center', '/help'], [data.folder.title, `/help/${data.folder.slug}`]]} />
            <Title>{data.article.title}</Title>
            <p className="mt-2 text-[14px] text-black/55" data-testid="help-article-meta">Updated {fmt(data.article.updatedAt)} · {data.article.readMins} min read</p>
            <article className="hc-box mt-8 bg-white p-10 max-sm:p-5" data-testid="help-article-body"><div className="hc-prose"><ReactMarkdown>{data.article.body}</ReactMarkdown></div></article>
            <div className="mt-6"><Vote /></div>
            {data.more.length > 0 && (
              <section className="mt-12" data-testid="help-more">
                <h2 className="text-[15px] font-semibold">More in {data.folder.title}</h2>
                <ul className="hc-box mt-3 bg-white px-6 max-sm:px-5">{data.more.map((a) => <ArticleRow key={a.slug} a={a} excerpt={false} />)}</ul>
              </section>
            )}
          </>
        )}
      </div>
    </HelpShell>
  )
}

export function HelpSearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const { data } = useApi(() => helpApi.search(q), [q])
  return (
    <HelpShell>
      <div className="mx-auto max-w-[880px]" data-testid="help-search-page">
        <PageTop back={['/help', 'Help Center']} crumbs={[['Help Center', '/help'], ['Search']]} />
        <SearchField key={q} initial={q} />
        {!data ? <div className="mt-8"><Loading /></div> : data.total === 0 ? (
          <div className="mt-8" data-testid="help-no-results">
            <Title>No results for ‘{q}’</Title>
            <p className="mt-2 text-[15px] text-black/60">Try different words, or browse a topic below.</p>
            <div className="mt-8"><FolderGrid /></div>
          </div>
        ) : (
          <>
            <p className="mt-8 text-[20px] font-semibold" data-testid="help-results-count">{data.total} result{data.total === 1 ? '' : 's'} for ‘{q}’</p>
            {data.quick && (
              <section className="hc-box hc-accent-l mt-5 bg-white px-6 py-5" data-testid="help-quick-answer">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/55">Quick answer</p>
                <p className="mt-2 text-[16px] leading-relaxed">{data.quick.text}</p>
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                  <span className="text-black/50">Sources:</span>
                  {data.quick.sources.map((s) => <Link key={s.path} to={s.path} className="font-medium underline underline-offset-4 hover:text-black/70" data-testid={`help-quick-source-${s.slug}`}>{s.title}</Link>)}
                </p>
              </section>
            )}
            <div className="mt-8 space-y-8">
              {data.groups.map((g) => (
                <section key={g.folder.slug} data-testid={`help-results-${g.folder.slug}`}>
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-black/55"><Link to={`/help/${g.folder.slug}`} className="hover:text-black">{g.folder.title}</Link></h2>
                  <ul className="hc-box mt-2 bg-white px-6 max-sm:px-5">{g.results.map((a) => <ArticleRow key={a.path} a={a} path />)}</ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </HelpShell>
  )
}

export function HelpLegacyRedirect({ kind }: { kind: 'topic' | 'article' }) {
  const { id = '' } = useParams()
  return <Navigate to={helpApi.legacyPath(kind, id)} replace />
}

export function HelpLegacy3Redirect() {
  const { folder = '', article = '' } = useParams()
  return <Navigate to={helpApi.redirectFor(folder, article) ?? '/help'} replace />
}
