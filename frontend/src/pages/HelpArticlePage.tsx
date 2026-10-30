import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowRight, Sparkles } from 'lucide-react'
import { helpApi } from '@/api'
import type { HelpAnswer } from '@/api/help'
import { useApi } from '@/hooks/useApi'
import { HelpShell, openChat } from '@/components/help/HelpShell'
import { ArticleLink, Vote } from '@/components/help/AnswerCard'
import { Skeleton } from '@/components/ui/skeleton'
import { BackLink, Crumbs } from './HelpTopicPage'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function AskArticle({ id, title }: { id: string; title: string }) {
  const [q, setQ] = useState('')
  const [a, setA] = useState<HelpAnswer | null>(null)
  const [busy, setBusy] = useState(false)
  const go = async () => { if (!q.trim()) return; setBusy(true); try { setA(await helpApi.ask(q, { articleId: id })) } finally { setBusy(false) } }
  return (
    <div className="rounded-2xl bg-[#141414] p-5 text-[#D9D4C7]" data-testid="ask-article">
      <p className="hc-mono flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]"><Sparkles className="h-3.5 w-3.5 text-[#35B54A]" aria-hidden />Ask about this article</p>
      <form onSubmit={(e) => { e.preventDefault(); void go() }} className="mt-3 flex h-11 items-center rounded-xl bg-[#262626] pl-3.5 pr-1 ring-1 ring-white/10 focus-within:ring-[#35B54A]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`e.g. ${title.length > 24 ? 'does this apply to drops?' : 'what about drops?'}`} aria-label="Ask about this article" className="min-w-0 flex-1 bg-transparent text-[14px] text-white placeholder:text-white/40 focus:outline-none" data-testid="ask-article-input" />
        <button type="submit" aria-label="Ask" className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#35B54A] text-[#141414]" data-testid="ask-article-submit"><ArrowRight className="h-4 w-4" aria-hidden /></button>
      </form>
      {busy && <p className="hc-mono mt-3 text-[11px] uppercase tracking-[0.1em] text-white/50">Thinking…</p>}
      {a && !busy && (
        <div className="mt-4 animate-in fade-in duration-300" data-testid="ask-article-answer">
          <p className="text-[14px] leading-relaxed text-white">{a.text}</p>
          <button type="button" onClick={() => openChat(a.q, a.text)} className="hc-mono mt-3 text-[11px] uppercase tracking-[0.1em] text-[#35B54A] underline-offset-4 hover:underline" data-testid="ask-article-chat">Continue in chat →</button>
        </div>
      )}
    </div>
  )
}

export default function HelpArticlePage() {
  const { id = '' } = useParams()
  const { data, error } = useApi(() => helpApi.getArticle(id), [id])
  const a = data?.article
  const toc = a ? [...a.body.matchAll(/^## (.+)$/gm)].map((m) => m[1]) : []
  return (
    <HelpShell>
      <div className="mx-auto max-w-[1200px] pb-8" data-testid="help-article-page">
        <BackLink />
        <Crumbs items={[['Help center', '/help'], ...(a ? [[a.topic.title, `/help/topic/${a.topic.slug}`] as [string, string]] : []), [a?.title ?? '…']]} />
        {error && <p className="mt-10 text-lg" data-testid="help-article-missing">That article doesn't exist. <Link to="/help" className="underline">Back to the help center</Link></p>}
        {!a && !error && <Skeleton className="mt-8 h-24 w-2/3 rounded-2xl" />}
        {a && (
          <>
            <h1 className="hc-display mt-5 max-w-[960px] text-[clamp(30px,4vw,56px)] leading-[0.92]" data-testid="help-article-title">{a.title}</h1>
            <p className="hc-mono mt-5 text-[12px] uppercase tracking-[0.12em] text-black/55" data-testid="help-article-updated">Updated {new Date(a.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {a.readMins} min read</p>
            <div className="mt-10 grid gap-10 lg:grid-cols-[180px_minmax(0,1fr)_300px]">
              <nav aria-label="On this page" className="max-lg:hidden" data-testid="help-article-toc">
                {toc.length > 0 && <div className="sticky top-6"><p className="hc-mono text-[11px] uppercase tracking-[0.14em] text-black/50">On this page</p><ul className="mt-3 space-y-2 border-l border-black/15">{toc.map((h) => <li key={h}><a href={`#${slug(h)}`} className="-ml-px block border-l border-transparent pl-4 text-[14px] text-black/70 transition-colors hover:border-black hover:text-black">{h}</a></li>)}</ul></div>}
              </nav>
              <div className="min-w-0">
                <article className="hc-prose hc-box rounded-[22px] bg-white p-10 max-sm:p-6" data-testid="help-article-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h2: ({ children }) => <h2 id={slug(String(children))} className="scroll-mt-6">{children}</h2> }}>{a.body}</ReactMarkdown>
                </article>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-2"><Vote testId="article-vote" /><button type="button" onClick={() => openChat()} className="hc-mono text-[12px] uppercase tracking-[0.1em] underline underline-offset-4" data-testid="article-chat">Still stuck? Chat with us</button></div>
              </div>
              <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                <AskArticle id={a.id} title={a.title} />
                {data.related.length > 0 && (
                  <section data-testid="help-article-related">
                    <p className="hc-mono text-[11px] uppercase tracking-[0.14em] text-black/50">Related articles</p>
                    <div className="mt-3 space-y-2">{data.related.map((r) => <ArticleLink key={r.id} a={r} />)}</div>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </HelpShell>
  )
}
