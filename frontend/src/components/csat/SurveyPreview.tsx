import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUp, ImagePlus, RotateCcw, ShoppingBag, Star, X } from 'lucide-react'
import type { CsatQuestion, CsatStyle, CsatSurvey } from '@/types'
import { cn } from '@/lib/utils'

const EMOJI = ['😞', '🙁', '😐', '🙂', '😄']
const VARS: Record<string, string> = { first_name: 'Margaret', ticket_subject: 'Fedora arrived crushed', agent_name: 'Ava' }
const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k) => VARS[k] ?? m)
const delayText = (s: CsatSurvey) => { const { value, unit } = s.sendDelay; return `${value} ${value === 1 ? unit.slice(0, -1) : unit}` }
const ratingLabel = (n: number, style: CsatStyle) => (style === 'stars' ? `${n} star${n === 1 ? '' : 's'}` : style === 'emoji' ? `${EMOJI[n - 1]} ${n}/5` : `${n} / 5`)

// One-tap rating used in chat, email and survey page (REQ-1013, REQ-1018).
function Rating({ style, value, onPick, size = 'lg', testId }: { style: CsatStyle; value?: number; onPick: (n: number) => void; size?: 'lg' | 'md'; testId: string }) {
  return (
    <div className={cn('flex gap-1.5', style !== 'stars' && 'gap-2')} role="radiogroup" aria-label="Rating" data-testid={testId} data-style={style}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== undefined && (style === 'stars' ? n <= value : n === value)
        return (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} out of 5`} onClick={() => onPick(n)} data-testid={`${testId}-${n}`}
            className={cn('inline-flex items-center justify-center transition-[transform,background-color,color] duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              style === 'stars' && cn(size === 'lg' ? 'h-11 w-11' : 'h-9 w-9', on ? 'text-amber-500' : 'text-[#C9C4BC]'),
              style === 'emoji' && cn('rounded-full ring-1', size === 'lg' ? 'h-12 w-12 text-2xl' : 'h-10 w-10 text-xl', on ? 'bg-[#1F1D1A]/[0.06] ring-[#1F1D1A]' : 'bg-white ring-[#E5E2DC]'),
              style === 'numeric' && cn('rounded-full font-semibold tabular-nums ring-1', size === 'lg' ? 'h-11 min-w-11 px-3 text-base' : 'h-9 min-w-9 px-2.5 text-sm', on ? 'bg-[#1F1D1A] text-white ring-[#1F1D1A]' : 'bg-white text-[#1F1D1A] ring-[#E5E2DC]'))}>
            {style === 'stars' ? <Star className={size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'} fill={on ? 'currentColor' : 'none'} strokeWidth={1.6} aria-hidden /> : style === 'emoji' ? <span aria-hidden>{EMOJI[n - 1]}</span> : n}
          </button>
        )
      })}
    </div>
  )
}

const Fbtn = ({ children, label, pill }: { children: React.ReactNode; label: string; pill?: boolean }) => <span aria-label={label} className={cn('inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-medium text-[#1F1D1A] shadow-[0_1px_2px_rgba(31,29,26,.06),0_6px_18px_rgba(31,29,26,.10)]', pill ? 'px-4' : 'w-11')}>{children}</span>
const Ai = ({ children, testId }: { children: React.ReactNode; testId?: string }) => <p className="max-w-[92%] text-[15px] leading-[1.55] text-[#1F1D1A]" data-testid={testId}>{children}</p>
const Me = ({ children, testId }: { children: React.ReactNode; testId?: string }) => <p className="ml-auto max-w-[78%] rounded-[22px] bg-[#F2F3F5] px-5 py-3 text-[15px] leading-[1.45] text-[#1F1D1A]" data-testid={testId}>{children}</p>

type Answer = string | number
// Chat preview: the survey inside the phase-18 widget look (REQ-1012..1016).
function ChatPreview({ s }: { s: CsatSurvey }) {
  const [answers, setAnswers] = useState<Answer[]>([])
  const [text, setText] = useState('')
  const qs = s.questions
  useEffect(() => { setAnswers([]) }, [s.ratingStyle, qs.length])
  const step = answers.length, done = step >= qs.length
  const answer = (v: Answer) => { setAnswers((a) => [...a, v]); setText('') }
  const shown = (q: CsatQuestion, v: Answer) => (q.type === 'rating' ? ratingLabel(Number(v), s.ratingStyle) : String(v) || 'Skipped')
  const cur = qs[step]
  const off = !s.channels.inlineChat
  return (
    <div className="relative mx-auto flex h-[640px] w-full max-w-[400px] flex-col overflow-hidden rounded-[36px] bg-white shadow-[0_2px_6px_rgba(31,29,26,.04),0_18px_48px_rgba(31,29,26,.12)]" data-testid="csat-chat-preview">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-white via-white/90 to-transparent p-4 pb-7">
        <Fbtn label="Back"><ArrowLeft className="h-[18px] w-[18px]" aria-hidden /></Fbtn>
        <span className="ml-auto" /><Fbtn label="Cart"><ShoppingBag className="h-[18px] w-[18px]" aria-hidden /></Fbtn><Fbtn label="Track orders" pill>Track orders</Fbtn><Fbtn label="Close"><X className="h-[18px] w-[18px]" aria-hidden /></Fbtn>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4 pt-[84px]" data-testid="csat-chat-thread">
        <Me>My fedora arrived crushed. Can you help?</Me>
        <Ai>So sorry about that, Margaret. I’ve sent a replacement Hampton Wool Fedora by overnight shipping. You’ll get tracking by email within the hour.</Ai>
        <Me>Perfect, thank you!</Me>
        {off ? <p className="mx-auto mt-2 rounded-full bg-[#F2F3F5] px-3 py-1 text-xs text-[#6b645c]" data-testid="csat-chat-off">Chat surveys are off.</p> : (
          <>
            <Ai testId="csat-chat-prompt">{fill(s.messages.chatPrompt) || <span className="italic text-[#9a948c]">Chat prompt</span>}</Ai>
            {qs.slice(0, step + 1).map((q, i) => (
              <div key={q.id} className="flex flex-col gap-3">
                {i > 0 && <Ai testId={`csat-chat-q-${i}`}>{q.label}{!q.required && <span className="text-[#6b645c]"> (optional)</span>}</Ai>}
                {i < step ? <Me testId={`csat-chat-answer-${i}`}>{shown(q, answers[i])}</Me>
                  : q.type === 'rating' ? <div className="flex flex-col gap-1.5">{i === 0 && <span className="text-xs text-[#6b645c]">{q.label}</span>}<Rating style={s.ratingStyle} onPick={answer} testId="csat-chat-rating" /></div>
                  : q.type === 'choice' ? <div className="flex flex-col items-start gap-2.5" data-testid="csat-chat-options">{(q.options ?? []).map((o) => <button key={o} type="button" onClick={() => answer(o)} className="min-h-11 rounded-full bg-white px-[18px] py-2.5 text-[15px] text-[#1F1D1A] ring-1 ring-[#E5E2DC] transition-[background-color,transform] duration-150 hover:translate-x-0.5 hover:bg-[#F7F7F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`csat-chat-option-${o}`}>{o}</button>)}{!q.required && <button type="button" onClick={() => answer('')} className="px-2 text-[13px] text-[#6b645c] underline underline-offset-2">Skip</button>}</div>
                  : <span className="text-xs text-[#6b645c]">Type below, or <button type="button" onClick={() => answer('')} className="underline underline-offset-2" data-testid="csat-chat-skip">skip</button>.</span>}
              </div>
            ))}
            {done && <Ai testId="csat-chat-thanks">{fill(s.messages.thanks)}</Ai>}
            {done && <button type="button" onClick={() => setAnswers([])} className="inline-flex items-center gap-1.5 self-start rounded-full px-1 text-[13px] font-medium text-[#6b645c] hover:text-[#1F1D1A]" data-testid="csat-chat-restart"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Restart preview</button>}
          </>
        )}
      </div>
      <div className="relative shrink-0 px-4 pb-3 before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-b before:from-transparent before:to-white">
        <form onSubmit={(e) => { e.preventDefault(); if (cur?.type === 'text' && text.trim()) answer(text.trim()) }} className="flex h-14 items-center gap-1 rounded-full bg-white pl-5 pr-2 shadow-[0_1px_2px_rgba(31,29,26,.06),0_8px_24px_rgba(31,29,26,.12)]">
          <label htmlFor="csat-chat-input" className="sr-only">Reply</label>
          <input id="csat-chat-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply" className="min-w-0 flex-1 bg-transparent text-[15px] text-[#1F1D1A] placeholder:text-[#6b645c] focus:outline-none" data-testid="csat-chat-input" />
          <ImagePlus className="h-5 w-5 text-[#6b645c]" aria-hidden />
          {text.trim() && <button type="submit" aria-label="Send" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1F1D1A] text-white" data-testid="csat-chat-send"><ArrowUp className="h-[18px] w-[18px]" aria-hidden /></button>}
        </form>
        <p className="pt-2 text-center text-[11px] text-[#6b645c]"><span className="underline">AI notice</span> • <span className="underline">Privacy</span></p>
      </div>
    </div>
  )
}

// Email frame + modern template, and the survey page it opens (REQ-1017..1021).
function EmailPreview({ s }: { s: CsatSurvey }) {
  const [view, setView] = useState<'email' | 'page'>('email')
  const [rating, setRating] = useState<number>()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const first = s.questions[0]
  const off = !s.channels.email
  const open = (n: number) => { setRating(n); setSent(false); setView('page') }
  return (
    <div className="space-y-3" data-testid="csat-email-preview">
      <div role="tablist" aria-label="Email preview view" className="inline-flex gap-1 rounded-lg bg-surface-muted p-1">
        {(['email', 'page'] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn('h-7 rounded-md px-3 text-xs font-medium transition-colors', view === v ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`csat-email-view-${v}`}>{v === 'email' ? 'Email' : 'Survey page'}</button>)}
      </div>
      {view === 'email' ? (
        <div className={cn('overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/[0.06]', off && 'opacity-50 grayscale')} data-testid="csat-email-frame">
          <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-[#EEEBE6] bg-[#FAFAF9] px-5 py-3.5 text-[13px]">
            <dt className="text-ink-muted">From</dt><dd className="truncate text-ink" data-testid="csat-email-from">Goorin Bros. Support &lt;support@goorin.com&gt;</dd>
            <dt className="text-ink-muted">To</dt><dd className="text-ink">Margaret Okonkwo</dd>
            <dt className="text-ink-muted">Subject</dt><dd className="font-semibold text-ink" data-testid="csat-email-subject">{fill(s.messages.subject) || <span className="font-normal italic text-ink-muted">No subject</span>}</dd>
          </dl>
          <p className="border-b border-[#EEEBE6] px-5 py-1.5 text-[11px] text-ink-muted" data-testid="csat-email-sent">Sent {delayText(s)} after resolution</p>
          <div className="px-8 py-8">
            <p className="text-[18px] font-black tracking-[0.18em] text-[#1F1D1A]" data-testid="csat-email-wordmark">GOORIN</p>
            <p className="mt-6 text-[15px] leading-[1.6] text-[#3A332C]" data-testid="csat-email-intro">Hi Margaret,<br />{fill(s.messages.intro)}</p>
            {first && <p className="mt-6 text-[15px] font-semibold text-[#1F1D1A]">{first.label}</p>}
            <div className="mt-3"><Rating style={s.ratingStyle} value={rating} onPick={open} size="md" testId="csat-email-rating" /></div>
            <p className="mt-2 text-xs text-[#6b645c]">Tap to answer, it takes 10 seconds.</p>
            <p className="mt-8 text-[14px] leading-[1.6] text-[#3A332C]" data-testid="csat-email-signature">Warmly,<br />Ava and the Goorin Bros. team</p>
            <p className="mt-8 border-t border-[#EEEBE6] pt-4 text-[11px] leading-[1.6] text-[#8A847C]" data-testid="csat-email-footer">You’re getting this because you contacted Goorin Bros. support. <span className="underline">Unsubscribe from surveys</span></p>
          </div>
        </div>
      ) : (
        <div className={cn('overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/[0.06]', off && 'opacity-50 grayscale')} data-testid="csat-survey-page">
          <div className="flex items-center gap-2 border-b border-[#EEEBE6] bg-[#FAFAF9] px-4 py-2"><span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-[#E5E2DC]" />)}</span><span className="ml-2 truncate rounded-md bg-white px-2 py-0.5 text-[11px] text-ink-muted ring-1 ring-[#EEEBE6]">goorin.com/feedback</span></div>
          <div className="px-8 py-8">
            <p className="text-[18px] font-black tracking-[0.18em] text-[#1F1D1A]">GOORIN</p>
            {sent ? <p className="mt-8 text-[17px] font-semibold leading-snug text-[#1F1D1A]" data-testid="csat-page-thanks">{fill(s.messages.thanks)}</p> : (
              <div className="mt-6 space-y-6">
                {s.questions.map((q) => (
                  <div key={q.id}>
                    <p className="text-[15px] font-semibold text-[#1F1D1A]">{q.label}{!q.required && <span className="font-normal text-[#6b645c]"> (optional)</span>}</p>
                    <div className="mt-2.5">
                      {q.type === 'rating' ? <Rating style={s.ratingStyle} value={q.id === first?.id ? rating : Number(answers[q.id]) || undefined} onPick={(n) => (q.id === first?.id ? setRating(n) : setAnswers((a) => ({ ...a, [q.id]: String(n) })))} size="md" testId={`csat-page-rating-${q.id}`} />
                        : q.type === 'choice' ? <div className="flex flex-wrap gap-2">{(q.options ?? []).map((o) => <button key={o} type="button" aria-pressed={answers[q.id] === o} onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))} className={cn('min-h-10 rounded-full px-4 text-sm ring-1 transition-colors', answers[q.id] === o ? 'bg-[#1F1D1A] text-white ring-[#1F1D1A]' : 'bg-white text-[#1F1D1A] ring-[#E5E2DC] hover:bg-[#F7F7F8]')} data-testid={`csat-page-option-${o}`}>{o}</button>)}</div>
                        : <textarea aria-label={q.label} className="min-h-[76px] w-full rounded-2xl bg-[#F7F7F8] px-4 py-3 text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-ring" />}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setSent(true)} className="h-11 rounded-full bg-[#1F1D1A] px-6 text-sm font-medium text-white transition-transform active:scale-[0.98]" data-testid="csat-page-send">Send feedback</button>
              </div>
            )}
          </div>
        </div>
      )}
      {off && <p className="text-xs text-ink-muted" data-testid="csat-email-off">Email surveys are off.</p>}
    </div>
  )
}

export function SurveyPreview({ survey }: { survey: CsatSurvey }) {
  const [mode, setMode] = useState<'chat' | 'email'>('chat')
  return (
    <div className="space-y-4" data-testid="survey-preview">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-ink max-lg:hidden">Preview</p>
        <div role="tablist" aria-label="Preview channel" className="inline-flex gap-1 rounded-lg bg-surface-muted p-1">
          {(['chat', 'email'] as const).map((m) => <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn('h-8 rounded-md px-4 text-sm capitalize transition-colors', mode === m ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`csat-preview-${m}`}>{m}</button>)}
        </div>
      </div>
      <div className="rounded-2xl bg-[#EFEBE4] p-4 sm:p-6" data-testid="csat-preview-canvas">{mode === 'chat' ? <ChatPreview s={survey} /> : <EmailPreview s={survey} />}</div>
    </div>
  )
}
