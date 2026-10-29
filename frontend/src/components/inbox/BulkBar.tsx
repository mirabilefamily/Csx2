import { Archive, CheckCircle2, Tag, UserPlus } from 'lucide-react'
import type { User } from '@/types'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface Props {
  count: number
  users: User[]
  tags: string[]
  onAssign: (u: User) => void
  onTag: (tag: string) => void
  onClose: () => void
  onClear: () => void
}

export function BulkBar({ count, users, tags, onAssign, onTag, onClose, onClear, onResolve, lead }: Props & { lead?: React.ReactNode; onResolve?: () => void }) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 bg-white px-5 animate-in fade-in duration-150 max-sm:h-14 max-sm:px-3" role="region" aria-label="Bulk actions" data-testid="bulk-bar">
      {lead && <span className="mr-0.5 flex w-4 justify-center">{lead}</span>}
      <span className="mr-auto flex items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold text-ink" data-testid="bulk-count">{count} selected<span className="font-normal text-ink-muted" aria-hidden>·</span><button type="button" onClick={onClear} className="text-[13px] font-medium text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline" data-testid="bulk-clear">Clear</button></span>
      {onResolve && <Button size="sm" variant="ghost" onClick={onResolve} data-testid="bulk-resolve"><CheckCircle2 aria-hidden /> Resolve</Button>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" data-testid="bulk-assign"><UserPlus aria-hidden /> Assign</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {users.map((u) => <DropdownMenuItem key={u.id} onSelect={() => onAssign(u)} data-testid={`bulk-assign-${u.id}`}>{u.name}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" data-testid="bulk-tag"><Tag aria-hidden /> Tag</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
          {tags.map((t) => <DropdownMenuItem key={t} onSelect={() => onTag(t)} data-testid={`bulk-tag-${t}`}>{t}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" variant="ghost" onClick={onClose} data-testid="bulk-close"><Archive aria-hidden /> Close</Button>
    </div>
  )
}
