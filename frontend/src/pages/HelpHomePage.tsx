import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { helpApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { HelpShell } from '@/components/help/HelpShell'
import { HelpSearch } from '@/components/help/HelpSearch'
import { AnswerCard } from '@/components/help/AnswerCard'
import { ChatLine, Thinking, useAsk } from '@/components/help/helpKit'
import { Skeleton } from '@/components/ui/skeleton'

const QUICK: [label: string, q: string][] = [
  ['Where is my order?', 'Where is my order?'], ['Returns & exchanges', 'How do I start a return?'], ['Can I cancel / edit my order?', 'Can I cancel / edit my order?'],
  ['Find my size', 'What size am I?'], ['Wholesale inquiry', 'Wholesale inquiry'], ['Brand ambassadors & talent', 'Brand ambassadors & talent inquiry'],
]
const POPULAR = ['How long do returns take?', 'What size am I?', 'When is the next Friday Drop?']

export default function HelpHomePage() {
  const { answer, busy, ask, ref } = useAsk()
  const { data: topics } = useApi(() => helpApi.listTopics(), [])
  const total = topics?.reduce((n, t) => n + t.count, 0) ?? 0
  return (
    <HelpShell>
      <div className="mx-auto max-w-[1200px] space-y-12 max-sm:space-y-10">
        <section className="hc-halftone hc-hero relative flex h-[320px] items-center justify-center px-6 max-sm:h-auto max-sm:px-4 max-sm:py-10" data-testid="help-hero">
          <img src="/images/help/hero-desert.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative z-10 w-full max-w-[720px] text-center">
            <h1 className="hc-display text-[clamp(28px,3.6vw,52px)] leading-none text-white [text-shadow:0_2px_24px_rgb(0_0_0/.45)]" data-testid="help-hero-title">How can we help?</h1>
            <div className="mt-6"><HelpSearch onAsk={ask} /></div>
            <div className="mt-4 flex flex-wrap justify-center gap-2" data-testid="help-popular">
              {POPULAR.map((q, i) => <button key={q} type="button" onClick={() => ask(q)} className="hc-chip hc-mono border border-white/40 bg-black/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] text-white backdrop-blur-md transition-colors hover:bg-white hover:text-[#141414]" data-testid={`help-popular-${i}`}>{q}</button>)}
            </div>
          </div>
        </section>

        <div ref={ref} className="scroll-mt-6 empty:hidden">
          {(busy || answer) && <div className="mx-auto max-w-[960px]">{busy ? <Thinking /> : answer && <AnswerCard key={answer.q} a={answer} onAsk={ask} />}</div>}
        </div>

        <section className="grid grid-cols-2 gap-2 max-sm:grid-cols-1" aria-label="Quick questions" data-testid="help-quick">
          {QUICK.map(([label, q], i) => (
            <button key={label} type="button" onClick={() => ask(q)} className="hc-card hc-mono group flex h-14 items-center justify-between bg-white px-5 text-left text-[13px] font-semibold uppercase tracking-[0.06em]" data-testid={`help-quick-${i}`}>
              {label}<ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          ))}
        </section>

        <section aria-labelledby="help-topics-label" data-testid="help-library">
          <p id="help-topics-label" className="hc-mono text-[12px] uppercase tracking-[0.14em] text-black/60" data-testid="help-topics-label">Browse topics{topics ? ` · ${total} articles` : ''}</p>
          <ul className="mt-4 grid grid-cols-3 gap-x-10 border-t border-[#141414]/12 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {!topics && Array.from({ length: 9 }, (_, i) => <li key={i} className="border-b border-[#141414]/12 py-4"><Skeleton className="h-5" /></li>)}
            {topics?.map((t) => (
              <li key={t.slug} className="border-b border-[#141414]/12">
                <Link to={`/help/topic/${t.slug}`} className="group flex items-center gap-3 py-4 text-[15px] font-medium transition-colors hover:text-black/60" data-testid={`help-topic-${t.slug}`}>
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="text-[13px] font-normal text-black/50">{t.count} article{t.count === 1 ? '' : 's'}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <ChatLine />
      </div>
    </HelpShell>
  )
}
