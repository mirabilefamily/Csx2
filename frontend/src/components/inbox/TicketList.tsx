import { Fragment, useEffect, useRef } from 'react'
import { Inbox, SearchX } from 'lucide-react'
import type { Ticket, User } from '@/types'
import { rowGroup } from '@/lib/inboxFolders'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/States'
import { TicketRow } from './TicketRow'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  emptyText: string
  emptyAction?: React.ReactNode
  tickets: Ticket[]
  activeId?: string
  loading: boolean
  error: Error | null
  onRetry: () => void
  filtered: boolean
  onClearFilters: () => void
  selected: string[]
  onSelect: (ids: string[]) => void
  users: User[]
  tags: string[]
  onAssign: (u: User) => void
  onTag: (tag: string) => void
  onBulkClose: () => void
  toolbar: React.ReactNode
  selectable?: boolean
  rowActions?: (t: Ticket) => React.ReactNode
  variant?: 'default' | 'needs' | 'ai'
  full?: boolean
  grouped?: boolean
  onTakeOver?: (t: Ticket) => void
  footer?: React.ReactNode
  status?: React.ReactNode
}

export function SelectAll({ tickets, selected, onSelect, className }: Pick<Props, 'tickets' | 'selected' | 'onSelect'> & { className?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const all = tickets.length > 0 && tickets.every((t) => selected.includes(t.id))
  const some = selected.length > 0 && !all
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some
  }, [some])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={all}
      disabled={!tickets.length}
      onChange={(e) => onSelect(e.target.checked ? tickets.map((t) => t.id) : [])}
      aria-label="Select all visible tickets"
      data-testid="select-all"
      className={cn('h-4 w-4 cursor-pointer accent-tobacco-600 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)}
    />
  )
}

export function TicketList(p: Props) {
  let body: React.ReactNode
  if (p.loading) body = <div className="space-y-px">{Array.from({ length: 6 }, (_, i) => <div key={i} className="space-y-2 border-b border-border p-4"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-5 w-24" /></div>)}</div>
  else if (p.error && !p.tickets.length) body = <ErrorState compact title="Tickets didn't load" onRetry={p.onRetry} testId="ticket-list-error" />
  else if (!p.tickets.length && p.filtered)
    body = <EmptyState compact title="No tickets match these filters" icon={<SearchX className="h-5 w-5" aria-hidden />} action={<Button size="sm" variant="outline" onClick={p.onClearFilters} data-testid="empty-clear-filters">Clear filters</Button>} testId="ticket-list-no-match" />
  else if (!p.tickets.length) body = <EmptyState compact title={p.emptyText} description={p.emptyAction ? undefined : 'New tickets will show up here.'} action={p.emptyAction} icon={<Inbox className="h-5 w-5" aria-hidden />} testId="ticket-list-empty" />
  else
    body = (
      <ul aria-label={`${p.title} tickets`} className="space-y-0.5 pb-3 pt-1" data-testid="ticket-list">
        {p.tickets.map((t, i) => {
          const g = p.grouped ? rowGroup(t) : null
          const head = g && (i === 0 || rowGroup(p.tickets[i - 1]) !== g)
          const n = head ? p.tickets.filter((x) => rowGroup(x) === g).length : 0
          const ids = head ? p.tickets.filter((x) => rowGroup(x) === g).map((x) => x.id) : []
          const allG = ids.length > 0 && ids.every((id) => p.selected.includes(id))
          return (
            <Fragment key={t.id}>
              {head && (
                <li role="presentation" className="group/gh sticky top-0 z-10 flex items-center gap-2.5 bg-white/90 px-5 pb-1.5 pt-3 text-[11px] font-medium text-ink-muted backdrop-blur-sm max-sm:px-3" data-testid={`list-group-${g.toLowerCase()}`}>
                  {p.selectable !== false && (
                    <span className="flex w-4 justify-center">
                      <input type="checkbox" checked={allG} onChange={(e) => p.onSelect(e.target.checked ? [...new Set([...p.selected, ...ids])] : p.selected.filter((x) => !ids.includes(x)))} aria-label={`Select all ${g}`} className={cn('h-3.5 w-3.5 cursor-pointer accent-tobacco-600 transition-opacity duration-150 focus-visible:opacity-100', p.selected.length ? 'opacity-100' : 'opacity-0 group-hover/gh:opacity-100')} data-testid={`select-group-${g.toLowerCase()}`} />
                    </span>
                  )}
                  <span>{g}{g !== 'Earlier' && <span className="tabular-nums"> · {n}</span>}</span>
                </li>
              )}
          <TicketRow key={t.id} t={t} anySelected={p.selected.length > 0} selectable={p.selectable !== false} active={t.id === p.activeId} checked={p.selected.includes(t.id)} onCheck={(c) => p.onSelect(c ? [...p.selected, t.id] : p.selected.filter((x) => x !== t.id))} actions={p.rowActions?.(t)} variant={p.variant} full={p.full} users={p.users} onTakeOver={p.onTakeOver} />
            </Fragment>
          )
        })}
      </ul>
    )

  return (
    <>
      {(p.status || p.toolbar) ? (
        <div className="flex h-10 items-center gap-2 px-2.5" data-testid="list-subheader">
          {p.status}
          {p.toolbar}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {p.error && p.tickets.length > 0 && !p.loading && (
          <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-3 py-2" data-testid="ticket-list-error">
            <p className="text-xs font-medium text-red-700">Couldn't refresh tickets. Showing the last loaded list.</p>
            <Button size="sm" variant="outline" onClick={p.onRetry} data-testid="ticket-list-error-retry">Try again</Button>
          </div>
        )}
        {body}
      </div>
      {p.footer}
    </>
  )
}
