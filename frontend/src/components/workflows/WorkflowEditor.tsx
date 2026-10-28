import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, FlaskConical, PenLine, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import type { StepType, Workflow } from '@/types'
import { workflowsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { useAuth } from '@/components/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { StatusChip } from '@/components/StatusChip'
import { RunsTab, VersionsTab } from './WorkflowHistory'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/overlay'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ErrorState } from '@/components/States'
import { SaveBar } from '@/components/settings/SaveBar'
import { PillTabs } from '@/components/dashboard/Panel'
import { duplicateStep, insertAfter, removeStep, swapSteps, tidy, validate } from '@/lib/workflowGraph'
import { StepList } from './StepList'
import { StepSettings, TriggerSettings } from './StepSettings'
import { TestPanel } from './TestPanel'

const StepCanvas = lazy(() => import('./StepCanvas'))
const VIEW_KEY = 'goorin.workflowView'
const useWide = (min = 1024) => { const [w, setW] = useState(() => window.innerWidth >= min); useEffect(() => { const f = () => setW(window.innerWidth >= min); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [min]); return w }

// Workflow editor (REQ-730..745): one model, List and Canvas views, step settings, issues, test panel.
export function WorkflowEditor({ id }: { id: string }) {
  const { data, loading, error, reload } = useApi(() => workflowsApi.getWorkflow(id), [id])
  const { user } = useAuth()
  const nav = useNavigate()
  const wide = useWide()
  const xl = useWide(1280)
  const [saved, setSaved] = useState<Workflow | null>(null)
  const [wf, setWf] = useState<Workflow | null>(null)
  const [view, setView] = useState<'list' | 'canvas'>(() => (sessionStorage.getItem(VIEW_KEY) as 'list' | 'canvas') ?? 'list')
  const [selected, setSelected] = useState<string | null>(null)
  const [params] = useSearchParams()
  const [testing, setTesting] = useState(params.get('test') === '1')
  const [current, setCurrent] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'build' | 'runs' | 'versions'>(() => (params.get('tab') as 'runs' | 'versions') ?? 'build')
  useEffect(() => { const q = params.get('tab'); if (q === 'runs' || q === 'versions' || q === 'build') setTab(q) }, [params])
  const [publishing, setPublishing] = useState(false)
  const [note, setNote] = useState('')
  const [showStats, setShowStats] = useState(false)
  useEffect(() => { if (data) { setSaved(data); setWf(data) } }, [data])
  const dirty = !!wf && JSON.stringify(wf) !== JSON.stringify(saved)
  const { confirmLeave } = useUnsavedGuard('workflow-editor', dirty)
  const issues = useMemo(() => (wf ? validate(wf) : []), [wf])
  const issueIds = useMemo(() => new Set(issues.map((i) => i.stepId).filter((x): x is string => !!x)), [issues])
  const mode = wide ? view : 'list'

  if (loading) return <Skeleton className="h-[560px] w-full rounded-2xl" />
  if (error || data === null || !wf) return <ErrorState title={data === null ? "This workflow doesn't exist" : "The workflow didn't load"} onRetry={reload} testId="workflow-error" />

  const patch = (p: Partial<Workflow>) => setWf({ ...wf, ...p })
  const setView2 = (v: 'list' | 'canvas') => { setView(v); sessionStorage.setItem(VIEW_KEY, v) }
  const insert = (src: string, h: string, t: StepType) => { const r = insertAfter(wf, src, h, t); setWf(view === 'canvas' ? tidy(r.wf) : r.wf); setSelected(r.id) }
  const save = async () => {
    setSaving(true)
    try { const s = await workflowsApi.saveWorkflow(wf, user!.name); setSaved(s); setWf(s); toast.success('Draft saved') } catch (e) { toast.error((e as Error).message) }
    setSaving(false)
  }
  const draft = workflowsApi.hasDraft(wf)
  const live = workflowsApi.liveVersion(wf)
  const setupN = workflowsApi.setupIssues(wf).length
  const lock = !wf.published ? 'Publish this workflow before turning it on.' : setupN && wf.status !== 'active' ? `Fix ${setupN} issue${setupN === 1 ? '' : 's'} before turning this on.` : null
  const startPublish = () => { if (issues.length) return toast.error(`Fix ${issues.length} issue${issues.length === 1 ? '' : 's'} before publishing.`, { id: 'publish-blocked' }); setNote(''); setPublishing(true) }
  const publish = async () => {
    setSaving(true)
    try { const s = await workflowsApi.publishWorkflow(wf, note, user!.name); setSaved(s); setWf(s); setPublishing(false); toast.success(`Published v${s.versions.length}`) } catch (e) { toast.error((e as Error).message) }
    setSaving(false)
  }
  const discardDraft = async () => { const s = await workflowsApi.discardDraft(wf.id); setSaved(s); setWf(s); toast.success(`Draft discarded. Back to v${live}.`) }
  const toggle = async (on: boolean) => {
    if (lock && on) return toast.error(lock)
    try { const s = await workflowsApi.setStatus(wf.id, on ? 'active' : 'off', user!.name); setSaved({ ...saved!, status: s.status }); setWf({ ...wf, status: s.status }); toast.success(on ? 'Workflow is on' : 'Workflow is off') } catch (e) { toast.error((e as Error).message) }
  }
  const stats = showStats ? Object.fromEntries(workflowsApi.funnel(wf.id, 7).map((f) => [f.stepId, f.reached])) : undefined
  const step = wf.steps.find((s) => s.id === selected)
  const settings = selected === 'trigger' ? <><h3 className="mb-4 text-[15px] font-semibold text-ink">Trigger</h3><TriggerSettings t={wf.trigger} set={(trigger) => patch({ trigger })} /></> : step ? (
    <StepSettings wf={wf} step={step} onChange={(config) => patch({ steps: wf.steps.map((s) => (s.id === step.id ? { ...s, config } : s)) })} onClose={() => setSelected(null)} onDelete={() => { setWf(removeStep(wf, step.id)); setSelected(null) }} />
  ) : null

  return (
    <div className="pb-24" data-testid="workflow-editor">
      <div className="mb-4 flex flex-wrap items-center gap-3" data-testid="editor-header">
        <Button variant="ghost" size="icon-sm" aria-label="Back to workflows" onClick={() => confirmLeave(() => nav('/ai/workflows'))} data-testid="editor-back"><ArrowLeft aria-hidden /></Button>
        <label className="group relative flex min-w-0 items-center">
          <span className="sr-only">Workflow name</span>
          <Input className="h-9 w-[clamp(180px,28vw,360px)] border-transparent bg-transparent px-2 text-lg font-semibold tracking-tight text-ink shadow-none hover:border-border focus:border-border focus:bg-surface" value={wf.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Workflow name" data-testid="editor-name" />
          <PenLine className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </label>
        <StatusChip label={!wf.published ? 'Not published' : draft || dirty ? 'Draft changes' : `Published v${live}`} tone={!wf.published || draft || dirty ? 'attention' : 'success'} testId="editor-version" />
        <span className="inline-flex items-center gap-2" title={lock ?? undefined} data-testid="editor-status-wrap"><Switch checked={wf.status === 'active'} disabled={!!lock && wf.status !== 'active'} onCheckedChange={toggle} aria-label="Workflow on" aria-description={lock ?? undefined} data-testid="editor-status-toggle" /><span className="text-xs font-medium text-ink-muted" data-testid="editor-status-pill">{wf.status === 'active' ? 'On' : 'Off'}</span></span>
        {lock && wf.status !== 'active' && <span className="text-xs text-ink-muted" data-testid="editor-status-lock">{lock}</span>}
        {issues.length > 0 && (
          <details className="relative" data-testid="editor-issues">
            <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-full bg-amber-50 px-3 text-xs font-semibold text-amber-900 ring-1 ring-amber-200 [&::-webkit-details-marker]:hidden max-sm:min-h-11"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />{issues.length} issue{issues.length === 1 ? '' : 's'}<span className="sr-only"> to fix before turning this on</span></summary>
            <ul className="absolute left-0 top-full z-30 mt-2 w-[min(360px,90vw)] space-y-1 rounded-xl bg-surface p-3 text-sm text-ink shadow-popover ring-1 ring-black/5">{issues.map((i, n) => <li key={n}><button type="button" className="w-full rounded-md px-2 py-1.5 text-left hover:bg-surface-muted" onClick={() => setSelected(i.stepId ?? 'trigger')} data-testid={`editor-issue-${n}`}>{i.text}</button></li>)}</ul>
          </details>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2 max-sm:ml-0 max-sm:w-full">
          {wide ? <PillTabs tabs={[{ id: 'list', label: 'List' }, { id: 'canvas', label: 'Canvas' }]} value={view} onChange={setView2} label="Editor view" testId="editor-view" /> : <p className="text-xs text-ink-muted" data-testid="editor-canvas-note">Canvas editing works on larger screens.</p>}
          <Button size="sm" variant={testing ? 'secondary' : 'outline'} onClick={() => setTesting((t) => !t)} data-testid="editor-test"><FlaskConical aria-hidden /> Test workflow</Button>
          {draft && wf.published && !dirty && <Button size="sm" variant="ghost" onClick={discardDraft} data-testid="editor-discard-draft">Discard draft</Button>}
          {!dirty && <Button size="sm" onClick={startPublish} disabled={!draft} data-testid="editor-publish"><Rocket aria-hidden /> Publish</Button>}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <PillTabs tabs={[{ id: 'build', label: 'Build' }, { id: 'runs', label: 'Runs' }, { id: 'versions', label: 'Versions' }]} value={tab} onChange={setTab} label="Workflow sections" testId="editor-tabs" />
        {tab === 'build' && wf.published && <label className="ml-auto flex min-h-11 items-center gap-2 text-sm text-ink"><Switch checked={showStats} onCheckedChange={setShowStats} data-testid="editor-run-stats" aria-label="Show run stats" /> Show run stats</label>}
      </div>
      {tab === 'runs' && <RunsTab wf={wf} />}
      {tab === 'versions' && <VersionsTab wf={wf} onRestored={(w) => { setSaved(w); setWf(w); setTab('build') }} />}
      {tab === 'build' && <>
      <div className="flex min-h-[600px] overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04]">
        <div className={cn2('min-w-0 flex-1', mode === 'list' && 'overflow-auto p-6 max-sm:p-3')} style={mode === 'list' ? { backgroundColor: '#FAF8F5', backgroundImage: 'radial-gradient(rgba(31,29,26,0.09) 1px, transparent 1px)', backgroundSize: '16px 16px' } : undefined} data-testid={`editor-${mode}`}>
          {mode === 'list' ? (
            <StepList stats={stats} wf={wf} selected={selected} current={current} issueIds={issueIds} onSelect={setSelected} onInsert={insert} onRemove={(sid) => { setWf(removeStep(wf, sid)); setSelected(null) }} onDuplicate={(sid) => setWf(duplicateStep(wf, sid))} onSwap={(a, b) => setWf(swapSteps(wf, a, b))} />
          ) : (
            <Suspense fallback={<Skeleton className="h-full min-h-[560px] w-full" />}>
              <StepCanvas wf={wf} onInsert={insert} onChange={(w) => setWf({ ...wf, ...w })} selected={selected} current={current} issueIds={issueIds} onSelect={setSelected} />
            </Suspense>
          )}
        </div>
        {settings && xl && <aside className="sticky top-0 max-h-[calc(100vh-120px)] w-80 shrink-0 self-start overflow-y-auto border-l border-border p-4" aria-label="Step settings" data-testid="settings-panel">{settings}</aside>}
        {testing && wide && <div className="w-[380px] shrink-0"><TestPanel wf={wf} label={draft || dirty ? 'Testing draft' : `Testing v${live}`} onCurrent={setCurrent} onClose={() => { setTesting(false); setCurrent(null) }} /></div>}
      </div>
      </>}
      {wide && !xl && (
        <Sheet open={!!settings} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent className="w-full overflow-y-auto p-4 sm:max-w-[400px]" data-testid="settings-sheet"><SheetTitle className="sr-only">Step settings</SheetTitle>{settings}</SheetContent>
        </Sheet>
      )}
      {!wide && (
        <>
          <Sheet open={!!settings} onOpenChange={(o) => !o && setSelected(null)}>
            <SheetContent className="inset-x-0 bottom-0 top-auto h-auto max-h-[85vh] w-full max-w-none overflow-y-auto rounded-t-2xl p-4 sm:max-w-none" data-testid="settings-sheet"><SheetTitle className="sr-only">Step settings</SheetTitle>{settings}</SheetContent>
          </Sheet>
          <Sheet open={testing} onOpenChange={setTesting}>
            <SheetContent className="w-full max-w-none p-0 sm:max-w-none" data-testid="test-sheet"><SheetTitle className="sr-only">Test workflow</SheetTitle><TestPanel wf={wf} label={draft || dirty ? 'Testing draft' : `Testing v${live}`} onCurrent={setCurrent} onClose={() => setTesting(false)} /></SheetContent>
          </Sheet>
        </>
      )}
      {dirty && (
        <SaveBar>
          <Button variant="ghost" size="sm" onClick={() => setWf(saved)} data-testid="editor-discard">Discard</Button>
          <Button size="sm" variant="outline" onClick={save} loading={saving} data-testid="editor-save">Save draft</Button>
          <Button size="sm" onClick={startPublish} data-testid="editor-publish-bar"><Rocket aria-hidden /> Publish</Button>
        </SaveBar>
      )}
      <Dialog open={publishing} onOpenChange={setPublishing}>
        <DialogContent data-testid="publish-dialog">
          <DialogTitle className="text-base font-semibold text-ink">Publish v{live + 1}</DialogTitle>
          <p className="mt-1 text-sm text-ink-muted">Live chats switch to this version as soon as it's published.</p>
          <label className="mt-4 block text-sm font-medium text-ink" htmlFor="publish-note">What changed? <span className="font-normal text-ink-muted">(optional)</span></label>
          <Textarea id="publish-note" className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} data-testid="publish-note" />
          <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setPublishing(false)} data-testid="publish-cancel">Cancel</Button><Button onClick={publish} loading={saving} data-testid="publish-confirm">Publish</Button></div>
        </DialogContent>
      </Dialog>
      <p className="mt-3 text-xs text-ink-muted">Edited {new Date(wf.editedAt).toLocaleString()} by {wf.editedBy}. Edits go to the draft; live chats run {wf.published ? `v${live}` : 'nothing'} until you publish.</p>
    </div>
  )
}

const cn2 = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')
