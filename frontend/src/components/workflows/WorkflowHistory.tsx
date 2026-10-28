import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { RunOutcome, Workflow, WorkflowRun } from '@/types'
import { workflowsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useIsPhone } from '@/hooks/useIsPhone'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PillTabs } from '@/components/dashboard/Panel'
import { StatusChip, type Tone } from '@/components/StatusChip'
import { STEP_LABEL, stepNumbers } from '@/lib/workflowGraph'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { stepSummary } from './stepMeta'

const OUTCOME: Record<RunOutcome, [string, Tone]> = { completed: ['Completed', 'success'], handed: ['Handed to a person', 'pending'], dropped: ['Dropped off', 'neutral'], failed: ['Failed', 'error'] }
const CARD = 'rounded-2xl bg-surface p-5 shadow-card ring-1 ring-black/[0.04] max-sm:px-4'
const CH = { chat: 'Chat', form: 'Contact form', email: 'Email' }
const dur = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
const Outcome = ({ o, testId }: { o: RunOutcome; testId?: string }) => <StatusChip label={OUTCOME[o][0]} tone={OUTCOME[o][1]} testId={testId} />

function RunDetail({ id, wf, onClose }: { id: string | null; wf: Workflow; onClose: () => void }) {
  const phone = useIsPhone()
  const { data } = useApi(() => (id ? workflowsApi.getRun(id) : Promise.resolve(null)), [id])
  const stepOf = (sid: string) => wf.steps.find((s) => s.id === sid)
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={cn('overflow-y-auto p-5', phone ? 'inset-0 h-full w-full max-w-none' : 'w-full sm:max-w-[440px]')} data-testid="run-detail">
        <SheetTitle className="text-base font-semibold text-ink">Run detail</SheetTitle>
        {!data ? <Skeleton className="mt-4 h-60 w-full" /> : (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted"><Outcome o={data.outcome} testId="run-detail-outcome" /><span data-testid="run-detail-outcome-text">{OUTCOME[data.outcome][0]}{data.note ? ` · ${data.note}` : ''}</span></div>
            <p className="text-sm text-ink-muted">{data.customer} · {CH[data.channel]} · v{data.version} · {timeAgo(data.at)} · {dur(data.durationSec)}</p>
            <ol className="space-y-3 border-l border-border pl-4" data-testid="run-timeline">
              {data.timeline.map((t, i) => (
                <li key={i} className="relative text-sm" data-testid={`run-event-${i}`}>
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-tobacco-500" aria-hidden />
                  <p className="font-medium text-ink">{t.label}</p>
                  <p className="text-ink-muted">{stepOf(t.stepId)?.type === 'message' ? stepSummary(stepOf(t.stepId)!) : t.detail}</p>
                </li>
              ))}
            </ol>
            {data.ticketId && <Button asChild variant="outline" data-testid="run-open-ticket"><Link to={`/inbox/${data.ticketId}`}><ExternalLink aria-hidden /> Open ticket {data.ticketId}</Link></Button>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// Runs tab (REQ-850..852): range, stats, funnel, runs table, run detail.
export function RunsTab({ wf }: { wf: Workflow }) {
  const [days, setDays] = useState<'7' | '30'>('7')
  const [filter, setFilter] = useState<RunOutcome | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const phone = useIsPhone()
  const { data } = useApi(() => workflowsApi.listRuns(wf.id, Number(days)), [wf.id, days])
  const stats = workflowsApi.runStats(wf.id, Number(days))
  const fun = workflowsApi.funnel(wf.id, Number(days))
  const drops = fun.map((f, i) => (i ? fun[i - 1].reached - f.reached : 0))
  const worst = drops.indexOf(Math.max(...drops, 1))
  const rows = (data ?? []).filter((r) => filter === 'all' || r.outcome === filter)
  const cells: [string, number, string][] = [['Runs', stats.runs, 'runs'], ['Completed', stats.completed, 'completed'], ['Handed to a person', stats.handed, 'handed'], ['Dropped off', stats.dropped, 'dropped'], ['Failed', stats.failed, 'failed']]
  return (
    <div className="space-y-6" data-testid="runs-tab">
      <div className="flex flex-wrap items-center gap-3">
        <PillTabs tabs={[{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }]} value={days} onChange={setDays} label="Range" testId="runs-range" />
        <p className="text-xs text-ink-muted">Live runs only. Test runs aren't recorded.</p>
      </div>
      <dl className={cn(CARD, 'grid grid-cols-2 gap-4 sm:grid-cols-5')} data-testid="runs-stats">
        {cells.map(([l, v, id]) => <div key={id}><dt className="text-xs text-ink-muted">{l}</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-ink" data-testid={`runs-stat-${id}`}>{v.toLocaleString()}</dd></div>)}
      </dl>
      <section className={CARD} data-testid="runs-funnel">
        <h3 className="text-[15px] font-semibold text-ink">Step funnel</h3>
        <ol className={cn('mt-4 gap-2', phone ? 'space-y-2' : 'grid grid-flow-col auto-cols-fr')}>
          {fun.map((f, i) => (
            <li key={f.stepId} className={cn('rounded-xl p-3 text-xs', i === worst ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-surface-muted')} data-testid={`funnel-step-${f.stepId}`} data-worst={i === worst || undefined}>
              <p className="truncate font-medium text-ink" title={f.label}>{i + 1}. {f.label}</p>
              <p className="mt-1 text-base font-semibold tabular-nums text-ink">{f.reached}</p>
              {i > 0 && <p className={i === worst ? 'font-medium text-amber-900' : 'text-ink-muted'}>−{drops[i]}{i === worst ? ' · biggest drop-off' : ''}</p>}
            </li>
          ))}
        </ol>
      </section>
      <section className="space-y-3">
        <PillTabs tabs={[{ id: 'all', label: 'All' }, { id: 'completed', label: 'Completed' }, { id: 'handed', label: 'Handed to a person' }, { id: 'dropped', label: 'Dropped off' }, { id: 'failed', label: 'Failed' }]} value={filter} onChange={setFilter} label="Outcome" testId="runs-filter" />
        <ul className={cn(phone ? 'space-y-2' : 'overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04] divide-y divide-border/70')} data-testid="runs-table">
          {!phone && <li className="grid grid-cols-[140px_minmax(0,1fr)_110px_170px_minmax(0,1fr)_80px_50px] gap-3 px-5 py-2.5 text-xs font-medium text-ink-muted" aria-hidden><span>Time</span><span>Customer</span><span>Channel</span><span>Outcome</span><span>Last step</span><span>Duration</span><span>Ver.</span></li>}
          {rows.slice(0, 50).map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(r.id)} className={cn('w-full text-left text-sm transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', phone ? 'space-y-1 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-black/[0.04]' : 'grid grid-cols-[140px_minmax(0,1fr)_110px_170px_minmax(0,1fr)_80px_50px] items-center gap-3 px-5 py-3')} data-testid={`run-row-${r.id}`}>
                <span className="text-ink-muted">{timeAgo(r.at)}</span>
                <span className="truncate text-ink">{r.customer}{r.ticketId && <span className="ml-1 text-xs text-ink-muted">· {r.ticketId}</span>}</span>
                <span className="text-ink-muted">{CH[r.channel]}</span>
                <span><Outcome o={r.outcome} /></span>
                <span className="truncate text-ink-muted">{(() => { const st = wf.steps.find((s) => s.id === r.lastStep); return st ? `${stepNumbers(wf).get(st.id)}. ${STEP_LABEL[st.type]}` : r.lastStep })()}</span>
                <span className="tabular-nums text-ink-muted">{dur(r.durationSec)}</span>
                <span className="text-ink-muted">v{r.version}</span>
              </button>
            </li>
          ))}
          {!rows.length && <li className="px-5 py-6 text-sm text-ink-muted" data-testid="runs-empty">No runs in this range.</li>}
        </ul>
        {rows.length > 50 && <p className="text-xs text-ink-muted">Showing the latest 50 of {rows.length}.</p>}
      </section>
      <RunDetail id={open} wf={wf} onClose={() => setOpen(null)} />
    </div>
  )
}

// Versions tab (REQ-849): list, read-only view, restore as draft.
export function VersionsTab({ wf, onRestored }: { wf: Workflow; onRestored: (w: Workflow) => void }) {
  const [view, setView] = useState<number | null>(null)
  const [restore, setRestore] = useState<number | null>(null)
  const v = wf.versions.find((x) => x.n === view)
  const live = wf.versions.length
  return (
    <div className="space-y-3" data-testid="versions-tab">
      {!wf.versions.length && <p className={cn(CARD, 'text-sm text-ink-muted')} data-testid="versions-empty">Not published yet. Publish to create v1.</p>}
      <ul className="space-y-2">
        {[...wf.versions].reverse().map((x) => (
          <li key={x.n} className={cn(CARD, 'flex flex-wrap items-center gap-x-4 gap-y-2')} data-testid={`version-${x.n}`}>
            <span className="text-sm font-semibold text-ink">v{x.n}</span>
            {x.n === live && <StatusChip label="Live" testId={`version-live-${x.n}`} />}
            <div className="min-w-0 flex-1 text-sm"><p className="text-ink" data-testid={`version-note-${x.n}`}>{x.note}</p><p className="text-xs text-ink-muted">{x.by} · {timeAgo(x.at)} · <span data-testid={`version-summary-${x.n}`}>{workflowsApi.changeSummary(wf, x.n)}</span></p></div>
            <Button size="sm" variant="outline" onClick={() => setView(x.n)} data-testid={`version-view-${x.n}`}>View</Button>
            {x.n !== live && <Button size="sm" variant="outline" onClick={() => setRestore(x.n)} data-testid={`version-restore-${x.n}`}>Restore as draft</Button>}
          </li>
        ))}
      </ul>
      <Sheet open={!!v} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="w-full overflow-y-auto p-5 sm:max-w-[480px]" data-testid="version-view">
          <SheetTitle className="text-base font-semibold text-ink">v{v?.n} · read-only</SheetTitle>
          <ol className="mt-4 space-y-2">{v && [...v.snap.steps].sort((a, b) => (stepNumbers(v.snap).get(a.id) ?? 0) - (stepNumbers(v.snap).get(b.id) ?? 0)).map((s) => <li key={s.id} className="rounded-xl bg-surface-muted p-3 text-sm"><p className="font-medium text-ink">{stepNumbers(v.snap).get(s.id)}. {STEP_LABEL[s.type]}</p><p className="text-ink-muted">{stepSummary(s, workflowsApi.workflowName)}</p></li>)}</ol>
        </SheetContent>
      </Sheet>
      <AlertDialog open={restore !== null} onOpenChange={(o) => !o && setRestore(null)}>
        <AlertDialogContent data-testid="restore-dialog">
          <AlertDialogTitle>Restore v{restore} as a draft?</AlertDialogTitle>
          <AlertDialogDescription>Your current draft is replaced by v{restore}. Live chats keep running v{live} until you publish.</AlertDialogDescription>
          <AlertDialogFooter><AlertDialogCancel data-testid="restore-cancel">Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { const w = await workflowsApi.restoreVersion(wf.id, restore!, wf.editedBy); onRestored(w); toast.success(`v${restore} restored as a draft`); setRestore(null) }} data-testid="restore-confirm">Restore</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
