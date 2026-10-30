import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, MessageCircle, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { HelpAnswer, HelpArticle } from '@/api/help'
import { OrderLookup, ReturnAction, SizeAction } from './HelpActions'
import { openChat } from './HelpShell'
import { cn } from '@/lib/utils'

function useTyped(text: string) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const id = setInterval(() => setN((x) => { if (x >= text.length) { clearInterval(id); return x } return x + 3 }), 16)
    return () => clearInterval(id)
  }, [text])
  return { shown: text.slice(0, n), done: n >= text.length }
}

export function Vote({ testId = 'help-vote' }: { testId?: string }) {
  const [v, setV] = useState<'up' | 'down' | null>(null)
  return (
    <div className="hc-mono flex items-center gap-2 text-[12px] uppercase tracking-[0.08em] text-black/60" data-testid={testId}>
      {v ? <span role="status" data-testid={`${testId}-thanks`}>{v === 'up' ? 'Thanks! Glad it helped.' : "Thanks. We'll make it better."}</span> : (
        <>
          <span>Was this helpful?</span>
          {(['up', 'down'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setV(k)} aria-label={k === 'up' ? 'Yes, helpful' : 'Not helpful'} className="flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-black/15 transition-colors hover:bg-[#141414] hover:text-white" data-testid={`${testId}-${k}`}>
              {k === 'up' ? <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> : <ThumbsDown className="h-3.5 w-3.5" aria-hidden />}
            </button>
          ))}
        </>
      )}
    </div>
  )
}

export function ArticleLink({ a, i }: { a: HelpArticle; i?: number }) {
  return (
    <Link to={`/help/article/${a.id}`} className="group flex items-center gap-4 rounded-xl bg-white px-5 py-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgb(0_0_0/.5)]" data-testid={`related-article-${a.id}`}>
      {i !== undefined && <span className="hc-mono text-[12px] text-black/40">{String(i + 1).padStart(2, '0')}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{a.title}</span>
        <span className="hc-mono mt-0.5 block text-[11px] uppercase tracking-[0.08em] text-black/50">{a.topic.title} · {a.readMins} min read</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  )
}

export function AnswerCard({ a, onAsk }: { a: HelpAnswer; onAsk: (q: string) => void }) {
  const { shown, done } = useTyped(a.text)
  const reveal = cn('transition-[opacity,transform] duration-500', done ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0')
  return (
    <div data-testid="help-answer">
      <article className="rounded-[22px] bg-white p-8 shadow-[0_30px_80px_-40px_rgb(0_0_0/.55)] max-sm:rounded-2xl max-sm:p-5" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <p className="hc-mono flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/55"><Sparkles className="h-3.5 w-3.5 text-[#35B54A]" aria-hidden />{a.confident ? 'Answer' : 'Hmm'}</p>
          <p className="hc-mono truncate text-[11px] uppercase tracking-[0.08em] text-black/40" data-testid="help-answer-q">“{a.q}”</p>
        </div>
        <p className="mt-4 text-[20px] leading-[1.55] text-[#141414] max-sm:text-[17px]" data-testid="help-answer-text">
          {shown}{!done && <span className="hc-caret" aria-hidden />}
          {done && a.sources.map((s, i) => <Link key={s.id} to={`/help/article/${s.id}`} className="hc-mono ml-1 inline-flex h-5 min-w-5 -translate-y-0.5 items-center justify-center rounded-md bg-[#EFEBE2] px-1 align-middle text-[11px] font-semibold transition-colors hover:bg-[#141414] hover:text-white" aria-label={`Source ${i + 1}: ${s.title}`} data-testid={`help-source-inline-${i + 1}`}>{i + 1}</Link>)}
        </p>
        <div className={cn('mt-6 space-y-6', reveal)}>
          {a.action === 'track' && <OrderLookup />}
          {a.action === 'edit' && <OrderLookup edit />}
          {a.action === 'return' && <ReturnAction />}
          {a.action === 'size' && <SizeAction />}
          {a.sources.length > 0 && (
            <div className="flex flex-wrap gap-2" data-testid="help-sources">
              {a.sources.map((s, i) => (
                <Link key={s.id} to={`/help/article/${s.id}`} className="group inline-flex max-w-full items-center gap-2 rounded-full bg-[#F3F0E9] py-1.5 pl-1.5 pr-3.5 text-[13px] transition-colors hover:bg-[#141414] hover:text-white" data-testid={`help-source-${i + 1}`}>
                  <span className="hc-mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#141414]">{i + 1}</span>
                  <span className="truncate">{s.title}</span>
                </Link>
              ))}
            </div>
          )}
          {!a.confident && (
            <div className="space-y-2" data-testid="help-fallback">{a.related.map((r, i) => <ArticleLink key={r.id} a={r} i={i} />)}</div>
          )}
          {a.followUps.length > 0 && (
            <div data-testid="help-followups">
              <p className="hc-mono text-[11px] uppercase tracking-[0.14em] text-black/45">Ask next</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {a.followUps.map((f, i) => <button key={f} type="button" onClick={() => onAsk(f)} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] ring-1 ring-black/15 transition-colors hover:bg-[#141414] hover:text-white hover:ring-[#141414]" data-testid={`help-followup-${i}`}>{f}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></button>)}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-5">
            {a.confident ? <Vote /> : <span className="hc-mono text-[12px] uppercase tracking-[0.08em] text-black/60">Our crew replies within a day</span>}
            <button type="button" onClick={() => openChat(a.q, a.text)} className="hc-mono inline-flex h-11 items-center gap-2 rounded-full bg-[#141414] px-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-transform hover:scale-[1.02]" data-testid="help-continue-chat">
              <MessageCircle className="h-4 w-4" aria-hidden />{a.confident ? 'Continue in chat' : 'Chat with us'}
            </button>
          </div>
        </div>
      </article>
      {a.confident && a.related.length > 0 && (
        <section className={cn('mt-8', reveal)} data-testid="help-related">
          <h3 className="hc-display text-[18px]">Related articles</h3>
          <div className="mt-4 grid gap-2 md:grid-cols-3">{a.related.map((r) => <ArticleLink key={r.id} a={r} />)}</div>
        </section>
      )}
    </div>
  )
}
