import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, MessageCircle, PlugZap, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { IntegrationStatus, TestResult } from '@/types'
import { settingsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { isValidEmail, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useIsPhone } from '@/hooks/useIsPhone'
import { Credentials, LogoTile, META, Result, StatusPill, lastSync } from './IntegrationsTab'
import { FormSection, SaveBar } from './SaveBar'

const BACK = 'inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:justify-center'

function PromptTester({ i, model }: { i: IntegrationStatus; model: string }) {
  const [prompt, setPrompt] = useState('What size is a 22.5 inch head?')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<TestResult | null>(null)
  const run = async () => {
    setBusy(true)
    try { setRes(await settingsApi.testPrompt(i.id as 'claude' | 'grokbot', model, prompt)) } catch { setRes({ ok: false, ms: 0, message: 'Request failed: could not reach the server' }) }
    setBusy(false)
  }
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`prompt-${i.id}`}>Test prompt</Label>
        <Textarea id={`prompt-${i.id}`} className="mt-1.5 min-h-[72px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} data-testid={`prompt-input-${i.id}`} />
      </div>
      <Button size="sm" variant="outline" onClick={run} loading={busy} data-testid={`prompt-run-${i.id}`}>Run prompt</Button>
      <Result r={res} />
    </div>
  )
}

function ResendTester() {
  const [to, setTo] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [res, setRes] = useState<TestResult | null>(null)
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setRes(null)
    if (!isValidEmail(to)) return setErr('Enter a valid email address.')
    setErr(null)
    setBusy(true)
    try { setRes(await settingsApi.sendTestEmail(to)) } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }
  return (
    <div className="space-y-2">
      <Label htmlFor="resend-to">Send test email</Label>
      <div className="flex flex-wrap gap-2">
        <Input id="resend-to" type="email" inputMode="email" autoCapitalize="none" className="h-9 min-w-0 flex-1" value={to} onChange={(e) => setTo(e.target.value)} aria-invalid={!!err} placeholder="you@goorin.com" data-testid="resend-test-email" />
        <Button size="sm" variant="outline" onClick={send} loading={busy} data-testid="resend-send-test">Send test email</Button>
      </div>
      <FieldError>{err}</FieldError>
      <Result r={res} />
    </div>
  )
}

function Header({ i }: { i: IntegrationStatus }) {
  const [testing, setTesting] = useState(false)
  const [res, setRes] = useState<TestResult | null>(null)
  const isPhone = useIsPhone()
  const test = async () => {
    setTesting(true)
    setRes(null)
    try { setRes(await settingsApi.testIntegration(i.id)) } catch { setRes({ ok: false, ms: 0, message: 'Connection failed: could not reach the server' }) }
    setTesting(false)
  }
  const back = <Link to="/settings/integrations" className={BACK} aria-label={isPhone ? 'All integrations' : undefined} data-testid="integration-back"><ArrowLeft className="h-4 w-4" aria-hidden /> {!isPhone && 'All integrations'}</Link>
  return (
    <>
      {isPhone && (
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 flex items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur" data-testid="integration-sticky-header">
          {back}
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{i.name}</p>
          <StatusPill i={i} />
        </div>
      )}
      <header className="space-y-3" data-testid={`integration-${i.id}`}>
        {!isPhone && back}
        <div className="flex flex-wrap items-center gap-4">
          <LogoTile id={i.id} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-ink" data-testid="integration-detail-name">{i.name}</h2>
              {!isPhone && <StatusPill i={i} />}
            </div>
            <p className="text-sm text-ink-muted">{META[i.id].purpose} · <span data-testid={`integration-last-sync-${i.id}`}>{lastSync(i)}</span></p>
          </div>
          <Button variant="outline" className="max-sm:w-full" onClick={test} disabled={testing} data-testid={`test-connection-${i.id}`}>{testing ? <Loader2 className="animate-spin" aria-hidden /> : <PlugZap aria-hidden />} Test connection</Button>
        </div>
        <Result r={res} />
      </header>
    </>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border/70 rounded-2xl bg-surface px-6 py-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4">{children}</div>
}

function WidgetSummary({ w }: { w: NonNullable<IntegrationStatus['widget']> }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface p-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4" data-testid="shopify-widget-summary">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brass-50 text-brass-700"><MessageCircle className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold text-ink">Chat widget</h3>
        <p className="mt-0.5 text-sm text-ink-muted">
          <span className="font-medium text-ink" data-testid="shopify-widget-embed">{w.embedEnabled ? 'App embed on · Live on store' : 'App embed off'}</span>
          {' · '}
          <span data-testid="shopify-widget-last-load">{w.lastSeenAt ? `Last widget load ${timeAgo(w.lastSeenAt)}` : 'No widget load yet'}</span>
        </p>
      </div>
      <Link to="/channels/chat" className={cn(buttonVariants({ variant: 'outline' }), 'max-sm:w-full')} data-testid="shopify-customize-widget">Customize chat widget →</Link>
    </div>
  )
}

function Body({ i, onSaved }: { i: IntegrationStatus; onSaved: (n: IntegrationStatus) => void }) {
  const [model, setModel] = useState(i.model ?? '')
  const [saving, setSaving] = useState(false)
  const dirty = !!i.models && model !== i.model
  useUnsavedGuard(`integration-${i.id}`, dirty)
  const save = async () => {
    setSaving(true)
    try { onSaved(await settingsApi.saveIntegrationConfig(i.id, { model })); toast.success(`${i.name} settings saved`) } catch (e) { toast.error((e as Error).message) }
    setSaving(false)
  }
  const details = Object.entries(i.details)
  return (
    <div className="space-y-6 pb-24" data-testid={`integration-detail-${i.id}`}>
      <Header i={i} />
      {i.attention && i.status === 'connected' && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status" data-testid={`integration-attention-${i.id}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p><span className="font-semibold">Needs attention.</span> {i.attention}</p>
        </div>
      )}
      {i.status === 'error' && i.error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert" data-testid={`integration-error-${i.id}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p><span className="font-semibold">Connection error.</span> {i.error}</p>
        </div>
      )}
      <Panel>
        <FormSection title="Connection details" description={i.description} testId="integration-section-connection">
          {details.length > 0 ? (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-sm" data-testid={`integration-details-${i.id}`}>
              {details.map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-muted">{k}</dt><dd className="text-ink">{v}</dd></div>)}
            </dl>
          ) : <p className="text-sm text-ink-muted">Calls are made with the API key below.</p>}
          {i.id === 'shopify' && <Link to="/channels/install" className="inline-flex min-h-11 items-center rounded text-sm font-medium text-tobacco-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="shopify-widget-install-link">Install the chat widget (Channels)</Link>}
          {i.id === 'loop' && <a href="https://returns.goorin.com" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded text-sm font-medium text-tobacco-700 underline underline-offset-2" data-testid="loop-portal-link">Open return portal</a>}
          {i.checklist && (
            <ul className="space-y-1.5" data-testid="resend-checklist">
              <li className="text-sm font-medium text-ink">Domain verification</li>
              {i.checklist.map((c) => <li key={c.label} className="flex items-center gap-2 text-sm text-ink">{c.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden /> : <XCircle className="h-4 w-4 text-red-600" aria-hidden />}{c.label} <span className="text-xs text-ink-muted">{c.ok ? 'Verified' : 'Pending'}</span></li>)}
            </ul>
          )}
        </FormSection>
        <FormSection title="Configuration" description={i.models ? 'Which model answers, and a quick prompt to try it.' : i.id === 'resend' ? 'Send yourself a test email.' : 'Nothing to configure here; the connection is managed by the provider.'} testId="integration-section-configuration">
          {i.models && (
            <div className="max-w-xs">
              <Label htmlFor={`model-${i.id}`}>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger id={`model-${i.id}`} className="mt-1.5" data-testid={`model-select-${i.id}`}><SelectValue /></SelectTrigger>
                <SelectContent>{i.models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {i.models && <PromptTester i={i} model={model} />}
          {i.id === 'resend' && <ResendTester />}
        </FormSection>
        <FormSection title="Credentials" description="Read-only. Secrets never leave the server; only a masked preview is shown." testId="integration-section-credentials"><Credentials i={i} /></FormSection>
      </Panel>
      {i.widget && <WidgetSummary w={i.widget} />}
      {dirty && (
        <SaveBar>
          <Button variant="ghost" size="sm" onClick={() => setModel(i.model ?? '')} data-testid="integration-discard">Discard</Button>
          <Button size="sm" onClick={save} loading={saving} data-testid="integration-save">Save</Button>
        </SaveBar>
      )}
    </div>
  )
}

// /settings/integrations/:id(/:sub): full settings for one integration. Shopify also has Chat widget and Install sub-tabs.
export function IntegrationDetail({ id, sub }: { id: string; sub?: string }) {
  const { data, loading, error, reload } = useApi(() => settingsApi.getIntegration(id), [id])
  const [item, setItem] = useState<IntegrationStatus | null>(null)
  useEffect(() => setItem(data ?? null), [data])
  if (sub) return <Navigate to={`/settings/integrations/${id}`} replace />
  if (loading && !item) return <div className="space-y-4" data-testid="integration-detail-loading"><Skeleton className="h-5 w-28" /><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-80 w-full rounded-2xl" /></div>
  if (error) return <Card><ErrorState title="This integration didn't load" onRetry={reload} testId="integration-detail-error" /></Card>
  if (!item)
    return (
      <Card>
        <EmptyState title="Integration not found" description="It may have been removed, or the link is wrong." action={<Link to="/settings/integrations" className={BACK} data-testid="integration-not-found-back"><ArrowLeft className="h-4 w-4" aria-hidden /> Back to Integrations</Link>} testId="integration-not-found" />
      </Card>
    )
  return <Body key={item.id} i={item} onSaved={setItem} />
}
