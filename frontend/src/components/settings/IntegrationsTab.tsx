import { ShopifyMark } from '@/components/brand/ShopifyMark'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bot, Lock, Mail, Send, ShoppingBag, Sparkles, type LucideIcon } from 'lucide-react'
import type { IntegrationId, IntegrationStatus, TestResult } from '@/types'
import { settingsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { StatusChip, type Tone } from '@/components/StatusChip'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

export const META: Record<IntegrationId, { purpose: string; Icon: LucideIcon; tile: string; logo?: string }> = {
  outlook: { purpose: 'Mailbox support@goorin.com via Microsoft Graph', Icon: Mail, tile: 'bg-slate-50 text-slate-700', logo: 'microsoftoffice-color.svg' },
  shopify: { purpose: 'Orders, customers & app embed', Icon: ShoppingBag, tile: 'bg-green-50 text-green-700' },
  claude: { purpose: 'Tier-1 AI replies', Icon: Sparkles, tile: 'bg-amber-50 text-amber-700', logo: 'claude-color.svg' },
  grokbot: { purpose: 'Second AI model', Icon: Bot, tile: 'bg-slate-700 text-white' },
  resend: { purpose: 'Transactional email & CSAT', Icon: Send, tile: 'bg-brass-50 text-brass-700', logo: 'resend-color.svg' },
  loop: { purpose: 'Returns, exchanges & store credit', Icon: Send, tile: 'bg-white', logo: 'loop-mark.svg' },
}

const GROUPS: [string, string, IntegrationId[]][] = [
  ['inbox-store', 'Inbox & store', ['outlook', 'shopify', 'loop']],
  ['ai-models', 'AI models', ['claude', 'grokbot']],
  ['email-delivery', 'Email delivery', ['resend']],
]

export const lastSync = (i: IntegrationStatus) => `Checked ${i.lastSyncAt ? timeAgo(i.lastSyncAt) : 'never'}`

// One status per integration (REQ-946): Connected, Needs attention, Error or Not connected, plus the reason line.
export function integrationState(i: IntegrationStatus): { label: string; tone: Tone; reason: string | null } {
  if (i.status === 'error') return { label: 'Error', tone: 'error', reason: i.error?.split(':')[0] ?? 'Connection failed' }
  if (i.status === 'not_configured') return { label: 'Not connected', tone: 'neutral', reason: null }
  if (i.attention) return { label: 'Needs attention', tone: 'attention', reason: `Needs attention: ${i.attention}` }
  return { label: 'Connected', tone: 'success', reason: null }
}

export function StatusPill({ i }: { i: IntegrationStatus }) {
  const s = integrationState(i)
  return <StatusChip label={s.label} tone={s.tone} testId={`integration-status-${i.id}`} />
}

export function LogoTile({ id, size = 'md' }: { id: IntegrationId; size?: 'md' | 'lg' }) {
  const m = META[id]
  const box = size === 'lg' ? 'h-12 w-12' : 'h-11 w-11'
  if (id === 'shopify') return <span className={cn('flex shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-inset ring-border', box)}><ShopifyMark size={size === 'lg' ? 24 : 22} testId={`integration-logo-${id}`} /></span>
  if (m.logo) return <span className={cn('flex shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-inset ring-border', box)}><img src={`/images/brand/${m.logo}`} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" data-testid={`integration-logo-${id}`} /></span>
  return <span className={cn('flex shrink-0 items-center justify-center rounded-xl', m.tile, box)} aria-hidden data-testid={`integration-logo-${id}`}><m.Icon className="h-5 w-5" /></span>
}

export function Result({ r }: { r: TestResult | null }) {
  if (!r) return null
  return <p role="status" className={cn('text-sm font-medium', r.ok ? 'text-green-700' : 'text-red-700')} data-testid="test-result">{r.message}{r.ok && r.message.startsWith('(') ? ` · ${r.ms}ms` : ''}</p>
}

export function Credentials({ i }: { i: IntegrationStatus }) {
  return (
    <div className="space-y-3" data-testid={`secret-${i.id}`}>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-sm">
        <dt className="text-ink-muted">API key</dt>
        <dd className="flex min-w-0 items-center gap-1.5 font-mono text-ink"><Lock className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-label="Read-only" /><span className="truncate">{i.secretPreview ?? 'Not set'}</span></dd>
        <dt className="text-ink-muted">Variable</dt>
        <dd className="truncate font-mono text-ink">{i.envVar}</dd>
      </dl>
      <p className="text-xs text-ink-muted">Set via environment variable <code className="font-semibold text-ink">{i.envVar}</code>. Change it in your deployment environment.</p>
    </div>
  )
}

const RING: Record<Tone, string> = { attention: 'ring-2 ring-amber-300/80', error: 'ring-2 ring-red-300/80', success: 'ring-1 ring-black/[0.04]', pending: 'ring-1 ring-black/[0.04]', neutral: 'ring-1 ring-black/[0.04]' }

// One integration as a single focusable tile linking to its detail page.
export function IntegrationTile({ i }: { i: IntegrationStatus }) {
  const s = integrationState(i)
  return (
    <Link
      to={`/settings/integrations/${i.id}`}
      className={cn('group flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-card transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-popover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', RING[s.tone])}
      data-testid={`integration-tile-${i.id}`}
      data-ring={s.tone}
    >
      <div className="flex items-start gap-3">
        <LogoTile id={i.id} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{i.name}</p>
          {i.model && <p className="truncate font-mono text-xs text-ink-muted" data-testid={`integration-model-${i.id}`}>{i.model}</p>}
          <p className="mt-0.5 text-sm text-ink-muted" data-testid={`integration-purpose-${i.id}`}>{META[i.id].purpose}</p>
          {i.widget && <p className="mt-1 text-xs text-ink-muted" data-testid="integration-widget-status-shopify">Chat widget · {i.widget.embedEnabled ? 'Live on store' : 'Embed off'}</p>}
        </div>
      </div>
      {s.reason && <p className={cn('flex items-center gap-1.5 text-xs font-medium', s.tone === 'error' ? 'text-red-700' : 'text-amber-800')} data-testid={`integration-reason-${i.id}`}><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden /> {s.reason}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusPill i={i} />
        <span className="text-xs text-ink-muted" data-testid={`integration-last-sync-${i.id}`}>{lastSync(i)}</span>
        <span className="ml-auto text-xs font-semibold text-tobacco-700 group-hover:underline" data-testid={`integration-manage-${i.id}`}>Manage</span>
      </div>
    </Link>
  )
}

function summary(list: IntegrationStatus[]) {
  const n = (label: string) => list.filter((i) => integrationState(i).label === label).length
  return [`${n('Connected')} connected`, n('Needs attention') && `${n('Needs attention')} needs attention`, n('Error') && `${n('Error')} error${n('Error') === 1 ? '' : 's'}`, n('Not connected') && `${n('Not connected')} not connected`].filter(Boolean).join(' · ')
}

const GRID = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'

export function IntegrationsTab() {
  const { data, loading, error, reload } = useApi(() => settingsApi.listIntegrations(), [])
  if (loading)
    return (
      <div className="space-y-4" data-testid="integrations-loading">
        <Skeleton className="h-4 w-64" />
        <div className={GRID}>{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[148px] w-full rounded-2xl" />)}</div>
      </div>
    )
  if (error) return <Card><ErrorState title="Integrations didn't load" onRetry={reload} testId="integrations-error" /></Card>
  if (!data?.length) return <Card><EmptyState title="No integrations yet" description="Connect Office 365, Shopify and your AI providers to get started." testId="integrations-empty" /></Card>
  return (
    <div className="space-y-8" data-testid="integrations-tab">
      <p className="text-sm text-ink-muted" data-testid="integrations-summary">{summary(data)}</p>
      {GROUPS.map(([id, title, ids]) => {
        const items = ids.map((x) => data.find((i) => i.id === x)).filter(Boolean) as IntegrationStatus[]
        if (!items.length) return null
        return (
          <section key={id} className="space-y-3" data-testid={`integration-group-${id}`}>
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            <div className={GRID} data-testid={id === 'inbox-store' ? 'integrations-grid' : undefined}>{items.map((i) => <IntegrationTile key={i.id} i={i} />)}</div>
          </section>
        )
      })}
    </div>
  )
}
