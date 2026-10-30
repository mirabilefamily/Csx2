import { ChevronRight } from 'lucide-react'
import { HelpShell } from '@/components/help/HelpShell'
import { HelpSearch } from '@/components/help/HelpSearch'
import { AnswerCard } from '@/components/help/AnswerCard'
import { ChatLine, Thinking, useAsk } from '@/components/help/helpKit'

const QUICK: [label: string, q: string][] = [
  ['Where is my order?', 'Where is my order?'], ['Returns & exchanges', 'How do I start a return?'], ['Can I cancel / edit my order?', 'Can I cancel / edit my order?'],
  ['Find my size', 'What size am I?'], ['Shipping times & international', 'How long does shipping take?'], ['Damaged or defective item', 'My hat arrived damaged'],
  ['Friday Drops info', 'How do Friday Drops work?'], ['Payments & gift cards', 'Payment methods we accept'],
  ['Wholesale inquiry', 'Wholesale inquiry'], ['Brand ambassadors & talent', 'Brand ambassadors & talent inquiry'],
]
const POPULAR = ['How long do returns take?', 'What size am I?', 'When is the next Friday Drop?']

export default function HelpHomePage() {
  const { answer, busy, ask, ref } = useAsk()
  return (
    <HelpShell>
      <div className="mx-auto max-w-[1200px]">
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

        <div ref={ref} className="scroll-mt-6">
          {(busy || answer) && <div className="mx-auto mt-12 max-w-[960px] max-sm:mt-8">{busy ? <Thinking /> : answer && <AnswerCard key={answer.q} a={answer} onAsk={ask} />}</div>}
        </div>

        <section className="mt-12 grid grid-cols-2 gap-4 max-sm:mt-8 max-sm:grid-cols-1 max-sm:gap-3" aria-label="Quick questions" data-testid="help-quick">
          {QUICK.map(([label, q], i) => (
            <button key={label} type="button" onClick={() => ask(q)} className="hc-card hc-mono group flex h-16 items-center justify-between gap-4 bg-white px-6 text-left text-[13px] font-semibold uppercase tracking-[0.06em] max-sm:h-14 max-sm:px-5" data-testid={`help-quick-${i}`}>
              {label}<ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          ))}
        </section>

        <div className="mt-16 max-sm:mt-8"><ChatLine /></div>
      </div>
    </HelpShell>
  )
}
