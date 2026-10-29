import { CheckCircle2, CircleAlert, Inbox, ShieldAlert, Sparkles, Trash2, UserRound, UserX, type LucideIcon } from 'lucide-react'
import type { Ticket } from '@/types'
import { aiState, waiting } from './inboxViews'

export type FolderId = 'needs-you' | 'ai' | 'mine' | 'unassigned' | 'done' | 'all' | 'spam' | 'trash'

interface FolderDef {
  id: FolderId
  label: string
  icon: LucideIcon
  count: 'badge' | 'plain' | 'none'
  secondary?: boolean
  match: (t: Ticket, uid: string | undefined) => boolean
}

export const isUnread = (t: Ticket) => t.unread ?? (!!t.draftReady || waiting(t).tone === 'breached')

const done = (t: Ticket) => t.status === 'resolved' || t.status === 'closed'
const active = (fn: FolderDef['match']): FolderDef['match'] => (t, u) => !t.setAside && fn(t, u)

export const FOLDERS: FolderDef[] = [
  { id: 'needs-you', label: 'Needs you', icon: CircleAlert, count: 'badge', match: active((t) => t.status === 'needs_human') },
  { id: 'ai', label: 'AI handling', icon: Sparkles, count: 'plain', match: active((t) => aiState(t) !== null && !done(t)) },
  { id: 'mine', label: 'Assigned to me', icon: UserRound, count: 'plain', match: active((t, u) => !!u && t.assignee === u && !done(t)) },
  { id: 'unassigned', label: 'Unassigned', icon: UserX, count: 'plain', match: active((t) => !t.assignee && !done(t)) },
  { id: 'done', label: 'Done', icon: CheckCircle2, count: 'none', match: (t) => !t.setAside && done(t) },
  { id: 'all', label: 'All', icon: Inbox, count: 'none', match: (t) => !t.setAside },
  { id: 'spam', label: 'Spam', icon: ShieldAlert, count: 'plain', secondary: true, match: (t) => t.setAside === 'spam' },
  { id: 'trash', label: 'Trash', icon: Trash2, count: 'plain', secondary: true, match: (t) => t.setAside === 'trash' },
]

const LEGACY: Record<string, FolderId> = { needs_you: 'needs-you', needs_human: 'needs-you', ai_handling: 'ai', mine: 'mine', resolved: 'done', closed: 'done', all: 'all', all_open: 'all', unassigned: 'unassigned' }
export const folderById = (id: string | null) => FOLDERS.find((f) => f.id === id) ?? FOLDERS.find((f) => f.id === LEGACY[id ?? '']) ?? FOLDERS[0]
export const folderEmpty = (f: FolderDef) => (f.id === 'needs-you' ? "You're all caught up" : f.id === 'spam' ? 'No spam. Nice.' : f.id === 'trash' ? 'Trash is empty' : `Nothing in ${f.label}`)
export const folderCounts = (tickets: Ticket[], uid: string | undefined) => Object.fromEntries(FOLDERS.map((f) => [f.id, tickets.filter((t) => f.match(t, uid)).length])) as Record<FolderId, number>

export type RowGroup = 'Overdue' | 'Today' | 'Earlier'
export const GROUP_ORDER: RowGroup[] = ['Overdue', 'Today', 'Earlier']
export const rowGroup = (t: Ticket): RowGroup => (waiting(t).tone === 'breached' ? 'Overdue' : new Date(t.updatedAt).toDateString() === new Date().toDateString() ? 'Today' : 'Earlier')
// Stable reorder so the list (and J/K) follows the visible groups (REQ-1077).
export const byGroup = (list: Ticket[]) => GROUP_ORDER.flatMap((g) => list.filter((t) => rowGroup(t) === g))
