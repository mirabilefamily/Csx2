import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Clock } from 'lucide-react'
import { helpApi } from '@/api'
import { HELP_TOPICS } from '@/api/help'
import { useApi } from '@/hooks/useApi'
import { HelpShell } from '@/components/help/HelpShell'
import { HelpSearch } from '@/components/help/HelpSearch'
import { AnswerCard } from '@/components/help/AnswerCard'
import { Skeleton } from '@/components/ui/skeleton'
import { ChatLine, Thinking, useAsk } from '@/components/help/helpKit'

export function BackLink() {
  return <Link to="/help" className="hc-mono mb-6 inline-flex items-center gap-1 text-[12px] uppercase tracking-[0.12em] text-black/60 transition-colors hover:text-black" data-testid="help-back"><ChevronLeft className="h-4 w-4" aria-hidden />Help center</Link>
}

export function Crumbs({ items }: { items: [string, string?][] }) {
  return (
    <nav aria-label="Breadcrumb" className="hc-mono flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-black/55" data-testid="help-breadcrumb">
      {items.map(([l, to], i) => <span key={l} className="flex items-center gap-2">{i > 0 && <span aria-hidden>/</span>}{to ? <Link to={to} className="hover:text-black">{l}</Link> : <span className="text-black" aria-current="page">{l}</span>}</span>)}
    </nav>
  )
}

export default function HelpTopicPage() {
  const { slug = '' } = useParams()
  const { data, error } = useApi(() => helpApi.getTopic(slug), [slug])
  const { answer, busy, ask, ref } = useAsk({ topic: slug })
  return (
    <HelpShell>
      <div className="mx-auto max-w-[1200px] pb-8" data-testid="help-topic-page">
        <BackLink />
        <Crumbs items={[['Help center', '/help'], [data?.topic.title ?? '…']]} />
        {error && <p className="mt-10 text-lg" data-testid="help-topic-missing">That topic doesn't exist. <Link to="/help" className="underline">Back to the help center</Link></p>}
        {data && (
          <>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="hc-display text-[clamp(30px,4vw,56px)] leading-[0.92]" data-testid="help-topic-title">{data.topic.title}</h1>
                <p className="mt-3 max-w-xl text-[16px] text-black/70">{data.topic.blurb}</p>
              </div>
              <p className="hc-mono text-[12px] uppercase tracking-[0.12em] text-black/55">{data.articles.length} articles</p>
            </div>
            <div className="mt-8 max-w-[760px]"><HelpSearch onAsk={ask} topic={slug} compact placeholder={`Ask about ${data.topic.title.toLowerCase()}…`} testId="topic-search" /></div>
          </>
        )}
        <div ref={ref} className="scroll-mt-6">{(busy || answer) && <div className="mt-8 max-w-[960px]">{busy ? <Thinking /> : answer && <AnswerCard key={answer.q} a={answer} onAsk={ask} />}</div>}</div>
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_280px]">
          <ul className="border-t border-[#141414]/12" data-testid="help-topic-articles">
            {!data && !error && Array.from({ length: 4 }, (_, i) => <li key={i} className="border-b border-[#141414]/12 py-5"><Skeleton className="h-10" /></li>)}
            {data?.articles.map((a, i) => (
              <li key={a.id} className="hc-rise border-b border-[#141414]/12" style={{ animationDelay: `${i * 40}ms` }}>
                <Link to={`/help/article/${a.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-4 py-5 transition-colors hover:bg-white/40" data-testid={`topic-article-${a.id}`}>
                  <span className="min-w-0"><span className="block text-[16px] font-semibold">{a.title}</span><span className="mt-1 block text-[14px] text-black/60">{a.excerpt}</span></span>
                  <span className="hc-mono flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-black/50"><span className="flex items-center gap-1 max-sm:hidden"><Clock className="h-3.5 w-3.5" aria-hidden />{a.readMins} min</span><ArrowRight className="h-4 w-4 text-black transition-transform group-hover:translate-x-1" aria-hidden /></span>
                </Link>
              </li>
            ))}
          </ul>
          <div>
            <nav aria-label="Other topics" data-testid="help-other-topics">
              <p className="hc-mono text-[11px] uppercase tracking-[0.14em] text-black/50">Other topics</p>
              <ul className="mt-3 border-t border-[#141414]/12">{HELP_TOPICS.filter((t) => t.slug !== slug).map((t) => <li key={t.slug}><Link to={`/help/topic/${t.slug}`} className="flex items-center justify-between border-b border-[#141414]/12 py-2.5 text-[14px] transition-colors hover:text-black/60" data-testid={`other-topic-${t.slug}`}>{t.title}<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></li>)}</ul>
            </nav>
          </div>
        </div>
        <div className="mt-14"><ChatLine /></div>
      </div>
    </HelpShell>
  )
}
