import { Num } from '@/components/Num'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Plus, Search } from 'lucide-react'
import type { AuthorType, TicketStatus } from '@/types'
import { directoryApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { palette, fonts } from '@/theme/tokens'
import { AuthorBadge } from '@/components/AuthorBadge'
import { StatusPill } from '@/components/StatusPill'
import { KpiCard } from '@/components/KpiCard'
import { ScoreChip } from '@/components/ScoreChip'
import { EmptyState, ErrorState } from '@/components/States'
import { Wordmark } from '@/components/Wordmark'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/overlay'
import { Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/skeleton'
import { timeAgo } from '@/lib/format'
import { SgIndex, SgSection as Section } from '@/components/styleguide/SgSection'
import { Phase9Samples } from '@/components/styleguide/Phase9Samples'
import { Phase10Samples } from '@/components/styleguide/Phase10Samples'
import { Phase11Samples } from '@/components/styleguide/Phase11Samples'
import { Phase14Samples } from '@/components/styleguide/Phase14Samples'
import { Phase15Samples } from '@/components/styleguide/Phase15Samples'
import { InboxSamples } from '@/components/styleguide/InboxSamples'
import { WidgetSamples } from '@/components/styleguide/WidgetSamples'
import { DashboardSamples, NavSamples, PhoneSamples, SegmentedSample, SettingsSamples } from '@/components/styleguide/AppPatterns'

const AUTHORS: AuthorType[] = ['customer', 'claude', 'grokbot', 'agent', 'system']
const STATUSES: TicketStatus[] = ['open', 'ai_handling', 'grok_handling', 'needs_human', 'resolved', 'closed']

const SWATCHES: { name: string; hex: string; token: string; dark?: boolean }[] = [
  { name: 'Background', hex: palette.background, token: 'background' },
  { name: 'Surface', hex: palette.surface.DEFAULT, token: 'surface' },
  { name: 'Ink', hex: palette.ink.DEFAULT, token: 'ink', dark: true },
  { name: 'Ink muted', hex: palette.ink.muted, token: 'ink-muted', dark: true },
  { name: 'Tobacco (primary)', hex: palette.tobacco[600], token: 'tobacco-600', dark: true },
  { name: 'Brass (accent)', hex: palette.brass[500], token: 'brass-500' },
  { name: 'Border', hex: palette.border.DEFAULT, token: 'border' },
  { name: 'Focus ring', hex: palette.ring, token: 'ring', dark: true },
  { name: 'Green', hex: palette.green[600], token: 'green-600', dark: true },
  { name: 'Amber', hex: palette.amber[400], token: 'amber-400' },
  { name: 'Red', hex: palette.red[600], token: 'red-600', dark: true },
  { name: 'Slate', hex: palette.slate[500], token: 'slate-500', dark: true },
]

function UsersTable() {
  const { data, loading, error, reload } = useApi(() => directoryApi.listUsers(), [])
  if (loading) return <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
  if (error) return <ErrorState compact onRetry={reload} testId="styleguide-table-error" />
  if (!data?.length) return <EmptyState compact title="No teammates yet" description="Invite someone to get started." testId="styleguide-table-empty" />
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last login</TableHead></TableRow></TableHeader>
      <TableBody>
        {data.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium">{u.name}</TableCell>
            <TableCell className="text-ink-muted">{u.email}</TableCell>
            <TableCell className="capitalize">{u.role}</TableCell>
            <TableCell className="capitalize">{u.status}</TableCell>
            <TableCell className="text-ink-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function StyleguidePage() {
  return (
    <div className="min-h-screen bg-background" data-testid="styleguide-page">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="flex h-16 w-full items-center gap-4 px-4 md:px-8 2xl:px-12">
          <Wordmark />
          <span className="hidden text-sm text-ink-muted sm:inline">Styleguide · current design</span>
          <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'ml-auto' })}>Open the desk</Link>
        </div>
      </header>
      <main className="grid w-full gap-10 px-4 pb-24 pt-10 md:px-8 2xl:px-12 lg:grid-cols-[160px_minmax(0,1fr)]">
        <SgIndex />
        <div className="min-w-0 space-y-14">
          <div>
            <h1 className="font-display text-[32px] text-ink md:text-[40px]" data-testid="page-title">Styleguide</h1>
            <p className="mt-3 max-w-2xl text-sm text-ink-muted md:text-base">The shared foundations of the Goorin support desk. Every token here lives in <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">src/theme/tokens.ts</code> and feeds the Tailwind config. Product pieces below are the real components rendered with sample data, so this page always matches the app.</p>
          </div>

          <Section id="colors" title="Colors">
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {SWATCHES.map((s) => (
                <li key={s.token} className="overflow-hidden rounded-lg border border-border bg-surface" data-testid={`swatch-${s.token}`}>
                  <div className="h-20 border-b border-border" style={{ background: s.hex }} />
                  <div className="p-3">
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    <p className="font-mono text-xs text-ink-muted">{s.hex.toUpperCase()} · {s.token}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="type" title="Type scale">
            <Card className="divide-y divide-border">
              {[
                ['Page title · Inter Display (Inter Variable, opsz auto) 600 · 28px desktop / 24px phone · -0.025em · lh 1.15 (Title font picker in demo controls)', <p key="a" className="title-page font-display">Dashboard</p>],
                ['Page subtitle · Inter 400 · 15px muted', <p key="s" className="text-[15px] text-ink-muted">How the desk is doing, Sep 26 – Oct 25, 2026.</p>],
                ['KPI number · Inter 600 tabular lining · 28px, units 62% muted', <p key="b" className="text-[28px] leading-8"><Num value="6h 4m" /> <span className="text-ink-subtle">·</span> <Num value="77.8%" /> <span className="text-ink-subtle">·</span> <Num value="5.7 min" /></p>],
                ['Panel title · Inter 600 · 15px', <p key="p" className="text-[15px] font-semibold">Fraud alerts</p>],
                ['Label · Inter 500 · 13px muted', <p key="l" className="text-[13px] font-medium text-ink-muted">Total refunded</p>],
                ['Section heading · Inter 600 · 16–18px', <p key="c" className="text-base font-semibold md:text-lg">Customer satisfaction</p>],
                ['Card title · Inter 600 · 14px', <p key="d" className="text-sm font-semibold">Volume by channel</p>],
                ['Body · Inter 400 · 14–16px', <p key="e" className="text-sm md:text-base">My Hampton fedora arrived with the crown crushed.</p>],
                ['Small · Inter 500 · 12px', <p key="f" className="text-xs font-medium text-ink-muted">Updated 5 minutes ago</p>],
              ].map(([label, node]) => (
                <div key={label as string} className="grid gap-2 p-5 md:grid-cols-[240px_1fr] md:items-center">
                  <p className="text-xs text-ink-muted">{label}</p>
                  {node}
                </div>
              ))}
            </Card>
            <p className="text-xs text-ink-muted">Families: titles Inter Display (switchable in the demo Title font picker: Geist, Manrope, Plus Jakarta Sans), body Inter Variable. There's no serif in the app; only the storefront mock uses a Georgia store theme for the font-inheritance demo.</p>
          </Section>

          <Section id="buttons" title="Buttons">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm"><Plus aria-hidden /> Small</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" variant="outline" aria-label="Search"><Search aria-hidden /></Button>
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Section>

          <Section id="inputs" title="Inputs">
            <Card className="grid gap-6 p-6 md:grid-cols-2">
              <div><Label htmlFor="sg-email">Email</Label><Input id="sg-email" className="mt-1.5" placeholder="you@goorin.com" /></div>
              <div><Label htmlFor="sg-err">With error</Label><Input id="sg-err" className="mt-1.5" defaultValue="ava@" aria-invalid /><FieldError>Enter a valid email address.</FieldError></div>
              <div>
                <Label htmlFor="sg-select">Select</Label>
                <Select defaultValue="hours"><SelectTrigger id="sg-select" className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minutes">Minutes</SelectItem><SelectItem value="hours">Hours</SelectItem></SelectContent></Select>
              </div>
              <label className="flex items-center gap-3 self-end text-sm text-ink"><Switch defaultChecked aria-label="Email surveys" /> Email surveys</label>
              <div className="md:col-span-2"><Label htmlFor="sg-text">Textarea</Label><Textarea id="sg-text" className="mt-1.5" placeholder="Write a reply…" /></div>
            </Card>
          </Section>

          <Section id="badges" title="Author badges">
            <div className="flex flex-wrap gap-3">{AUTHORS.map((a) => <AuthorBadge key={a} type={a} />)}</div>
          </Section>

          <Section id="pills" title="Status pills">
            <div className="flex flex-wrap gap-3">{STATUSES.map((s) => <StatusPill key={s} status={s} />)}</div>
            <p className="text-xs text-ink-muted">22px, 12px medium, 6px dot on a light tint, no border or icon. needs_human stands out by colour (#FEF3C7 / #92400E, 7.1:1), not size. All pairs pass WCAG AA.</p>
          </Section>

          <Section id="cards" title="Cards">
            <div className="grid gap-4 md:grid-cols-3">
              <KpiCard comparisonLabel="vs prior 30 days" metric={{ key: 'sg-frt', label: 'First response time', value: 4.6, previous: 5.4, format: 'duration', betterWhen: 'lower', hint: 'Lower is better, shown in green' }} />
              <KpiCard comparisonLabel="vs prior 30 days" metric={{ key: 'sg-csat', label: 'CSAT average', value: 4.41, previous: 4.52, format: 'score', betterWhen: 'higher', hint: 'A drop is shown in red' }} />
              <Card>
                <CardHeader><div><CardTitle>Content card</CardTitle><CardDescription>Title, description, body</CardDescription></div><Mail className="h-4 w-4 text-ink-muted" aria-hidden /></CardHeader>
                <CardContent className="flex items-center gap-3"><ScoreChip score={5} /><ScoreChip score={3} /><ScoreChip score={1} /></CardContent>
              </Card>
            </div>
          </Section>

          <Section id="tables" title="Tables">
            <Card className="overflow-hidden"><UsersTable /></Card>
            <p className="text-xs text-ink-muted">This table is fetched through the API layer, so the demo state switcher changes it.</p>
          </Section>

          <Section id="states" title="Empty, loading and error states">
            <div className="grid gap-4 md:grid-cols-3">
              <Card><EmptyState compact title="No data for this period" description="Try a wider date range." testId="sg-empty" /></Card>
              <Card className="space-y-3 p-6"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-40" /><Skeleton className="h-24 w-full" /></Card>
              <Card><ErrorState compact onRetry={() => undefined} testId="sg-error" /></Card>
            </div>
          </Section>

          <Section id="inbox" title="Inbox pieces" description="AI drafts, the escalation chip, internal notes and the composer."><InboxSamples /></Section>
          <Section id="widget" title="Chat widget" description="Rendered through the real SupportWidget inside its Shadow DOM (contained mode, forced states), using the current widget settings."><WidgetSamples /></Section>
          <Section id="dashboard" title="Dashboard pieces"><DashboardSamples /></Section>
          <Section id="navigation" title="Sidebar nav item states"><NavSamples /></Section>
          <Section id="phase9" title="Workspace patterns" description="Page tabs, sub-tabs, save state, integration status, delivery status and the AI replied banner."><Phase9Samples /></Section>
          <Section id="phase10" title="Modern Inbox" description="Views panel, Ask Goorin AI pill, handover summary and message cards."><Phase10Samples /></Section>
          <Section id="phase11" title="AI-first Inbox" description="Neutral view rows, Needs you card, Why you're here brief and the draft-first composer."><Phase11Samples /></Section>
          <Section id="phase14" title="Chat widget (Phase 14)" description="Frosted home view, starter chips, pill input and thumbs, rendered inside the widget's Shadow DOM."><Phase14Samples /></Section>
          <Section id="phase15" title="AI & Workflows (Phase 15)" description="Section card, hairline stats strip, Use/Avoid chips, test insight chips and muted step category tiles."><Phase15Samples /></Section>
          <Section id="controls" title="Segmented control"><SegmentedSample /></Section>
          <Section id="settings" title="Settings patterns"><SettingsSamples /></Section>
          <Section id="phone" title="Phone patterns" description="Below 640px the sidebar becomes a bottom tab bar and modals, drawers and menus become bottom or full-screen sheets."><PhoneSamples /></Section>
        </div>
      </main>
    </div>
  )
}
