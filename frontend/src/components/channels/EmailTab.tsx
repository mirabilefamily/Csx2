import { useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react'
import { toast } from 'sonner'
import type { EmailChannelSettings, TestResult } from '@/types'
import { channelsApi, settingsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/components/auth/AuthContext'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/overlay'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/States'
import { PreviewPane } from '@/components/PreviewPane'
import { SaveBar } from '@/components/settings/SaveBar'
import { LogoTile, Result } from '@/components/settings/IntegrationsTab'
import { isValidEmail } from '@/lib/format'
import { cn } from '@/lib/utils'

const CARD = 'rounded-2xl bg-surface p-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4'

function Block({ title, description, children, testId }: { title: string; description?: ReactNode; children: ReactNode; testId: string }) {
  return (
    <section className="space-y-4 py-6 first:pt-0 last:pb-0" data-testid={testId}>
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}

type View = 'reply' | 'ack'

const REPLY_BODY = 'Hi Dev,\n\nThanks for your patience. Your order #GB20398 shipped with UPS on Oct 2 and tracking shows it out for delivery in Brooklyn today. You can follow it here: ups.com/track/1Z84X…\n\nIf it hasn\'t arrived by tomorrow evening, reply to this email and I\'ll sort it out.'

function EmailPreview({ d, sig, view, setView }: { d: EmailChannelSettings; sig: string; view: View; setView: (v: View) => void }) {
  const from = `${d.fromName || 'Goorin Bros.'} <${d.replyTo}>`
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04]" data-testid="email-preview">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="text-[15px] font-semibold text-ink">Preview</p>
        <div className="inline-flex gap-1 rounded-lg bg-surface-muted p-1" role="group" aria-label="Preview view">
          {([['reply', 'Reply'], ['ack', 'Auto-acknowledgement']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={cn('min-h-9 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:min-h-11', view === id ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`email-preview-${id}`}>{label}</button>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-border px-5 py-3 text-sm">
        <dt className="text-ink-muted">From</dt><dd className="truncate text-ink" data-testid="email-preview-from">{from}</dd>
        <dt className="text-ink-muted">To</dt><dd className="truncate text-ink">Dev Patel &lt;dev.patel@example.com&gt;</dd>
        <dt className="text-ink-muted">Subject</dt><dd className="truncate font-medium text-ink" data-testid="email-preview-subject">{view === 'reply' ? 'Re: Where is my order #GB20398?' : 'We got your message'}</dd>
      </dl>
      <div className="space-y-4 px-5 py-5 text-sm leading-relaxed text-ink" data-testid="email-preview-body">
        {view === 'reply' ? (
          <p className="whitespace-pre-wrap">{REPLY_BODY}</p>
        ) : d.autoAck.enabled ? (
          <p className="whitespace-pre-wrap" data-testid="email-preview-ack-message">{d.autoAck.message}</p>
        ) : (
          <p className="text-ink-muted" data-testid="email-preview-ack-off">Auto-acknowledgement is off, so nothing is sent when a new email arrives.</p>
        )}
        {(view === 'reply' || d.autoAck.enabled) && <p className="whitespace-pre-wrap border-t border-border pt-4 text-ink-muted" data-testid="email-signature-preview">{sig}</p>}
      </div>
    </div>
  )
}

function Loaded({ initial }: { initial: EmailChannelSettings }) {
  const { user } = useAuth()
  const resend = useApi(() => settingsApi.getIntegration('resend'), [])
  const [saved, setSaved] = useState(initial)
  const [d, setD] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)
  const [view, setView] = useState<View>('reply')
  const [to, setTo] = useState(user?.email ?? '')
  const [res, setRes] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(saved), [d, saved])
  useUnsavedGuard('email-channel', dirty)
  const replyBad = !isValidEmail(d.replyTo)
  const save = async () => {
    setTried(true)
    if (replyBad || !d.fromName.trim()) return
    setSaving(true)
    try { const s = await channelsApi.saveEmailChannel(d); setSaved(s); setD(s); setTried(false); toast.success('Email settings saved') } catch (e) { toast.error((e as Error).message) }
    setSaving(false)
  }
  const test = async () => {
    setTesting(true)
    try { setRes(await settingsApi.sendTestEmail(to)) } catch (e) { setRes({ ok: false, ms: 0, message: (e as Error).message }) }
    setTesting(false)
  }
  const r = resend.data
  const sig = d.signature.replace('{agent_first_name}', user?.name.split(' ')[0] ?? 'Ava')
  return (
    <div className="grid gap-8 pb-24 lg:grid-cols-[minmax(0,640px)_minmax(0,440px)] lg:justify-between" data-testid="email-tab">
      <div className={cn(CARD, 'min-w-0 divide-y divide-border/70')} data-testid="email-settings">
        <Block title="Sender" description="What customers see in their inbox." testId="email-section-sender">
          <div><Label htmlFor="email-from">From name</Label><Input id="email-from" className="mt-1.5" value={d.fromName} onChange={(e) => setD({ ...d, fromName: e.target.value })} aria-invalid={!d.fromName.trim()} data-testid="email-from-name" />{!d.fromName.trim() && <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">Add a from name.</p>}</div>
          <div>
            <Label htmlFor="email-reply-to">Reply-to</Label>
            <Input id="email-reply-to" type="email" className="mt-1.5" value={d.replyTo} onChange={(e) => setD({ ...d, replyTo: e.target.value })} aria-invalid={replyBad} aria-describedby={replyBad ? 'email-reply-to-error' : undefined} data-testid="email-reply-to" />
            {(replyBad || (tried && replyBad)) && <p id="email-reply-to-error" role="alert" className="mt-1.5 text-xs font-medium text-red-700" data-testid="email-reply-to-error">Enter a valid email address.</p>}
          </div>
        </Block>
        <Block title="Signature" description="Added under every agent and AI email. {agent_first_name} fills in automatically." testId="email-section-signature">
          <div><Label htmlFor="email-signature">Signature</Label><Textarea id="email-signature" rows={5} className="mt-1.5" value={d.signature} onChange={(e) => setD({ ...d, signature: e.target.value })} data-testid="email-signature" /></div>
        </Block>
        <Block title="Auto-acknowledgement" description="An instant reply when a new email arrives." testId="email-section-ack">
          <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-ink"><Switch checked={d.autoAck.enabled} onCheckedChange={(v) => { setD({ ...d, autoAck: { ...d.autoAck, enabled: v } }); setView('ack') }} data-testid="email-ack-enabled" aria-label="Send auto-acknowledgement" /> Send an acknowledgement</label>
          {d.autoAck.enabled && <div><Label htmlFor="email-ack-message">Acknowledgement message</Label><Textarea id="email-ack-message" className="mt-1.5" value={d.autoAck.message} onFocus={() => setView('ack')} onChange={(e) => setD({ ...d, autoAck: { ...d.autoAck, message: e.target.value } })} data-testid="email-ack-message" /></div>}
        </Block>
        <Block title="Sending domain" description="Outbound mail and CSAT surveys go through Resend." testId="email-section-domain">
          <div className="flex items-center gap-3"><LogoTile id="resend" /><div><p className="text-sm font-semibold text-ink">{r?.details['Sending domain'] ?? '…'}</p><p className="text-xs text-ink-muted">{r?.status === 'connected' ? 'Verified and sending' : 'Not verified'}</p></div></div>
          <ul className="flex flex-wrap gap-2" data-testid="email-domain-checks">
            {r?.checklist?.map((c) => <li key={c.label} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-ink">{c.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-700" aria-hidden /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-700" aria-hidden />}{c.label.replace(' record', '')}</li>)}
          </ul>
          <div><Label htmlFor="email-test-to">Send a test to</Label><Input id="email-test-to" type="email" className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} data-testid="email-test-to" /></div>
          <Button variant="outline" onClick={test} loading={testing} data-testid="email-send-test"><Send aria-hidden /> Send test email</Button>
          <Result r={res} />
        </Block>
      </div>
      <PreviewPane label="Email preview" testId="email-preview-pane">
        <EmailPreview d={d} sig={sig} view={view} setView={setView} />
      </PreviewPane>
      {dirty && (
        <SaveBar note={tried && replyBad && <span className="text-xs font-medium text-red-700" role="alert" data-testid="email-save-blocked">Fix the reply-to address to save.</span>}>
          <Button variant="ghost" size="sm" onClick={() => { setD(saved); setTried(false) }} data-testid="email-discard">Discard</Button>
          <Button size="sm" onClick={save} loading={saving} aria-disabled={replyBad || !d.fromName.trim()} className={replyBad || !d.fromName.trim() ? 'opacity-50' : ''} data-testid="email-save">Save</Button>
        </SaveBar>
      )}
    </div>
  )
}

export function EmailTab() {
  const { data, loading, error, reload } = useApi(() => channelsApi.getEmailChannel(), [])
  if (loading) return <Skeleton className="h-[640px] w-full rounded-2xl" data-testid="email-loading" />
  if (error || !data) return <ErrorState title="Email settings didn't load" onRetry={reload} testId="email-error" />
  return <Loaded initial={data} />
}
