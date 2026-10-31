import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronRight, Search } from 'lucide-react'
import { helpApi } from '@/api'
import type { HelpArticle } from '@/api/help'
import { cn } from '@/lib/utils'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="group -ml-1 inline-flex h-10 items-center gap-2 px-1 text-[15px] font-medium text-[#141414] underline-offset-4 hover:underline" data-testid="help-back">
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />{label}
    </Link>
  )
}

export function Crumbs({ items }: { items: [string, string?][] }) {
  return (
    <nav aria-label="Breadcrumb" className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-black/55 max-sm:hidden" data-testid="help-breadcrumb">
      {items.map(([l, to], i) => (
        <span key={l} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-black/35" aria-hidden />}
          {to ? <Link to={to} className="underline-offset-4 hover:text-black hover:underline">{l}</Link> : <span className="text-black/80" aria-current="page">{l}</span>}
        </span>
      ))}
    </nav>
  )
}

export function PageTop({ back, crumbs }: { back: [string, string]; crumbs: [string, string?][] }) {
  return <div className="mb-8 max-sm:mb-6"><BackLink to={back[0]} label={back[1]} /><Crumbs items={crumbs} /></div>
}

export function SearchField({ initial = '', className }: { initial?: string; className?: string }) {
  const [q, setQ] = useState(initial)
  const navigate = useNavigate()
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate(`/help/search?q=${encodeURIComponent(q.trim())}`) }}
      className={cn('hc-box flex h-14 items-center gap-3 bg-white px-4 focus-within:border-[#141414]', className)} data-testid="help-search">
      <Search className="h-5 w-5 shrink-0 text-black/45" aria-hidden />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the help center" aria-label="Search the help center"
        className="min-w-0 flex-1 bg-transparent text-[16px] text-[#141414] placeholder:text-black/45 focus:outline-none" data-testid="help-search-input" />
      <kbd className="shrink-0 border border-black/15 px-1.5 py-0.5 text-[12px] text-black/50 max-sm:hidden" aria-hidden>Enter ↵</kbd>
    </form>
  )
}

export function HeroSearch() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(-1)
  const navigate = useNavigate()
  const items = useMemo(() => helpApi.suggest(q), [q])
  const show = open && items.length > 0
  const go = () => { const t = q.trim(); if (t) navigate(`/help/search?q=${encodeURIComponent(t)}`) }
  return (
    <div className="relative w-full text-left" data-testid="help-hero-search">
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (idx >= 0 && items[idx]) navigate(items[idx].path); else go() }} className="flex h-14 items-center gap-3 bg-white pl-4 pr-1.5 focus-within:outline focus-within:outline-2 focus-within:outline-white max-sm:h-12">
        <Search className="h-5 w-5 shrink-0 text-black/45" aria-hidden />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); setIdx(-1) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setOpen(true); setIdx((i) => (i + 1) % items.length) }
            else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setIdx((i) => (i <= 0 ? items.length - 1 : i - 1)) }
            else if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Search the help center" aria-label="Search the help center" role="combobox" aria-expanded={show} aria-controls="help-hero-suggestions" aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent text-[16px] text-[#141414] placeholder:text-black/45 focus:outline-none" data-testid="help-search-input" />
        <kbd className="shrink-0 border border-black/15 px-1.5 py-0.5 text-[12px] text-black/50 max-sm:hidden" aria-hidden>Enter ↵</kbd>
        <button type="submit" className="h-11 shrink-0 bg-[#141414] px-5 text-[14px] font-medium text-white transition-colors hover:bg-black max-sm:h-9 max-sm:px-3.5" data-testid="help-search-submit">Search</button>
      </form>
      {show && (
        <ul id="help-hero-suggestions" role="listbox" className="hc-box absolute inset-x-0 top-full z-30 mt-1 bg-white py-1" data-testid="help-suggestions">
          {items.map((a, i) => (
            <li key={a.path} role="option" aria-selected={i === idx}>
              <Link to={a.path} data-active={i === idx || undefined} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setIdx(i)} className="hc-option block px-4 py-2.5 transition-colors" data-testid={`help-suggestion-${i}`}>
                <span className="block truncate text-[15px] font-medium text-[#141414]">{a.title}</span>
                <span className="block truncate text-[12px] text-black/50">{a.folder.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ArticleRow({ a, path, excerpt = true }: { a: HelpArticle; path?: boolean; excerpt?: boolean }) {
  return (
    <li className="border-b border-black/10 last:border-b-0">
      <Link to={a.path} className="group flex items-center gap-4 py-3.5 transition-colors hover:text-black/70" data-testid={`help-article-link-${a.slug}`}>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-medium text-[#141414] underline-offset-4 group-hover:underline">{a.title}</span>
          {path && <span className="mt-0.5 block text-[12px] text-black/50">{a.folder.title}</span>}
          {excerpt && <span className="mt-0.5 block text-[14px] text-black/60">{a.excerpt}</span>}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-black/40 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </li>
  )
}

export function Vote() {
  const [v, setV] = useState<'yes' | 'no' | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-3 text-[15px]" data-testid="help-vote">
      {v ? <span role="status" className="text-black/70" data-testid="help-vote-thanks">{v === 'yes' ? 'Thanks for letting us know.' : "Thanks. We'll use this to improve the article."}</span> : (
        <>
          <span className="font-medium">Was this helpful?</span>
          {(['yes', 'no'] as const).map((k) => <button key={k} type="button" onClick={() => setV(k)} className="hc-box h-10 bg-white px-4 text-[14px] font-medium transition-colors hover:border-[#141414]" data-testid={`help-vote-${k}`}>{k === 'yes' ? 'Yes' : 'No'}</button>)}
        </>
      )}
    </div>
  )
}

export function NotFound() {
  return <div className="py-10" data-testid="help-not-found"><BackLink to="/help" label="Help Center" /><p className="mt-6 text-[17px]">We couldn't find that page.</p></div>
}
