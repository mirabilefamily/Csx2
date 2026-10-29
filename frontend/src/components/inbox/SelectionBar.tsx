import { useLayoutEffect, useRef, useState } from 'react'
import { CheckCircle2, Download, Flag, GitMerge, Mail, MailOpen, MoreHorizontal, RotateCcw, ShieldAlert, Tag, Trash2, UserPlus } from 'lucide-react'
import type { Priority, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/overlay'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type BarMode = 'normal' | 'done' | 'spam' | 'trash'
type Extra = 'assign' | 'tag' | 'read'
const PRIORITIES: [Priority, string][] = [['urgent', 'Urgent'], ['high', 'High'], ['normal', 'Normal'], ['low', 'Low']]
const W: Record<Extra | 'primary', [number, number]> = { primary: [104, 32], assign: [84, 32], tag: [62, 32], read: [118, 32] }

interface Props {
  mode: BarMode
  count: number
  total: number
  folderLabel: string
  lead?: React.ReactNode
  compact?: boolean
  users: User[]
  meId?: string
  tags: string[]
  tagState: (tag: string) => boolean | 'indeterminate'
  anyUnread: boolean
  canMerge: boolean
  onSelectAll: () => void
  onClear: () => void
  onAssign: (id: string | null) => void
  onTag: (tag: string, on: boolean) => void
  onRead: () => void
  onPrimary: () => void
  onPriority: (p: Priority) => void
  onMerge: () => void
  onExport: () => void
  onSpam: () => void
  onDelete: () => void
}

const btnCls = 'h-8 gap-1.5 px-2.5 text-[13px] font-medium [&_svg]:size-4 max-sm:h-8'

export function SelectionBar(p: Props) {
  const root = useRef<HTMLDivElement>(null)
  const left = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState({ w: 9999, l: 0 })
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const f = () => setRoom({ w: el.clientWidth, l: left.current?.offsetWidth ?? 0 })
    f()
    const r = new ResizeObserver(f)
    r.observe(el)
    return () => r.disconnect()
  }, [p.count, p.total])
  const iconOnly = !!p.compact || room.w < 520
  const set = p.mode === 'normal' || p.mode === 'done'
  const k = iconOnly ? 1 : 0
  let free = room.w - room.l - 24 - 12 - W.primary[k] - 32 - 8
  const shown: Extra[] = []
  if (set) for (const x of ['assign', 'tag', 'read'] as Extra[]) { if (free < W[x][k] + 4) break; shown.push(x); free -= W[x][k] + 4 }
  const hidden = set ? (['assign', 'tag', 'read'] as Extra[]).filter((x) => !shown.includes(x)) : []

  const tip = (label: string, el: React.ReactElement) => (iconOnly ? <Tooltip><TooltipTrigger asChild>{el}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip> : el)
  const btn = (I: typeof Tag, label: string, testId: string, extra?: { onClick?: () => void; variant?: 'primary' | 'ghost'; danger?: boolean }) => (
    <Button size="sm" variant={extra?.variant ?? 'ghost'} onClick={extra?.onClick} aria-label={iconOnly ? label : undefined}
      className={cn(btnCls, extra?.variant === 'primary' ? 'rounded-full' : 'text-ink-muted hover:text-ink', iconOnly && 'w-8 px-0', extra?.danger && 'text-red-700 hover:bg-red-50 hover:text-red-700')} data-testid={testId}>
      <I aria-hidden />{!iconOnly && label}
    </Button>
  )
  const assignItems = (
    <>
      {p.meId && <DropdownMenuItem onSelect={() => p.onAssign(p.meId!)} data-testid="bulk-assign-me">Assign to me</DropdownMenuItem>}
      <DropdownMenuItem onSelect={() => p.onAssign(null)} data-testid="bulk-unassign">Unassign</DropdownMenuItem>
      <DropdownMenuSeparator />
      {p.users.filter((u) => u.id !== p.meId).map((u) => <DropdownMenuItem key={u.id} onSelect={() => p.onAssign(u.id)} data-testid={`bulk-assign-${u.id}`}>{u.name}</DropdownMenuItem>)}
    </>
  )
  const tagItems = p.tags.map((t) => {
    const s = p.tagState(t)
    return <DropdownMenuCheckboxItem key={t} checked={s} onSelect={(e) => e.preventDefault()} onCheckedChange={() => p.onTag(t, s !== true)} data-testid={`bulk-tag-${t}`}>{t}</DropdownMenuCheckboxItem>
  })
  const readLabel = p.anyUnread ? 'Mark read' : 'Mark unread'
  const ReadIcon = p.anyUnread ? MailOpen : Mail
  const primary = p.mode === 'trash' ? [RotateCcw, 'Restore'] as const : p.mode === 'spam' ? [RotateCcw, 'Not spam'] as const : p.mode === 'done' ? [RotateCcw, 'Reopen'] as const : [CheckCircle2, 'Resolve'] as const

  return (
    <div className="flex h-16 shrink-0 items-center px-2 max-sm:h-14" data-testid="bulk-bar-wrap">
      <div ref={root} role="region" aria-label="Bulk actions" className="flex h-12 min-w-0 flex-1 items-center gap-1 rounded-xl bg-[#F7F4EF] pl-3 pr-1.5 text-[14px] animate-in fade-in duration-150" data-testid="bulk-bar">
        <div ref={left} className="flex min-w-0 shrink-0 items-center gap-2.5 whitespace-nowrap">
          {p.lead && <span className="flex w-4 justify-center">{p.lead}</span>}
          <span className="text-[14px] font-semibold text-ink" data-testid="bulk-count">{p.count} selected</span>
          {p.count < p.total && <button type="button" onClick={p.onSelectAll} className="text-[13px] font-medium text-tobacco-600 underline-offset-2 hover:underline" data-testid="bulk-select-total">{iconOnly ? `All ${p.total}` : `Select all ${p.total} in ${p.folderLabel}`}</button>}
          <button type="button" onClick={p.onClear} className="text-[13px] text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline" data-testid="bulk-clear">Clear</button>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1" data-testid="bulk-actions">
          {shown.includes('assign') && <DropdownMenu>{tip('Assign', <DropdownMenuTrigger asChild>{btn(UserPlus, 'Assign', 'bulk-assign')}</DropdownMenuTrigger>)}<DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">{assignItems}</DropdownMenuContent></DropdownMenu>}
          {shown.includes('tag') && <DropdownMenu>{tip('Tag', <DropdownMenuTrigger asChild>{btn(Tag, 'Tag', 'bulk-tag')}</DropdownMenuTrigger>)}<DropdownMenuContent align="end" className="max-h-72 overflow-y-auto"><DropdownMenuLabel>Tags</DropdownMenuLabel>{tagItems}</DropdownMenuContent></DropdownMenu>}
          {shown.includes('read') && tip(readLabel, btn(ReadIcon, readLabel, 'bulk-read', { onClick: p.onRead }))}
          {!set && tip(p.mode === 'trash' ? 'Delete forever' : 'Delete', btn(Trash2, p.mode === 'trash' ? 'Delete forever' : 'Delete', 'bulk-delete', { onClick: p.onDelete, danger: true }))}
          {tip(primary[1], btn(primary[0], primary[1], 'bulk-primary', { onClick: p.onPrimary, variant: 'primary' }))}
          {set && (
            <DropdownMenu>
              {tip('More', <DropdownMenuTrigger asChild><Button size="sm" variant="ghost" className={cn(btnCls, 'w-8 px-0 text-ink-muted hover:text-ink')} aria-label="More actions" data-testid="bulk-more"><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger>)}
              <DropdownMenuContent align="end" className="min-w-[220px]" data-testid="bulk-more-menu">
                {hidden.includes('assign') && <DropdownMenuSub><DropdownMenuSubTrigger data-testid="bulk-more-assign"><UserPlus aria-hidden />Assign</DropdownMenuSubTrigger><DropdownMenuSubContent className="max-h-80 overflow-y-auto">{assignItems}</DropdownMenuSubContent></DropdownMenuSub>}
                {hidden.includes('tag') && <DropdownMenuSub><DropdownMenuSubTrigger data-testid="bulk-more-tag"><Tag aria-hidden />Tag</DropdownMenuSubTrigger><DropdownMenuSubContent className="max-h-72 overflow-y-auto">{tagItems}</DropdownMenuSubContent></DropdownMenuSub>}
                {hidden.includes('read') && <DropdownMenuItem onSelect={p.onRead} data-testid="bulk-more-read"><ReadIcon aria-hidden />{readLabel}</DropdownMenuItem>}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger data-testid="bulk-priority"><Flag aria-hidden />Priority</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>{PRIORITIES.map(([v, l]) => <DropdownMenuItem key={v} onSelect={() => p.onPriority(v)} data-testid={`bulk-priority-${v}`}>{l}</DropdownMenuItem>)}</DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem disabled={!p.canMerge} onSelect={p.onMerge} data-testid="bulk-merge"><GitMerge aria-hidden />Merge{!p.canMerge && <span className="ml-auto pl-3 text-xs text-ink-muted">Same customer only</span>}</DropdownMenuItem>
                <DropdownMenuItem onSelect={p.onExport} data-testid="bulk-export"><Download aria-hidden />Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onSelect={p.onSpam} data-testid="bulk-spam"><ShieldAlert aria-hidden />Mark as spam</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={p.onDelete} className="text-red-700 data-[highlighted]:bg-red-50" data-testid="bulk-delete"><Trash2 aria-hidden />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
}
