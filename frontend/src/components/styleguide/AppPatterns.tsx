import { useState } from 'react'
import { BookOpen, Inbox, LayoutDashboard, MessagesSquare } from 'lucide-react'
import type { DashboardSummary, FraudAlert, KpiMetric } from '@/types'
import { FraudAlertRow, RefundPipeline, RiskBadge } from '@/components/dashboard/FraudBits'
import { settingsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { KpiStrip } from '@/components/dashboard/KpiStrip'
import { AiPerformanceCard } from '@/components/dashboard/OverviewCharts'
import { Panel, RankedList } from '@/components/dashboard/Panel'
import { navItemClass, NAV_BADGE_COLLAPSED } from '@/components/shell/Sidebar'
import { IntegrationTile } from '@/components/settings/IntegrationsTab'
import { FormSection } from '@/components/settings/SaveBar'
import { Segmented } from '@/components/widgetSettings/fields'
import { Input, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { palette } from '@/theme/tokens'
import { cn } from '@/lib/utils'
import { Specimen } from './SgSection'

const series = [12, 14, 11, 15, 17, 16, 19, 18, 21, 20]
const KPIS: KpiMetric[] = [
  { key: 'sg-open', label: 'Open tickets', value: 21, previous: 28, format: 'count', betterWhen: 'lower', hint: 'Lower is better', series },
  { key: 'sg-created', label: 'Tickets created', value: 1089, previous: 1047, format: 'count', betterWhen: 'neutral', hint: 'Neutral', series },
  { key: 'sg-ai', label: 'AI resolution rate', value: 77.8, previous: 76.3, format: 'percent', betterWhen: 'higher', hint: 'Higher is better', series: [...series].reverse() },
  { key: 'sg-frt', label: 'First response time', value: 5.7, previous: 6.3, format: 'duration', betterWhen: 'lower', hint: 'Lower is better', series },
  { key: 'sg-res', label: 'Resolution time', value: 364, previous: 395, format: 'duration', betterWhen: 'lower', hint: 'Lower is better', series: [...series].reverse() },
  { key: 'sg-csat', label: 'CSAT average', value: 4.49, previous: 4.49, format: 'score', betterWhen: 'higher', hint: 'No change', series },
  { key: 'sg-rate', label: 'CSAT response rate', value: 33.2, previous: 30.8, format: 'percent', betterWhen: 'higher', hint: 'Higher is better', series },
]
const RESOLVED = { resolvedBy: [{ key: 'claude', label: 'AI', count: 612 }, { key: 'grokbot', label: 'Grokbot', count: 148 }, { key: 'human', label: 'Human', count: 216 }] } as unknown as DashboardSummary
const sgAlert = (id: string, level: FraudAlert['level'], riskScore: number, status: FraudAlert['status']): FraudAlert => ({
  id, ticketId: 'GB-1064', orderNumber: '#GB20268', customer: 'Nora Lindqvist', riskScore, level, amountAtRisk: 168, status, createdAt: new Date(Date.now() - 4 * 3_600_000).toISOString(),
  signals: [{ code: 'not_received_delivered', label: 'Not received · tracking delivered' }, { code: 'repeat_refund', label: '3rd refund in 30 days' }],
  reviewedBy: status === 'open' ? null : 'Ava Martinez', reviewedAt: status === 'open' ? null : new Date().toISOString(), refundId: null,
})
const SG_ALERTS = [sgAlert('sg-open', 'high', 91, 'open'), sgAlert('sg-held', 'medium', 57, 'held')]
const REASONS = [{ key: 'low', label: 'Low confidence', count: 64 }, { key: 'refund', label: 'Refund over limit', count: 41 }, { key: 'angry', label: 'Negative sentiment', count: 23 }]

// Refreshed dashboard pieces: KPI strip items with sparklines, stacked bar, ranked list.
export function DashboardSamples() {
  return (
    <div className="space-y-6">
      <Specimen label="KPI stat strip items with delta chips and sparklines"><KpiStrip kpis={KPIS} comparisonLabel="vs prior 30 days" loading={false} /></Specimen>
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen label="AI performance card (stacked proportion bar)"><AiPerformanceCard data={RESOLVED} loading={false} /></Specimen>
        <Specimen label="Ranked bar list">
          <Panel title="Escalation reasons" description="Why tickets left the AI" testId="sg-ranked"><RankedList rows={REASONS} color={palette.tobacco[600]} testId="sg-ranked-list" /></Panel>
        </Specimen>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen label="Refund pipeline bar"><RefundPipeline stages={{ requested: 4, approved: 1, refunded: 21, declined: 3, on_hold: 1 }} testId="sg-refund-pipeline" /></Specimen>
        <Specimen label="Risk badges (score + level text, not color alone)">
          <div className="flex flex-wrap gap-2"><RiskBadge level="high" score={91} testId="sg-risk-high" /><RiskBadge level="medium" score={57} testId="sg-risk-medium" /><RiskBadge level="low" score={38} testId="sg-risk-low" /></div>
        </Specimen>
      </div>
      <Specimen label="Fraud alert rows (open with actions, reviewed)">
        <ul className="divide-y divide-border/70 rounded-2xl bg-surface p-6">{SG_ALERTS.map((a) => <FraudAlertRow key={a.id} a={a} />)}</ul>
      </Specimen>
    </div>
  )
}

const ITEMS = [
  { label: 'Default', Icon: LayoutDashboard, active: false, hover: false },
  { label: 'Hover', Icon: BookOpen, active: false, hover: true },
  { label: 'Active', Icon: Inbox, active: true, hover: false },
  { label: 'Channels', Icon: MessagesSquare, active: false, hover: false },
]

function Bar() {
  return <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#B08D57]" aria-hidden />
}

// Sidebar nav item states, using the same class builder as the live sidebar.
export function NavSamples() {
  return (
    <div className="flex flex-wrap items-start gap-8">
      <Specimen label="Expanded">
        <div className="w-60 space-y-1.5 rounded-xl bg-white p-3 ring-1 ring-border">
          {ITEMS.map(({ label, Icon, active, hover }) => (
            <span key={label} className={navItemClass(active, false, hover)} data-testid={`sg-nav-${label.toLowerCase()}`}>
              {active && <Bar />}
              <Icon className={cn('h-[19px] w-[19px]', active ? 'text-tobacco-600' : hover ? 'text-ink' : 'text-ink-muted')} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </Specimen>
      <Specimen label="Collapsed · active with badge">
        <div className="flex w-[72px] flex-col gap-1.5 rounded-xl bg-white py-3 ring-1 ring-border">
          <span className={navItemClass(false, true)}><LayoutDashboard className="h-[19px] w-[19px] text-ink-muted" aria-hidden /></span>
          <span className={navItemClass(true, true)} data-testid="sg-nav-collapsed-badge">
            <Bar />
            <span className="relative flex">
              <Inbox className="h-[19px] w-[19px] text-tobacco-600" aria-hidden />
              <span className={cn('inline-flex items-center justify-center rounded-full bg-amber-400 font-semibold text-amber-950', NAV_BADGE_COLLAPSED)}>7</span>
            </span>
          </span>
        </div>
      </Specimen>
    </div>
  )
}

// Phone (<640px) patterns: bottom tab bar and bottom sheet, shown as static specimens.
export function PhoneSamples() {
  const tabs = [['Dashboard', LayoutDashboard], ['Inbox', Inbox], ['Guidance', BookOpen]] as const
  return (
    <div className="flex flex-wrap items-start gap-8" data-sg-specimen>
      <Specimen label="Bottom tab bar (active Inbox, needs-human badge)">
        <div className="w-[360px] max-w-full overflow-hidden rounded-xl border border-border bg-white" data-testid="sg-bottom-tab-bar">
          <ul className="flex">
            {tabs.map(([label, Icon]) => {
              const active = label === 'Inbox'
              return (
                <li key={label} className={cn('relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', active ? 'text-tobacco-700' : 'text-ink-muted')}>
                  {active && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-[#B08D57]" aria-hidden />}
                  <span className="relative"><Icon className={cn('h-[22px] w-[22px]', active && 'text-tobacco-600')} aria-hidden />{active && <span className="absolute -right-3 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-semibold text-amber-950 ring-2 ring-white">7</span>}</span>
                  {label}
                </li>
              )
            })}
          </ul>
        </div>
      </Specimen>
      <Specimen label="Bottom sheet (dialogs, confirms, filters, actions below 640px)">
        <div className="relative h-[260px] w-[360px] max-w-full overflow-hidden rounded-xl bg-ink/40" data-testid="sg-bottom-sheet">
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-surface p-5 pt-3 shadow-popover">
            <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-border-strong" aria-hidden />
            <p className="text-base font-semibold text-ink">Filters</p>
            <div className="mt-3 h-11 rounded-lg border border-border-strong" />
            <div className="mt-4 grid grid-cols-2 gap-2"><span className="flex h-11 items-center justify-center rounded-lg border border-border-strong text-sm font-medium">Clear</span><span className="flex h-11 items-center justify-center rounded-lg bg-tobacco-600 text-sm font-medium text-white">Apply</span></div>
          </div>
        </div>
      </Specimen>
    </div>
  )
}

export function SegmentedSample() {
  const [v, setV] = useState<'stars' | 'emoji' | 'numeric'>('stars')
  return <Segmented label="Survey style" value={v} onChange={setV} testId="sg-segmented" options={[{ id: 'stars', label: 'Stars' }, { id: 'emoji', label: 'Emoji' }, { id: 'numeric', label: 'Numeric' }]} />
}

// Integration card (live mock data) and the label-left settings form section.
export function SettingsSamples() {
  const { data } = useApi(() => settingsApi.listIntegrations(), [])
  return (
    <div className="space-y-8">
      <Specimen label="Integration tiles · Shopify bag mark, connected, error (red edge + reason), not configured (slate edge)">
        {data ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.filter((i) => ['shopify', 'claude', 'resend'].includes(i.id)).map((i) => <IntegrationTile key={i.id} i={i} />)}</div> : <Skeleton className="h-[148px] w-full rounded-2xl" />}
      </Specimen>
      <Specimen label="Settings form section · label + help left, controls right (stacks below 1024px)">
        <div className="rounded-2xl bg-surface px-6 shadow-card ring-1 ring-black/[0.04]">
          <FormSection title="Confidence threshold" description="The AI only answers on its own when it's at least this confident.">
            <div className="max-w-xs"><Label htmlFor="sg-threshold" className="text-xs text-ink-muted">Threshold (%)</Label><Input id="sg-threshold" type="number" className="mt-1" defaultValue={75} /></div>
          </FormSection>
        </div>
      </Specimen>
    </div>
  )
}
