import { Link, useLocation } from 'react-router-dom'
import { Mail, MessageCircle } from 'lucide-react'
import type { Ticket, User } from '@/types'
import { Button } from '@/components/ui/button'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { waiting } from '@/lib/inboxViews'

interface Props {
  t: Ticket
  active: boolean
  checked: boolean
  onCheck: (checked: boolean) => void
  selectable?: boolean
  actions?: React.ReactNode
  variant?: 'default' | 'needs' | 'ai'
  users?: User[]
  onTakeOver?: (t: Ticket) => void
}

// Two-line row (REQ-1030..1033): name + time, then subject. Checkbox replaces the unread dot on hover.
export function TicketRow({ t, active, checked, onCheck, selectable = true, actions, anySelected = false, variant, users, full }: Props & { anySelected?: boolean; full?: boolean }) {
  const { search } = useLocation()
  const showCheck = selectable && (anySelected || checked)
  const overdue = variant !== 'ai' && waiting(t).tone === 'breached'
  const unread = !!t.draftReady || overdue
  return (
    <li className={cn('group relative flex items-start gap-2.5 px-3 py-2.5 transition-colors max-sm:min-h-[64px] max-sm:py-3', active ? 'bg-tobacco-50/70' : checked ? 'bg-surface-muted' : 'hover:bg-surface-sunken')} data-testid={`ticket-row-${t.id}`}>
      <span className="relative mt-[5px] flex h-4 w-4 shrink-0 items-center justify-center max-sm:h-6 max-sm:w-6">
        {unread && <span className={cn('h-2 w-2 rounded-full bg-tobacco-600 transition-opacity', selectable && (showCheck ? 'opacity-0' : 'group-hover:opacity-0'))} aria-label="Unread" role="img" data-testid={`ticket-unread-${t.id}`} />}
        {selectable && <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)} aria-label={`Select ${t.id}: ${t.subject}`} data-testid={`ticket-check-${t.id}`} data-shown={showCheck || undefined}
          className={cn('absolute inset-0 h-4 w-4 cursor-pointer rounded accent-tobacco-600 transition-opacity focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 max-sm:h-6 max-sm:w-6', showCheck ? 'opacity-100' : 'opacity-0')} />}
      </span>
      <Link to={{ pathname: `/inbox/${t.id}`, search }} aria-current={active ? 'true' : undefined} data-testid={`ticket-link-${t.id}`} className="block min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn('truncate text-[13.5px] text-ink', unread ? 'font-semibold' : 'font-medium')}>{t.customer.name}</span>
          {!full && <span className={cn('shrink-0 text-xs tabular-nums', overdue ? 'font-medium text-[#C2410C]' : 'text-ink-muted')} data-testid={`ticket-waiting-${t.id}`} data-tone={overdue ? 'breached' : 'ok'}>{timeAgo(t.updatedAt)}</span>}
        </span>
        {full
          ? <span className="mt-0.5 block truncate text-[13px]" data-testid={`ticket-line2-${t.id}`}><span className="text-ink/85">{t.subject}</span>{t.preview && <span className="text-ink-muted/80"> — {t.preview}</span>}</span>
          : <span className="mt-0.5 block truncate text-[13px] text-ink-muted">{t.subject}</span>}
      </Link>
      {full && <RowMeta t={t} users={users} overdue={overdue} />}
      {actions && <div className="flex shrink-0 flex-col gap-1.5">{actions}</div>}
    </li>
  )
}

// Full-width rows (REQ-1066): channel icon, assignee avatar (none when unassigned), time.
function RowMeta({ t, users, overdue }: { t: Ticket; users?: User[]; overdue: boolean }) {
  const owner = users?.find((u) => u.id === t.assignee)
  const Icon = t.channel === 'chat' ? MessageCircle : Mail
  return (
    <span className="flex shrink-0 items-center gap-4 self-center pl-6 pr-3" data-testid={`ticket-meta-${t.id}`}>
      <Icon className="h-4 w-4 text-ink-muted/80" aria-label={t.channel === 'chat' ? 'Chat' : 'Email'} role="img" data-testid={`ticket-channel-${t.id}`} />
      <span className="flex w-6 justify-center">
        {owner && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EFE7DC] text-[10px] font-semibold text-ink" title={owner.name} data-testid={`ticket-assignee-${t.id}`}>{owner.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>}
      </span>
      <span className={cn('w-[84px] text-right text-xs tabular-nums', overdue ? 'font-medium text-[#C2410C]' : 'text-ink-muted')} data-testid={`ticket-waiting-${t.id}`} data-tone={overdue ? 'breached' : 'ok'}>{timeAgo(t.updatedAt)}</span>
    </span>
  )
}

export const TakeOverButton = ({ t, onTakeOver }: { t: Ticket; onTakeOver: (t: Ticket) => void }) => <Button size="sm" variant="outline" onClick={() => onTakeOver(t)} data-testid={`take-over-${t.id}`}>Take over</Button>
