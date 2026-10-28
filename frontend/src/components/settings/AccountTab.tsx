import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff, LogOut, MonitorSmartphone } from 'lucide-react'
import { toast } from 'sonner'
import type { NotificationPrefs } from '@/types'
import { accountApi } from '@/api'
import { timeAgo } from '@/lib/format'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/components/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/overlay'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/States'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FormSection } from './SaveBar'

function PasswordField({ id, label, auto, value, error, onChange }: { id: 'current' | 'next' | 'confirm'; label: string; auto: string; value: string; error?: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <Label htmlFor={`acct-${id}`}>{label}</Label>
      <div className="relative mt-1.5">
        <Input id={`acct-${id}`} type={show ? 'text' : 'password'} autoComplete={auto} className="pr-12" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `acct-${id}-error` : undefined} data-testid={`account-password-${id}`} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={show} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`account-password-${id}-eye`}>
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      <FieldError id={`acct-${id}-error`}>{error}</FieldError>
    </div>
  )
}

function Password() {
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = {
      current: f.current ? undefined : 'Enter your current password.',
      next: f.next.length >= 8 ? undefined : 'Use at least 8 characters.',
      confirm: f.confirm === f.next ? undefined : "Passwords don't match.",
    }
    setErrors(next)
    if (next.current || next.next || next.confirm) return
    setBusy(true)
    try { await accountApi.changePassword(f); toast.success('Password changed'); setF({ current: '', next: '', confirm: '' }) } catch (err) { setErrors({ current: (err as Error).message }) }
    setBusy(false)
  }
  const field = (k: keyof typeof f, label: string, auto: string) => <PasswordField id={k} label={label} auto={auto} value={f[k]} error={errors[k]} onChange={(v) => setF({ ...f, [k]: v })} />
  return (
    <form onSubmit={submit} noValidate className="space-y-4" data-testid="account-password-form">
      {field('current', 'Current password', 'current-password')}
      <div className="cq-pair">
        {field('next', 'New password', 'new-password')}
        {field('confirm', 'Confirm new password', 'new-password')}
      </div>
      <Button type="submit" loading={busy} data-testid="account-password-submit">Change password</Button>
    </form>
  )
}

const NOTIFS: [keyof NotificationPrefs, string][] = [['needsHuman', 'A ticket needs a human'], ['lowCsat', 'A customer leaves a low CSAT score'], ['fraudAlerts', 'A new fraud alert is raised']]

function Notifications({ userId }: { userId: string }) {
  const { data, loading, error, reload } = useApi(() => accountApi.getNotificationPrefs(userId), [userId])
  const [p, setP] = useState<NotificationPrefs | null>(null)
  useEffect(() => setP(data ?? null), [data])
  if (loading) return <Skeleton className="h-28 w-full" />
  if (error || !p) return <ErrorState compact title="Notification settings didn't load" onRetry={reload} testId="account-notifs-error" />
  const toggle = async (k: keyof NotificationPrefs, v: boolean) => {
    const next = { ...p, [k]: v }
    setP(next)
    try { await accountApi.saveNotificationPrefs(userId, next); toast.success('Notification settings saved') } catch { setP(p); toast.error("Couldn't save. Try again.") }
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border" data-testid="account-notifs">
      {NOTIFS.map(([k, l]) => (
        <li key={k} className="flex min-h-12 items-center justify-between gap-3 px-4">
          <span className="text-sm text-ink" id={`notif-${k}`}>Email me when {l.charAt(0).toLowerCase() + l.slice(1)}</span>
          <Switch checked={p[k]} onCheckedChange={(v) => toggle(k, v)} aria-labelledby={`notif-${k}`} data-testid={`account-notif-${k}`} />
        </li>
      ))}
    </ul>
  )
}

export function AccountTab() {
  const { user } = useAuth()
  const [confirm, setConfirm] = useState(false)
  const sessions = useApi(() => accountApi.listSessions(), [])
  const [ended, setEnded] = useState(false)
  if (!user) return null
  const initials = user.name.split(' ').map((w) => w[0]).join('').slice(0, 2)
  const signOutAll = async () => {
    try { const r = await accountApi.signOutAllDevices(); setEnded(true); toast.success(`Signed out of ${r.sessions} other session${r.sessions === 1 ? '' : 's'}`) } catch { toast.error("Couldn't sign out other devices. Try again.") }
  }
  const list = (sessions.data ?? []).filter((s) => !ended || s.current)
  const others = list.filter((s) => !s.current).length
  return (
    <div className="cq divide-y divide-border/70 rounded-2xl bg-surface px-6 py-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4" data-testid="account-tab">
      <FormSection title="Profile" description="How you appear to the team and in internal notes." testId="account-section-profile">
        <div className="flex items-center gap-4" data-testid="account-profile">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tobacco-100 text-lg font-semibold text-tobacco-800" aria-hidden>{initials}</span>
          <div>
            <p className="text-[15px] font-semibold text-ink" data-testid="account-name">{user.name}</p>
            <p className="text-sm text-ink-muted" data-testid="account-email">{user.email} · {user.role === 'admin' ? 'Admin' : 'Agent'}</p>
          </div>
        </div>
      </FormSection>
      <FormSection title="Change password" description="At least 8 characters." testId="account-section-password"><Password /></FormSection>
      <FormSection title="Notifications" description="Email alerts for things that need you." testId="account-section-notifications"><Notifications userId={user.id} /></FormSection>
      <FormSection title="Sessions" description="Where you're signed in. Sign out everywhere except this browser." testId="account-section-sessions">
        {sessions.loading && !sessions.data ? <Skeleton className="h-36 w-full" /> : (
          <ul className="divide-y divide-border rounded-xl border border-border" data-testid="account-sessions">
            {list.map((s) => (
              <li key={s.id} className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-sm" data-testid={`account-session-${s.id}`}>
                <MonitorSmartphone className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
                <span className="min-w-0 flex-1 text-ink">{s.device} · <span className={s.current ? 'font-medium text-green-700' : 'text-ink-muted'}>{s.current ? 'Active now' : timeAgo(s.lastActiveAt)}</span></span>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" onClick={() => setConfirm(true)} disabled={!others} data-testid="account-sign-out-all"><LogOut aria-hidden /> Sign out of all other devices</Button>
      </FormSection>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent data-testid="account-sign-out-dialog">
          <AlertDialogTitle>Sign out of all other devices?</AlertDialogTitle>
          <AlertDialogDescription>You'll stay signed in here. Other browsers and phones will need to sign in again.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="account-sign-out-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={signOutAll} data-testid="account-sign-out-confirm">Sign out everywhere</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
