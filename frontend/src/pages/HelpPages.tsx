import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { ArrowRight } from 'lucide-react'
import { helpApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { HelpShell } from '@/components/help/HelpShell'
import { ArticleRow, ChatLine, NotFound, PageTop, SearchField, Vote } from '@/components/help/kb'
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
            <div className="mt-10 space-y-8">
              {f.subs.map((s) => (
                <section key={s.slug} className="hc-box bg-white px-6 pb-2 pt-5 max-sm:px-5" data-testid={`help-sub-${s.slug}`}>
                  <h2><Link to={s.path} className="text-[15px] font-semibold text-[#141414] underline-offset-4 hover:underline" data-testid={`help-sub-link-${s.slug}`}>{s.title}</Link></h2>
                  <ul className="mt-2 border-t border-black/10">{s.articles.slice(0, 5).map((a) => <ArticleRow key={a.slug} a={a} excerpt={false} />)}</ul>
                  {s.articles.length > 5 && <Link to={s.path} className="flex h-11 items-center gap-1.5 border-t border-black/10 text-[14px] font-medium underline-offset-4 hover:underline" data-testid={`help-see-all-${s.slug}`}>See all {s.articles.length} articles<ArrowRight className="h-4 w-4" aria-hidden /></Link>}
                </section>
              ))}
            </div>
          </>
        )}
        <ChatLine />
      </div>
    </HelpShell>
  )
}

export function HelpSubfolderPage() {
  const { folder = '', sub = '' } = useParams()
  const { data, error } = useApi(() => helpApi.getSub(folder, sub), [folder, sub])
  return (
    <HelpShell>
      <div className="mx-auto max-w-[880px]" data-testid="help-subfolder-page">
        {error ? <NotFound /> : !data ? <Loading /> : (
          <>
            <PageTop back={[`/help/${data.folder.slug}`, data.folder.title]} crumbs={[['Help Center', '/help'], [data.folder.title, `/help/${data.folder.slug}`], [data.sub.title]]} />
            <Title>{data.sub.title}</Title>
            <p className="mt-2 text-[15px] text-black/55">{data.sub.articles.length} articles</p>
            <ul className="hc-box mt-8 bg-white px-6 max-sm:px-5">{data.sub.articles.map((a) => <ArticleRow key={a.slug} a={a} />)}</ul>
          </>
        )}
        <ChatLine />
      </div>
    </HelpShell>
  )
}

export function HelpArticlePage() {
  const { folder = '', sub = '', article = '' } = useParams()
  const { data, error } = useApi(() => helpApi.getArticle(folder, sub, article), [folder, sub, article])
  return (
    <HelpShell>
      <div className="mx-auto max-w-[880px]" data-testid="help-article-page">
        {error ? <NotFound /> : !data ? <Loading /> : (
          <>
            <PageTop back={[data.sub.path, data.sub.title]} crumbs={[['Help Center', '/help'], [data.folder.title, `/help/${data.folder.slug}`], [data.sub.title, data.sub.path], [data.article.title]]} />
            <Title>{data.article.title}</Title>
            <p className="mt-2 text-[14px] text-black/55" data-testid="help-article-meta">Updated {fmt(data.article.updatedAt)} · {data.article.readMins} min read</p>
            <article className="hc-box mt-8 bg-white p-10 max-sm:p-5" data-testid="help-article-body"><div className="hc-prose"><ReactMarkdown>{data.article.body}</ReactMarkdown></div></article>
            <div className="mt-6"><Vote /></div>
            {data.more.length > 0 && (
              <section className="mt-12" data-testid="help-more">
                <h2 className="text-[15px] font-semibold">More in {data.sub.title}</h2>
                <ul className="hc-box mt-3 bg-white px-6 max-sm:px-5">{data.more.map((a) => <ArticleRow key={a.slug} a={a} excerpt={false} />)}</ul>
              </section>
            )}
          </>
        )}
        <ChatLine />
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
            <p className="mt-2 text-[15px] text-black/60">Try different words, browse a topic below, or open chat.</p>
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
        <ChatLine />
      </div>
    </HelpShell>
  )
}

export function HelpLegacyRedirect({ kind }: { kind: 'topic' | 'article' }) {
  const { id = '' } = useParams()
  return <Navigate to={helpApi.legacyPath(kind, id)} replace />
}
