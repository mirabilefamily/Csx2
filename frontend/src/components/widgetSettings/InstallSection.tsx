import { ShopifyMark } from '@/components/brand/ShopifyMark'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CheckCircle2, ChevronDown, Copy, ExternalLink, Loader2, XCircle } from 'lucide-react'
import { widgetApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import type { ThemeEmbedSettings, VerifyResult, WidgetSettings } from '@/types'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/StatusChip'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { SHARED_FIELDS, mergeEffective } from '@/lib/widgetRules'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SourceBadge } from './fields'
import type { Update } from './validate'

export const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL || 'https://desk.goorin.com'
const CARD = 'rounded-2xl bg-surface p-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4'

function Step({ n, done, title, children, testId }: { n: number; done: boolean; title: string; children?: ReactNode; testId: string }) {
  return (
    <li className="flex gap-4" data-testid={testId} data-done={done}>
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold', done ? 'bg-green-600 text-white' : 'bg-surface-muted text-ink ring-1 ring-inset ring-border')} role="img" aria-label={done ? `Step ${n}, done` : `Step ${n}`} data-testid={`${testId}-marker`}>
        {done ? <Check className="h-4 w-4" aria-hidden /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {children && <div className="mt-1 space-y-3 text-sm text-ink-muted">{children}</div>}
      </div>
    </li>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs text-ink-muted">{label}</dt><dd className="mt-0.5 truncate text-sm font-medium text-ink">{children}</dd></div>
}

function CardHead({ title, chip, children }: { title: string; chip: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-inset ring-border"><ShopifyMark size={20} decorative /></span>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {chip}
      {children}
    </div>
  )
}

export function InstallSection({ draft, theme, update }: { draft: WidgetSettings; theme: ThemeEmbedSettings; update: Update }) {
  const status = useApi(() => widgetApi.getInstallStatus(), [])
  const [verify, setVerify] = useState<'idle' | 'loading' | VerifyResult>('idle')
  const [copied, setCopied] = useState(false)
  const { confirmLeave } = useUnsavedGuard()
  const navigate = useNavigate()
  const s = status.data
  const domain = s?.shopDomain ?? 'goorin.myshopify.com'
  const snippet = `<script src="${APP_BASE_URL}/widget.js" data-shop="${domain}" async></script>`
  const effective = mergeEffective(draft, theme)
  const value = (f: (typeof SHARED_FIELDS)[number]['id']) =>
    f === 'primary' ? effective.branding.colors.primary : f === 'accent' ? effective.branding.colors.accent : f === 'launcherPosition' ? effective.launcher.position.replace('-', ' ') : effective.display.hideOnMobile ? 'On' : 'Off'
  const embed = !!s?.embedEnabled
  const verified = (typeof verify === 'object' && verify.detected) || !!s?.lastSeenAt

  const copy = async () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    try {
      await navigator.clipboard.writeText(snippet)
    } catch {
      const t = document.createElement('textarea')
      t.value = snippet
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
  }
  const runVerify = async () => {
    setVerify('loading')
    await widgetApi.verifyInstall().then(setVerify, () => setVerify({ detected: false, message: "Couldn't run the check. Try again." }))
    status.reload()
  }

  return (
    <>
      <section className={cn(CARD, 'space-y-6')} data-testid="install-embed-step">
        <CardHead title="Chat widget" chip={<StatusChip label={embed ? 'Installed' : 'Not installed'} testId="install-embed-status" />} />
        {status.loading && <p className="text-sm text-ink-muted">Checking your store…</p>}
        {status.error && <p className="text-sm text-red-700">Couldn't load install status. <button className="underline" onClick={status.reload}>Retry</button></p>}
        {s && (
          <dl className="grid gap-4 border-y border-border/70 py-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="install-status-card">
            <Fact label="Store"><span data-testid="install-domain">{s.shopDomain}</span></Fact>
            <Fact label="Active theme"><span data-testid="install-theme">{s.themeName}</span></Fact>
            <Fact label="Install method"><span data-testid="install-method">{s.method === 'app_embed' ? 'App embed' : s.method === 'script_tag' ? 'Script tag' : 'Not installed'}</span></Fact>
            <Fact label="Last widget load"><span data-testid="install-last-seen">{s.lastSeenAt ? timeAgo(s.lastSeenAt) : 'Never'}</span></Fact>
          </dl>
        )}
        <ol className="space-y-5" data-testid="install-steps">
          <Step n={1} done={embed} title="Open the theme editor" testId="install-step-1">
            <p data-testid="install-embed-path">Online Store → Themes → Customize → App embeds → toggle Goorin Support Desk → Save</p>
            <Button variant="outline" onClick={() => confirmLeave(() => navigate('/widget-demo/theme-editor'))} data-testid="open-theme-editor"><ExternalLink aria-hidden /> Open Theme Editor</Button>
          </Step>
          <Step n={2} done={embed} title="Turn on the Goorin Support Desk app embed" testId="install-step-2">
            <p>No code needed. The embed loads the widget on every page of your theme.</p>
          </Step>
          <Step n={3} done={verified} title="Check the widget loads" testId="install-step-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runVerify} disabled={verify === 'loading'} data-testid="install-verify">{verify === 'loading' && <Loader2 className="animate-spin" aria-hidden />} Verify installation</Button>
              <div aria-live="polite" data-testid="install-verify-result">
                {verify === 'loading' && <span className="text-sm text-ink-muted">Looking for the widget on your storefront…</span>}
                {typeof verify === 'object' && (
                  <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', verify.detected ? 'text-green-700' : 'text-red-700')}>
                    {verify.detected ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
                    {verify.message}
                  </span>
                )}
              </div>
            </div>
          </Step>
        </ol>
        <details className="group border-t border-border/70 pt-4" data-testid="install-fallback">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden" data-testid="install-fallback-toggle">
            <ChevronDown className="h-4 w-4 text-ink-subtle transition-transform group-open:rotate-180" aria-hidden /> Can't use the app embed?
          </summary>
          <div className="mt-2 space-y-3">
            <p className="text-sm text-ink-muted">Paste this just before <code className="rounded bg-surface-muted px-1 font-mono text-xs">&lt;/body&gt;</code> in <code className="rounded bg-surface-muted px-1 font-mono text-xs">theme.liquid</code>.</p>
            <div className="flex items-start gap-2">
              <pre tabIndex={0} aria-label="Script tag snippet" className="min-w-0 flex-1 overflow-x-auto rounded-md bg-[#1F1D1A] p-3 font-mono text-xs text-[#F1E6CF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="install-snippet">{snippet}</pre>
              <Button variant="outline" size="sm" onClick={copy} data-testid="install-copy"><Copy aria-hidden /> {copied ? 'Copied' : 'Copy'}</Button>
            </div>
          </div>
        </details>
      </section>

      <section className={cn(CARD, 'space-y-5')} data-testid="install-contact-form">
        <CardHead title="Contact form" chip={<StatusChip label="Installed" testId="install-contact-form-chip" />}>
          <span className="text-sm text-ink-muted" data-testid="install-contact-form-status">Live on /pages/contact</span>
        </CardHead>
        <ol className="space-y-5">
          <Step n={1} done title="Open the Contact page template" testId="install-form-step-1"><p>Online Store → Themes → Customize → Pages → Contact</p></Step>
          <Step n={2} done title="Add the Goorin contact form app block" testId="install-form-step-2"><p>Add block → Apps → Goorin contact form</p></Step>
          <Step n={3} done title="Save the template" testId="install-form-step-3"><p>The block uses the fields from Channels → Contact form. Submissions arrive in the Inbox as email tickets.</p></Step>
        </ol>
      </section>

      <section className={CARD} data-testid="install-sources">
        <h3 className="text-[15px] font-semibold text-ink">Settings source</h3>
        <p className="mt-0.5 text-sm text-ink-muted">Settings saved here override the theme editor defaults.</p>
        <ul className="mt-3 divide-y divide-border">
          {SHARED_FIELDS.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 py-2 text-sm" data-testid={`install-source-${f.id}`}>
              <span className="w-36 text-ink">{f.label}</span>
              <span className="font-mono text-xs capitalize text-ink-muted">{value(f.id)}</span>
              <span className="ml-auto"><SourceBadge source={draft.sources[f.id]} /></span>
              {draft.sources[f.id] === 'desk' && (
                <button type="button" onClick={() => update((d) => { d.sources[f.id] = 'theme' })} className="min-h-11 text-xs font-medium text-tobacco-700 underline" data-testid={`install-use-theme-${f.id}`}>Use theme editor value</button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
