import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CreditCard, Handshake, MessageCircle, Package, PencilLine, Ruler, ShieldCheck, Sparkles, Store, Truck, Undo2, Zap, type LucideIcon } from 'lucide-react'
import { helpApi } from '@/api'
import type { HelpAnswer, HelpTopic } from '@/api/help'
import { useApi } from '@/hooks/useApi'
import { HelpShell, openChat } from '@/components/help/HelpShell'
import { HelpSearch } from '@/components/help/HelpSearch'
import { AnswerCard } from '@/components/help/AnswerCard'
import { Skeleton } from '@/components/ui/skeleton'

export const TOPIC_ICON: Record<HelpTopic['icon'], LucideIcon> = { truck: Truck, undo: Undo2, ruler: Ruler, sparkles: Sparkles, zap: Zap, card: CreditCard, store: Store, badge: BadgeCheck, shield: ShieldCheck }
const TILES: [string, string, LucideIcon][] = [
  ['Where is my order?', 'Where is my order?', Package], ['Returns & exchanges', 'How do I start a return?', Undo2], ['Can I cancel / edit my order?', 'Can I cancel / edit my order?', PencilLine],
  ['Friday Drops info', 'How do Friday Drops work?', Zap], ['Wholesale inquiry', 'Wholesale inquiry', Store], ['Brand ambassadors & talent', 'Brand ambassadors & talent inquiry', Handshake], ['Find my size', 'What size am I?', Ruler],
]

export function useAsk(opts?: { topic?: string; articleId?: string }) {
  const [answer, setAnswer] = useState<HelpAnswer | null>(null)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ask = async (q: string) => {
    setBusy(true)
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    try { setAnswer(await helpApi.ask(q, opts)) } finally { setBusy(false) }
  }
  return { answer, busy, ask, ref }
}

export function Thinking() {
  return <div className="rounded-[22px] bg-white p-8 max-sm:p-5" data-testid="help-thinking"><p className="hc-mono flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-black/50"><Sparkles className="h-3.5 w-3.5 animate-pulse text-[#35B54A]" aria-hidden />Reading the help library…</p><Skeleton className="mt-5 h-5 w-11/12" /><Skeleton className="mt-3 h-5 w-3/4" /></div>
}

export function ChatCard() {
  return (
    <aside className="relative flex flex-col overflow-hidden rounded-[22px] bg-[#141414] p-8 text-[#D9D4C7] max-sm:p-6" data-testid="help-chat-card">
      <p className="hc-mono text-[11px] uppercase tracking-[0.18em] text-[#D9D4C7]/60">A conversation starts here</p>
      <h2 className="hc-display mt-4 text-[34px] leading-[0.95] text-white max-sm:text-[30px]">Let's talk<br />it through.</h2>
      <p className="mt-4 text-[15px] text-[#D9D4C7]/80">AI answers instantly · our crew replies within a day.</p>
      <div className="mt-6 flex -space-x-2" aria-hidden>
        {['AM', 'SO', 'JR'].map((x) => <span key={x} className="hc-mono flex h-9 w-9 items-center justify-center rounded-full bg-[#D9D4C7] text-[11px] font-semibold text-[#141414] ring-2 ring-[#141414]">{x}</span>)}
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#35B54A] ring-2 ring-[#141414]"><Sparkles className="h-4 w-4 text-[#141414]" /></span>
      </div>
      <div className="mt-auto pt-10">
        <button type="button" onClick={() => openChat()} className="hc-mono inline-flex h-12 w-full items-center justify-between rounded-full bg-[#35B54A] px-6 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#141414] transition-transform hover:scale-[1.02]" data-testid="help-open-chat">Open chat<ArrowRight className="h-4 w-4" aria-hidden /></button>
        <p className="hc-mono mt-3 text-center text-[11px] uppercase tracking-[0.08em] text-[#D9D4C7]/50">Opening chat won't send a message.</p>
      </div>
    </aside>
  )
}

export default function HelpHomePage() {
  const { answer, busy, ask, ref } = useAsk()
  const { data: topics } = useApi(() => helpApi.listTopics(), [])
  const total = topics?.reduce((n, t) => n + t.count, 0) ?? 0
  return (
    <HelpShell>
      <section className="mx-auto max-w-[1440px] pb-8 pt-4 max-sm:pt-0">
        <p className="hc-mono text-[12px] uppercase tracking-[0.2em] text-black/60" data-testid="help-eyebrow">Goorin customer support</p>
        <h1 className="hc-display mt-3 text-[clamp(40px,7.3vw,112px)] leading-[0.86]" data-testid="help-title">Customer support</h1>
      </section>
      <section className="hc-halftone relative mx-auto flex min-h-[540px] max-w-[1440px] items-center justify-center rounded-[22px] px-6 py-20 max-sm:min-h-0 max-sm:rounded-2xl max-sm:px-4 max-sm:py-12" data-testid="help-hero">
        <img src="/images/help/hero-desert.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative z-10 w-full max-w-[760px] text-center">
          <h2 className="hc-mono text-[clamp(22px,3.2vw,40px)] font-medium uppercase tracking-[0.04em] text-white [text-shadow:0_2px_24px_rgb(0_0_0/.5)]" data-testid="help-hero-title">Hi, how can we help?</h2>
          <div className="mt-8 max-sm:mt-6"><HelpSearch onAsk={ask} /></div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 max-sm:hidden" data-testid="help-popular">
            {['How long do returns take?', 'What size am I?', 'When is the next Friday Drop?'].map((q) => <button key={q} type="button" onClick={() => ask(q)} className="hc-mono rounded-full bg-white/10 px-4 py-2 text-[12px] uppercase tracking-[0.06em] text-white ring-1 ring-white/40 backdrop-blur-md transition-colors hover:bg-white hover:text-[#141414]" data-testid={`help-popular-${q.slice(0, 8).toLowerCase().replace(/\W/g, '')}`}>{q}</button>)}
          </div>
        </div>
      </section>
      <div ref={ref} className="scroll-mt-6">
        {(busy || answer) && <section className="mx-auto max-w-[1040px] pt-12">{busy ? <Thinking /> : answer && <AnswerCard key={answer.q} a={answer} onAsk={ask} />}</section>}
      </div>
      <section className="mx-auto max-w-[1440px] pt-16" data-testid="help-tiles">
        <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {TILES.map(([label, q, I], i) => (
            <button key={label} type="button" onClick={() => ask(q)} className="hc-rise group flex min-h-[132px] flex-col justify-between rounded-2xl bg-white p-5 text-left transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-[0_22px_40px_-24px_rgb(0_0_0/.55)] max-sm:min-h-0 max-sm:flex-row max-sm:items-center max-sm:gap-4" style={{ animationDelay: `${i * 50}ms` }} data-testid={`help-tile-${i}`}>
              <I className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              <span className="flex items-end justify-between gap-3 max-sm:flex-1 max-sm:items-center"><span className="hc-mono text-[14px] font-bold uppercase leading-snug tracking-[0.04em]">{label}</span><ArrowRight className="h-4 w-4 shrink-0 transition-[transform,color] group-hover:translate-x-1 group-hover:text-[#35B54A]" aria-hidden /></span>
            </button>
          ))}
          <button type="button" onClick={() => document.querySelector<HTMLInputElement>('[data-testid="help-search-input"]')?.focus()} className="group flex min-h-[132px] flex-col justify-between rounded-2xl bg-[#141414] p-5 text-left text-[#D9D4C7] max-sm:min-h-0 max-sm:flex-row max-sm:items-center" data-testid="help-tile-ask">
            <Sparkles className="h-6 w-6 text-[#35B54A]" aria-hidden />
            <span className="hc-mono text-[14px] font-bold uppercase tracking-[0.04em]">Ask anything <kbd className="ml-1 rounded border border-white/25 px-1.5 text-[11px]">/</kbd></span>
          </button>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] pt-24 max-sm:pt-16" data-testid="help-library">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="hc-display text-[clamp(28px,4vw,52px)] leading-[0.9]">Explore the help library</h2>
          <p className="hc-mono text-[12px] uppercase tracking-[0.12em] text-black/55">{topics ? `${topics.length} topics · ${total} articles` : ''}</p>
        </div>
        <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-3 sm:grid-cols-2">
            {!topics && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}
            {topics?.map((t) => { const I = TOPIC_ICON[t.icon]; return (
              <Link key={t.slug} to={`/help/topic/${t.slug}`} className="group flex items-center gap-4 rounded-2xl bg-[#E8E4DA] p-5 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-white" data-testid={`help-topic-${t.slug}`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D9D4C7] transition-colors group-hover:bg-[#141414] group-hover:text-[#D9D4C7]"><I className="h-5 w-5" strokeWidth={1.75} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-[16px] font-semibold">{t.title}</span><span className="hc-mono mt-0.5 block text-[11px] uppercase tracking-[0.1em] text-black/50">{t.count} article{t.count === 1 ? '' : 's'}</span></span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            ) })}
          </div>
          <ChatCard />
        </div>
      </section>
    </HelpShell>
  )
}

export function MiniChatLink() {
  return <button type="button" onClick={() => openChat()} className="hc-mono inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.1em] underline-offset-4 hover:underline" data-testid="help-mini-chat"><MessageCircle className="h-4 w-4" aria-hidden />Chat with us</button>
}
