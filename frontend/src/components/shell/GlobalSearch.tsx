import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Loader2, MessagesSquare, Search, SlidersHorizontal, Ticket as TicketIcon, UserRound } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'
import type { SearchResults } from '@/types'
import { directoryApi } from '@/api'
import { useDemoState } from '@/hooks/useApi'
import { StatusPill } from '@/components/StatusPill'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUnsavedGuard } from '@/components/UnsavedGuard'

interface Item { id: string; group: 'Tickets' | 'Customers' | 'Articles' | 'Settings'; to: string; title: string; meta: string; node?: React.ReactNode }

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

// Static index of admin pages/sections, matched client-side.
const SETTINGS_INDEX: [string, string, string][] = [
  ['brand-voice', 'Brand voice', 'AI & Workflows · /ai/voice'],
  ['ai-replies', 'AI replies & confidence threshold', 'AI & Workflows · /ai/replies'],
  ['auto-refunds', 'Auto-refunds', 'AI & Workflows · /ai/replies'],
  ['workflows', 'Process automations like order tracking', 'AI & Workflows · /ai/workflows'],
  ['testing', 'Conversation testing', 'AI & Workflows · /ai/testing'],
  ['chat-widget', 'Chat widget appearance', 'Channels · /channels/chat'],
  ['launcher-position', 'Launcher position', 'Channels · /channels/chat'],
  ['contact-form', 'Contact form', 'Channels · /channels/chat?kind=form'],
  ['email', 'Email signature & auto-acknowledgement', 'Channels · /channels/email'],
  ['install', 'Install the widget', 'Channels · /channels/install'],
  ['account', 'Account & password', 'Settings · /settings/account'],
  ['users', 'Users', 'Settings · /settings/users'],
  ['integrations', 'Integrations', 'Settings · /settings/integrations'],
  ['office365', 'Office 365 mailbox', 'Settings · /settings/integrations/outlook'],
  ['loop', 'Loop Returns', 'Settings · /settings/integrations/loop'],
  ['csat', 'CSAT survey', 'Settings · /settings/csat'],
]
const settingsItems = (q: string, admin: boolean): Item[] => {
  const t = q.trim().toLowerCase()
  if (!admin || t.length < 2) return []
  return SETTINGS_INDEX.filter(([, title, meta]) => `${title} ${meta}`.toLowerCase().includes(t)).slice(0, 5).map(([id, title, meta]) => ({ id: `s-${id}`, group: 'Settings' as const, to: meta.split(' · ')[1], title, meta: meta.split(' · ')[0] }))
}

function toItems(r: SearchResults): Item[] {
  return [
    ...r.tickets.map((t) => ({ id: `t-${t.id}`, group: 'Tickets' as const, to: `/inbox/${t.id}`, title: t.subject, meta: `${t.id} · ${t.customer.name}`, node: <StatusPill status={t.status} /> })),
    ...r.customers.map((c) => ({ id: `c-${c.id}`, group: 'Customers' as const, to: c.latestTicketId ? `/inbox/${c.latestTicketId}` : '/inbox', title: c.name, meta: `${c.email} · ${c.ticketCount} ticket${c.ticketCount === 1 ? '' : 's'}` })),
    ...r.articles.map((a) => ({ id: `a-${a.id}`, group: 'Articles' as const, to: `/guidance?article=${a.id}`, title: a.title, meta: a.category })),
  ]
}

const ICONS = { Tickets: TicketIcon, Customers: UserRound, Articles: BookOpen, Settings: SlidersHorizontal }

export function GlobalSearch() {
  const navigate = useNavigate()
  const { confirmLeave } = useUnsavedGuard()
  const demo = useDemoState()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [active, setActive] = useState(0)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!query.trim()) return setResults(null)
    let live = true
    setStatus('loading')
    const id = setTimeout(() => {
      directoryApi.search(query).then(
        (r) => live && (setResults(r), setStatus('idle'), setActive(0)),
        () => live && setStatus('error'),
      )
    }, 150)
    return () => {
      live = false
      clearTimeout(id)
    }
  }, [query, demo, nonce])

  const { user } = useAuth()
  const items = useMemo(() => (results ? [...toItems(results), ...settingsItems(results.query, user?.role === 'admin')] : []), [results, user?.role])
  const pick = (item: Item) => {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    confirmLeave(() => navigate(item.to))
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(items.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault()
      pick(items[active])
    }
  }

  const showPanel = open && query.trim().length > 0
  return (
    <div className="relative w-full max-w-lg" data-testid="global-search">
      <label htmlFor="global-search-input" className="sr-only">Search tickets, customers and articles</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      <input
        ref={inputRef}
        id="global-search-input"
        data-testid="global-search-input"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        aria-activedescendant={showPanel && items[active] ? `sr-${items[active].id}` : undefined}
        autoComplete="off"
        value={query}
        placeholder="Search tickets, guidance, settings..."
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => document.activeElement !== inputRef.current && setOpen(false), 150)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-full border border-[#EEE9E1] bg-white pl-9 shadow-sm pr-16 text-sm text-ink placeholder:text-ink-subtle transition-[border-color,box-shadow,background-color] focus:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <kbd className="hover-only pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border-strong bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-muted sm:block">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          data-testid="global-search-results"
          className="absolute left-0 right-0 top-12 z-[60] max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface py-2 shadow-popover sm:min-w-[420px]"
        >
          {status === 'loading' && !results ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-ink-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Searching…</p>
          ) : status === 'error' ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3" role="alert">
              <p className="text-sm text-ink-muted">Search is unavailable right now.</p>
              <Button size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={() => setNonce((n) => n + 1)}>Try again</Button>
            </div>
          ) : items.length === 0 && results ? (
            <p className="px-4 py-3 text-sm text-ink-muted" data-testid="global-search-no-results">No results for "{results.query}"</p>
          ) : (
            (['Tickets', 'Customers', 'Articles', 'Settings'] as const).map((group) => {
              const groupItems = items.filter((i) => i.group === group)
              if (!groupItems.length) return null
              const Icon = ICONS[group]
              return (
                <div key={group} role="group" aria-label={group} data-testid={`search-group-${group.toLowerCase()}`}>
                  <p className="px-4 pb-1 pt-2 text-[11px] font-semibold text-ink-muted">{group}</p>
                  {groupItems.map((item) => {
                    const idx = items.indexOf(item)
                    return (
                      <div
                        key={item.id}
                        id={`sr-${item.id}`}
                        role="option"
                        aria-selected={idx === active}
                        data-testid={`search-result-${item.id}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => pick(item)}
                        className={cn('mx-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2', idx === active && 'bg-surface-muted ring-1 ring-ring/40')}
                      >
                        {(() => { const I = item.meta.startsWith('Channels') ? MessagesSquare : Icon; return <I className="h-4 w-4 shrink-0 text-tobacco-500" aria-hidden data-icon={item.meta.startsWith('Channels') ? 'channels' : undefined} /> })()}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                          <span className="block truncate text-xs text-ink-muted">{item.meta}</span>
                        </span>
                        {item.node}
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
