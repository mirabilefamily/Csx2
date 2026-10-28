import type { TestTurn } from '@/types'
import { cn } from '@/lib/utils'
import { ConfidenceBar, DECISION_SHORT, decisionKind, strong } from './parts'

export type Run = { label: string; turns: TestTurn[] }

// Run-all scorecard (REQ-997..1000).
export function Scorecard({ runs, onOpen }: { runs: Run[]; onOpen: (r: Run) => void }) {
  const res = runs.map((r) => r.turns[1].result!)
  const n = (k: string) => res.filter((r) => decisionKind(r) === k).length
  const avg = res.length ? Math.round(res.reduce((s, r) => s + r.confidence, 0) / res.length) : 0
  return (
    <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-border" data-testid="test-runall-table">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[15px] font-semibold text-ink">Results</p>
        <p className="mt-0.5 text-[13px] text-ink-muted" data-testid="test-scorecard-summary">{runs.length} scenarios · {n('send')} would send · {n('handoff')} would hand to a person · {n('workflow')} would start a workflow · average confidence {avg}%</p>
      </div>
      <ul aria-label="Scenario results" className="divide-y divide-border/70 text-sm">
        {runs.map((r, i) => { const x = res[i]; const k = decisionKind(x); return (
          <li key={r.label}>
            <button type="button" onClick={() => onOpen(r)} className="w-full px-4 py-3 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" data-testid={`test-runall-row-${r.label.toLowerCase()}`}>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="mr-auto font-medium text-ink">{r.label}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium ring-1', k === 'handoff' ? 'bg-amber-50 text-amber-900 ring-amber-200' : k === 'workflow' ? 'bg-sky-50 text-sky-900 ring-sky-200' : 'bg-green-50 text-green-800 ring-green-200')} data-testid="test-runall-decision">{DECISION_SHORT[k]}</span>
                <span className="text-xs tabular-nums text-ink-muted" data-testid="test-runall-sources">{strong(x).length} {strong(x).length === 1 ? 'source' : 'sources'}</span>
              </span>
              <span className="mt-2 flex items-center gap-3">
                <span className="w-9 shrink-0 text-xs font-semibold tabular-nums text-ink" data-testid="test-runall-confidence">{x.confidence}%</span>
                <span className="min-w-0 flex-1"><ConfidenceBar value={x.confidence} threshold={x.threshold} testId={`test-runall-bar-${r.label.toLowerCase()}`} /></span>
                <span className="w-[40%] min-w-0 truncate text-right text-[13px] text-ink-muted" title={x.workflow?.name} data-testid="test-runall-workflow">{x.workflow?.name ?? 'No workflow'}</span>
              </span>
            </button>
          </li>
        ) })}
      </ul>
    </div>
  )
}
