import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Mail, MessageCircle, MoreHorizontal, NotebookPen, Plus, Search, Workflow as WorkflowIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Workflow, WorkflowChannel } from '@/types'
import { workflowsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/components/auth/AuthContext'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/overlay'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EmptyState, ErrorState } from '@/components/States'
import { StatStrip } from '@/components/ai/AiCard'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/StatusChip'

const CH_ICON: Record<WorkflowChannel, [typeof Mail, string]> = { chat: [MessageCircle, 'Chat'], form: [NotebookPen, 'Contact form'], email: [Mail, 'Email'] }
const STATUS: Record<Workflow['status'], [string, string]> = { active: ['Active', 'bg-green-50 text-green-800 ring-green-200'], off: ['Off', 'bg-surface-muted text-ink-muted ring-border'], draft: ['Draft', 'bg-amber-50 text-amber-900 ring-amber-200'] }
const COLS = 'md:grid-cols-[minmax(0,1fr)_88px_72px_150px_190px_44px]'

function NewButton({ onCreate }: { onCreate: () => void }) {
  return <Button size="sm" onClick={onCreate} data-testid="workflow-new"><Plus aria-hidden /> New workflow</Button>
}

// Workflows list (REQ-816, REQ-817; templates removed by user change): hairline stats, table-like rows, search over 5.
export function WorkflowsTab() {
  const { data, loading, error, reload } = useApi(() => workflowsApi.listWorkflows(), [])
  const { user } = useAuth()
  const nav = useNavigate()
  const [list, setList] = useState<Workflow[] | null>(null)
  const [q, setQ] = useState('')
  const all = list ?? data ?? []
  const rows = q.trim() ? all.filter((w) => `${w.name} ${w.trigger.intent} ${w.trigger.phrases.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())) : all
  const refresh = async () => setList(await workflowsApi.listWorkflows())
  const create = async () => { const wf = await workflowsApi.createWorkflow(user!.name); toast.success('Draft workflow created'); nav(`/ai/workflows/${wf.id}`) }
  const toggle = async (wf: Workflow, on: boolean) => {
    try { await workflowsApi.setStatus(wf.id, on ? 'active' : 'off', user!.name); await refresh(); toast.success(`${wf.name} is ${on ? 'on' : 'off'}`) } catch (e) { toast.error((e as Error).message) }
  }
  const move = async (i: number, d: -1 | 1) => { const ids = all.map((r) => r.id); [ids[i], ids[i + d]] = [ids[i + d], ids[i]]; setList(await workflowsApi.reorderWorkflows(ids)) }
  const active = all.filter((w) => w.status === 'active')
  const dupes = active.filter((w, i) => active.some((o, j) => j !== i && o.trigger.intent.toLowerCase() === w.trigger.intent.toLowerCase() && o.trigger.channels.some((c) => w.trigger.channels.includes(c))))
  const runs = all.reduce((s, w) => s + w.runs7d, 0)
  const withPct = all.filter((w) => w.completedPct !== null && w.runs7d)
  const completed = withPct.length ? Math.round(withPct.reduce((s, w) => s + w.completedPct! * w.runs7d, 0) / withPct.reduce((s, w) => s + w.runs7d, 0)) : null
  const handed = completed === null ? null : 100 - completed
  const [renaming, setRenaming] = useState<Workflow | null>(null)
  const [newName, setNewName] = useState('')
  const [deleting, setDeleting] = useState<Workflow | null>(null)

  if (loading && !list) return <Skeleton className="h-[420px] w-full rounded-2xl" />
  if (error && !list) return <ErrorState title="Workflows didn't load" onRetry={reload} testId="workflows-error" />

  return (
    <div className="space-y-6" data-testid="workflows-list">
      <StatStrip label="Workflow stats" testId="workflows-stats" cells={[
        { label: 'Active', value: `${active.length} of ${all.length}`, trend: `${all.filter((w) => workflowsApi.hasDraft(w)).length} with draft changes`, testId: 'workflows-stat-active' },
        { label: 'Runs, last 7 days', value: runs.toLocaleString(), trend: '+8% vs prior 7 days', testId: 'workflows-stat-runs' },
        { label: 'Completed without a person', value: completed === null ? '—' : `${completed}%`, trend: 'Target 80%', testId: 'workflows-stat-completed' },
        { label: 'Handed to a person', value: handed === null ? '—' : `${handed}%`, trend: '−3 pts vs prior 7 days', testId: 'workflows-stat-handed' },
      ]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">Workflows <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-muted" data-testid="workflows-count">{all.length}</span></h2>
        <div className="flex items-center gap-2">
          {all.length > 5 && <label className="relative"><span className="sr-only">Search workflows</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden /><Input className="h-9 w-64 pl-9 max-sm:w-44" placeholder="Search name or trigger" value={q} onChange={(e) => setQ(e.target.value)} data-testid="workflows-search" /></label>}
          <NewButton onCreate={() => create()} />
        </div>
      </div>
      {dupes.length > 0 && <p role="alert" className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900 ring-1 ring-amber-200" data-testid="workflows-duplicate-warning"><AlertTriangle className="h-4 w-4" aria-hidden />Two active workflows use this trigger. The first one in the list runs.<span className="sr-only"> ({dupes.map((d) => d.name).join(' and ')})</span></p>}
      {all.length === 0 ? (
        <div className="rounded-2xl bg-surface p-6 shadow-card"><EmptyState title="No workflows yet" description="Workflows are process automations the AI runs, like order tracking with an email code." icon={<WorkflowIcon className="h-6 w-6" aria-hidden />} testId="workflows-empty" action={<NewButton onCreate={() => create()} />} /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04]" role="table" aria-label="Workflows">
          <div role="row" className={cn('hidden gap-4 border-b border-border/70 px-6 py-2.5 text-xs font-medium text-ink-muted md:grid', COLS)}>
            <span role="columnheader">Workflow</span><span role="columnheader">Channels</span><span role="columnheader">Runs (7d)</span><span role="columnheader">Completion</span><span role="columnheader">Status</span><span role="columnheader" className="sr-only">Actions</span>
          </div>
          <ul role="rowgroup" className="divide-y divide-border/70" data-testid="workflows-rows">
            {rows.length === 0 && <li role="row" className="px-6 py-6 text-sm text-ink-muted" data-testid="workflows-no-match"><span role="cell">No workflows match “{q}”.</span></li>}
            {rows.map((w) => {
              const i = all.indexOf(w)
              const setupN = workflowsApi.setupIssues(w).length
              const lock = !w.published ? 'Publish this workflow before turning it on.' : setupN ? `Fix ${setupN} issue${setupN === 1 ? '' : 's'} before turning this on.` : null
              return (
                <li key={w.id} role="row" className={cn('grid items-center gap-x-4 gap-y-2 px-6 py-4 transition-colors hover:bg-surface-sunken max-sm:px-4', COLS)} data-testid={`workflow-row-${w.id}`}>
                  <button type="button" role="cell" onClick={() => nav(`/ai/workflows/${w.id}`)} className="min-w-0 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`workflow-open-${w.id}`}>
                    <span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold text-ink">{w.name}</span>{w.published && <span className="text-xs font-medium text-ink-muted" data-testid={`workflow-version-${w.id}`}>v{w.versions.length}</span>}{w.published && workflowsApi.hasDraft(w) && <StatusChip label="Draft changes" tone="attention" testId={`workflow-draft-${w.id}`} />}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-ink-muted">When a customer asks “{w.trigger.intent || 'no intent'}” · Edited {timeAgo(w.editedAt)} by {w.editedBy}</span>
                  </button>
                  <span role="cell" className="flex items-center gap-1.5 text-ink-muted" aria-label={`Channels: ${w.trigger.channels.map((c) => CH_ICON[c][1]).join(', ')}`}>{w.trigger.channels.map((c) => { const [I, l] = CH_ICON[c]; return <span key={c} title={l} className="inline-flex"><I className="h-4 w-4" aria-hidden /></span> })}</span>
                  <span role="cell" className="text-sm tabular-nums text-ink" data-testid={`workflow-runs-${w.id}`}>{w.runs7d.toLocaleString()}<span className="sr-only"> runs · {w.completedPct === null ? '—' : `${w.completedPct}% completed`}</span></span>
                  <span role="cell" className="flex items-center gap-2" title={w.completedPct === null ? 'No runs yet' : `${w.completedPct}% finished without a person`} data-testid={`workflow-completion-${w.id}`}>
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted"><span className="block h-full rounded-full bg-green-600" style={{ width: `${w.completedPct ?? 0}%` }} /></span>
                    <span className="text-xs tabular-nums text-ink-muted">{w.completedPct === null ? '—' : `${w.completedPct}%`}</span>
                  </span>
                  <span role="cell" className="flex flex-wrap items-center gap-2" title={lock ?? undefined} data-testid={`workflow-status-cell-${w.id}`}><Switch checked={w.status === 'active'} disabled={!!lock && w.status !== 'active'} onCheckedChange={(on) => toggle(w, on)} aria-label={`${w.name} on`} aria-description={lock ?? undefined} data-testid={`workflow-toggle-${w.id}`} /><span className="text-xs font-medium text-ink-muted" data-testid={`workflow-status-${w.id}`}>{w.status === 'active' ? 'On' : 'Off'}</span>{setupN > 0 && w.status !== 'active' && <span title={workflowsApi.setupIssues(w).map((x) => x.text).join('\n')} data-testid={`workflow-setup-${w.id}`}><StatusChip label="Needs setup" tone="attention" /></span>}</span>
                  <span role="cell" className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'max-sm:h-11 max-sm:w-11')} aria-label={`${w.name} actions`} data-testid={`workflow-menu-${w.id}`}><MoreHorizontal aria-hidden /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => nav(`/ai/workflows/${w.id}`)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => nav(`/ai/workflows/${w.id}?test=1`)} data-testid={`workflow-test-${w.id}`}>Test</DropdownMenuItem>
                      <DropdownMenuItem onSelect={async () => { await workflowsApi.duplicateWorkflow(w.id, user!.name); await refresh(); toast.success('Workflow duplicated') }} data-testid={`workflow-duplicate-${w.id}`}>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setNewName(w.name); setRenaming(w) }} data-testid={`workflow-rename-${w.id}`}>Rename</DropdownMenuItem>
                      <DropdownMenuItem disabled={i === 0} onSelect={() => move(i, -1)}>Move up</DropdownMenuItem>
                      <DropdownMenuItem disabled={i === all.length - 1} onSelect={() => move(i, 1)}>Move down</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-700" onSelect={() => setDeleting(w)} data-testid={`workflow-delete-${w.id}`}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent data-testid="rename-dialog">
          <DialogTitle className="text-base font-semibold text-ink">Rename workflow</DialogTitle>
          <form className="mt-4 space-y-4" onSubmit={async (e) => { e.preventDefault(); if (!renaming || !newName.trim()) return; await workflowsApi.renameWorkflow(renaming.id, newName.trim(), user!.name); setRenaming(null); await refresh(); toast.success('Workflow renamed') }}>
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="Workflow name" data-testid="rename-input" />
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setRenaming(null)} data-testid="rename-cancel">Cancel</Button><Button type="submit" disabled={!newName.trim()} data-testid="rename-save">Rename</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
          <AlertDialogDescription>The workflow and its settings are removed. This can't be undone.</AlertDialogDescription>
          <AlertDialogFooter><AlertDialogCancel data-testid="delete-cancel">Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { if (!deleting) return; await workflowsApi.deleteWorkflow(deleting.id); setDeleting(null); await refresh(); toast.success('Workflow deleted') }} data-testid="delete-confirm">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
