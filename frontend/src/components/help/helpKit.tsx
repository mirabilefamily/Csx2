import { useRef, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { helpApi } from '@/api'
import type { HelpAnswer } from '@/api/help'
import { Skeleton } from '@/components/ui/skeleton'
import { openChat } from './HelpShell'

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
  return <div className="hc-box bg-white p-6 max-sm:p-5" data-testid="help-thinking"><p className="hc-mono flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-black/50"><Sparkles className="h-3.5 w-3.5 animate-pulse text-[#35B54A]" aria-hidden />Reading the help library…</p><Skeleton className="mt-4 h-5 w-11/12" /><Skeleton className="mt-3 h-5 w-3/4" /></div>
}

export function ChatLine() {
  return (
    <section className="hc-box flex items-center justify-between gap-6 bg-white px-8 py-7 max-sm:flex-col max-sm:items-stretch max-sm:gap-4 max-sm:px-5 max-sm:py-5" data-testid="help-chat-line">
      <p className="text-[15px] text-black/75"><span className="font-semibold text-[#141414]">Still need help?</span> Our AI answers instantly, and our crew replies within a day.</p>
      <button type="button" onClick={() => openChat()} className="hc-mono inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-[#141414] px-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-black" data-testid="help-open-chat">Open chat<ArrowRight className="h-4 w-4" aria-hidden /></button>
    </section>
  )
}
