import { useEffect, useState } from 'react'
import { MoreHorizontal, Search, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Role, User } from '@/types'
import { directoryApi, settingsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/components/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useIsPhone } from '@/hooks/useIsPhone'
import { StatusChip } from '@/components/StatusChip'

const STATUS_LABEL = { active: 'Active', invited: 'Invited', deactivated: 'Deactivated' } as const
const ROLE_CLS = { admin: 'bg-tobacco-50 text-tobacco-700', agent: 'bg-slate-50 text-slate-700' }
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'
const lastLogin = (u: User) => (u.status === 'invited' ? `Invite sent ${u.invitedAt ? timeAgo(u.invitedAt) : 'recently'}` : u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never')

function RolesCard() {
  const rows: [string, string][] = [
    ['Admin', 'Every page, including AI & Workflows, Channels and Settings.'],
    ['Agent', 'Dashboard, Inbox and Guidance.'],
  ]
  return (
    <section className="rounded-2xl bg-surface p-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4" data-testid="users-roles">
      <h2 className="text-[15px] font-semibold text-ink">What each role can do</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {rows.map(([r, d]) => (
          <div key={r} data-testid={`users-role-${r.toLowerCase()}`}>
            <dt className="text-sm font-semibold text-ink">{r}</dt>
            <dd className="mt-0.5 text-sm text-ink-muted">{d}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function InviteDialog({ open, onOpenChange, onInvited }: { open: boolean; onOpenChange: (o: boolean) => void; onInvited: (u: User) => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('agent')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const u = await settingsApi.inviteUser(email, role)
      toast.success(`Invite sent to ${u.email}`)
      onInvited(u)
      setEmail('')
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    }
    setBusy(false)
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setError(null) }}>
      <DialogContent data-testid="invite-dialog">
        <DialogTitle className="text-base font-semibold text-ink">Invite a teammate</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-muted">They'll get an email with a link to set their password.</DialogDescription>
        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" className="mt-1.5" value={email} onChange={(e) => { setEmail(e.target.value); setError(null) }} aria-invalid={!!error} data-testid="invite-email" />
            <FieldError>{error}</FieldError>
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="invite-role" className="mt-1.5" data-testid="invite-role"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="agent">Agent</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" loading={busy} data-testid="invite-send">Send invite</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RowActions({ u, self, patch, onDeactivate, onResent }: { u: User; self: boolean; patch: (u: User, p: Partial<Pick<User, 'role' | 'status'>>, msg: string) => void; onDeactivate: () => void; onResent: (u: User) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={`Actions for ${u.name}`} data-testid={`user-actions-${u.email}`}><MoreHorizontal aria-hidden /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {self && <DropdownMenuLabel data-testid="self-protect-note">You can't change your own account</DropdownMenuLabel>}
        {u.status === 'invited' && <DropdownMenuItem onSelect={async () => { const r = await settingsApi.resendInvite(u.id).catch(() => null); if (r) { onResent(r); toast.success(`Invite resent to ${r.email}`) } else toast.error("Couldn't resend the invite. Try again.") }} data-testid="user-resend-invite">Resend invite</DropdownMenuItem>}
        <DropdownMenuItem disabled={self} onSelect={() => patch(u, { role: u.role === 'admin' ? 'agent' : 'admin' }, 'Role updated')} data-testid="user-change-role">Make {u.role === 'admin' ? 'Agent' : 'Admin'}</DropdownMenuItem>
        <DropdownMenuItem onSelect={async () => { const r = await settingsApi.resetPassword(u.id).catch(() => null); if (r) toast.success(`Password reset email sent to ${r.email}`); else toast.error("Couldn't send the reset email. Try again.") }} data-testid="user-reset-password">Reset password</DropdownMenuItem>
        <DropdownMenuSeparator />
        {u.status === 'deactivated'
          ? <DropdownMenuItem disabled={self} onSelect={() => patch(u, { status: 'active' }, `${u.name} reactivated`)} data-testid="user-reactivate">Reactivate</DropdownMenuItem>
          : <DropdownMenuItem disabled={self} className="text-red-700" onSelect={onDeactivate} data-testid="user-deactivate">Deactivate</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UsersSkeleton() {
  return (
    <div className="divide-y divide-border/70" data-testid="users-loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-48" /></div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function UsersTab() {
  const { user: me } = useAuth()
  const { data, loading, error, reload } = useApi(() => directoryApi.listUsers(), [])
  const [users, setUsers] = useState<User[]>([])
  const [inviting, setInviting] = useState(false)
  const [deactivate, setDeactivate] = useState<User | null>(null)
  const [q, setQ] = useState('')
  const isPhone = useIsPhone()
  useEffect(() => {
    setUsers(data ?? [])
  }, [data])

  const patch = async (u: User, p: Partial<Pick<User, 'role' | 'status'>>, msg: string) => {
    try {
      const next = await settingsApi.updateUser(u.id, p, me?.id ?? '')
      setUsers((list) => list.map((x) => (x.id === next.id ? next : x)))
      toast.success(msg)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const count = (st: User['status']) => users.filter((u) => u.status === st).length
  const resent = (n: User) => setUsers((list) => list.map((x) => (x.id === n.id ? n : x)))
  const needle = q.trim().toLowerCase()
  const shown = needle ? users.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)) : users

  return (
    <div className="space-y-4" data-testid="users-tab">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-muted" data-testid="users-count">{loading ? '–' : `${users.length} ${users.length === 1 ? 'member' : 'members'} · ${count('active')} active · ${count('invited')} invited`}</p>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search users" className="h-9 pl-9 pr-8" data-testid="users-search" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="users-search-clear"><X className="h-3.5 w-3.5" aria-hidden /></button>}
        </div>
        <Button onClick={() => setInviting(true)} data-testid="invite-user"><UserPlus aria-hidden /> Invite user</Button>
      </div>
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04]">
        {loading ? <UsersSkeleton />
          : error ? <ErrorState compact title="Users didn't load" onRetry={reload} testId="users-error" />
          : !users.length ? <EmptyState compact title="No teammates yet" description="Invite someone to get started." testId="users-empty" />
          : !shown.length ? <EmptyState compact title={`No teammates match "${q.trim()}"`} description="Try a different name or email." testId="users-no-results" />
          : isPhone ? (
            <ul className="divide-y divide-border" data-testid="users-table">
              {shown.map((u) => {
                const self = u.id === me?.id
                return (
                  <li key={u.id} className="flex items-start gap-3 px-4 py-4" data-testid={`user-row-${u.email}`}>
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold', u.status === 'deactivated' ? 'bg-surface-muted text-ink-subtle' : 'bg-brass-50 text-brass-700')} aria-hidden>{initials(u.name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{u.name}{self && <span className="ml-1 text-xs font-normal text-ink-muted">(you)</span>}</p>
                      <p className="truncate text-sm text-ink-muted">{u.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={cn('rounded-full px-2 py-0.5 font-medium capitalize', ROLE_CLS[u.role])} data-testid={`user-role-${u.email}`}>{u.role}</span>
                        <StatusChip label={STATUS_LABEL[u.status]} testId={`user-status-${u.email}`} />
                        <span className="text-ink-muted" data-testid={`user-last-login-${u.email}`}>{u.status === 'invited' ? lastLogin(u) : `Last login ${lastLogin(u)}`}</span>
                      </div>
                    </div>
                    <RowActions u={u} self={self} patch={patch} onDeactivate={() => setDeactivate(u)} onResent={resent} />
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="users-table">
                <TableHeader><TableRow><TableHead className="pl-5">Name</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last login</TableHead><TableHead className="pr-5"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                <TableBody>
                  {shown.map((u) => {
                    const self = u.id === me?.id
                    return (
                      <TableRow key={u.id} data-testid={`user-row-${u.email}`}>
                        <TableCell className="pl-5">
                          <div className="flex items-center gap-3">
                            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold', u.status === 'deactivated' ? 'bg-surface-muted text-ink-subtle' : 'bg-brass-50 text-brass-700')} aria-hidden>{initials(u.name)}</span>
                            <div className="min-w-0">
                              <p className="whitespace-nowrap font-medium text-ink">{u.name}{self && <span className="ml-1 text-xs font-normal text-ink-muted">(you)</span>}</p>
                              <p className="truncate text-xs text-ink-muted">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', ROLE_CLS[u.role])} data-testid={`user-role-${u.email}`}>{u.role}</span></TableCell>
                        <TableCell><StatusChip label={STATUS_LABEL[u.status]} testId={`user-status-${u.email}`} /></TableCell>
                        <TableCell className="whitespace-nowrap text-ink-muted" data-testid={`user-last-login-${u.email}`}>{lastLogin(u)}</TableCell>
                        <TableCell className="pr-5 text-right"><RowActions u={u} self={self} patch={patch} onDeactivate={() => setDeactivate(u)} onResent={resent} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
      </div>
      <RolesCard />
      <InviteDialog open={inviting} onOpenChange={setInviting} onInvited={(u) => setUsers((l) => [...l, u])} />
      <AlertDialog open={!!deactivate} onOpenChange={(o) => !o && setDeactivate(null)}>
        <AlertDialogContent data-testid="deactivate-dialog">
          <AlertDialogTitle>Deactivate {deactivate?.name}?</AlertDialogTitle>
          <AlertDialogDescription>They'll lose access right away. You can reactivate them later.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="deactivate-confirm" onClick={() => deactivate && patch(deactivate, { status: 'deactivated' }, `${deactivate.name} deactivated`)}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
