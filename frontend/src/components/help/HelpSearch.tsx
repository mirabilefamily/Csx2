import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, Sparkles } from 'lucide-react'
import { helpApi } from '@/api'
import { cn } from '@/lib/utils'

interface Props { onAsk: (q: string) => void; topic?: string; placeholder?: string; compact?: boolean; hotkey?: boolean; testId?: string }

const isTyping = (e: KeyboardEvent) => !!(e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')

export function HelpSearch({ onAsk, topic, placeholder = 'Ask anything — orders, returns, sizing, Friday Drops…', compact, hotkey = true, testId = 'help-search' }: Props) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const items = useMemo(() => helpApi.suggest(q, topic), [q, topic])
  useEffect(() => { setIdx(-1) }, [q])
  useEffect(() => {
    if (!hotkey) return
    const f = (e: KeyboardEvent) => { if (e.key === '/' && !isTyping(e)) { e.preventDefault(); input.current?.focus() } }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [hotkey])
  const submit = (text = q) => {
    const t = text.trim()
    if (!t) return
    setOpen(false); setQ(t); input.current?.blur(); onAsk(t)
  }
  const pick = (i: number) => { const s = items[i]; if (!s) return submit(); if (s.kind === 'article' && s.id) navigate(`/help/article/${s.id}`); else submit(s.label) }
  const show = open && items.length > 0

  return (
    <div className="relative w-full" data-testid={testId}>
      <form onSubmit={(e) => { e.preventDefault(); idx >= 0 ? pick(idx) : submit() }} role="search"
        className={cn('flex items-center gap-3 bg-white pl-5 pr-2 shadow-[0_1px_0_rgb(0_0_0/.04),0_18px_40px_-18px_rgb(0_0_0/.45)] ring-1 ring-black/5 transition-shadow focus-within:ring-2 focus-within:ring-[#141414]', compact ? 'h-14 rounded-xl' : 'h-[68px] rounded-2xl max-sm:h-16 max-sm:pl-4')}>
        <Sparkles className="h-5 w-5 shrink-0 text-[#35B54A]" aria-hidden />
        <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setOpen(true); setIdx((i) => (i + 1) % items.length) }
            else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setIdx((i) => (i <= 0 ? items.length - 1 : i - 1)) }
            else if (e.key === 'Escape') setOpen(false)
          }}
          placeholder={placeholder} aria-label="Ask a question" role="combobox" aria-expanded={show} aria-controls={`${testId}-list`} aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent text-[17px] text-[#141414] placeholder:text-[#141414]/45 focus:outline-none max-sm:text-[16px]" data-testid={`${testId}-input`} />
        {hotkey && !q && <kbd className="hc-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-black/15 text-[12px] text-[#141414]/60 max-sm:hidden" aria-hidden>/</kbd>}
        <button type="submit" className={cn('hc-mono flex shrink-0 items-center gap-2 rounded-xl bg-[#141414] px-5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-[background-color,transform] hover:bg-black active:scale-[.98]', compact ? 'h-10' : 'h-12 max-sm:h-11 max-sm:px-4')} data-testid={`${testId}-submit`}>
          Ask<ArrowRight className="h-4 w-4 max-sm:hidden" aria-hidden />
        </button>
      </form>
      {show && (
        <ul id={`${testId}-list`} role="listbox" className="hc-box absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-white p-1.5 text-left shadow-[0_24px_60px_-20px_rgb(0_0_0/.5)] ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150" data-testid={`${testId}-suggestions`}>
          {items.map((s, i) => (
            <li key={`${s.kind}-${s.label}`} role="option" aria-selected={i === idx}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(i)} onMouseEnter={() => setIdx(i)}
                className={cn('flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors', i === idx ? 'bg-[#EFEBE2]' : 'hover:bg-[#F5F2EC]')} data-testid={`${testId}-suggestion-${i}`}>
                {s.kind === 'question' ? <Sparkles className="h-4 w-4 shrink-0 text-[#35B54A]" aria-hidden /> : <FileText className="h-4 w-4 shrink-0 text-[#141414]/50" aria-hidden />}
                <span className="min-w-0 flex-1 truncate text-[15px] text-[#141414]">{s.label}</span>
                <span className="hc-mono shrink-0 text-[11px] uppercase tracking-[0.08em] text-[#141414]/50">{s.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
