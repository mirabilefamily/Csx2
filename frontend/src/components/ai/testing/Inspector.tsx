import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, Package, PlayCircle, SearchX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ConfidenceBar, decisionKind, decisionWords, STRONG, statusLabel, type Result } from './parts'

// Explains one AI reply: confidence vs threshold, decision, sources, order and why (REQ-991..996).
export function InspectorBody({ r, testId = 'test-inspector' }: { r: Result; testId?: string }) {
  const [weak, setWeak] = useState(false)
  const strongA = r.articles.filter((a) => a.score >= STRONG), weakA = r.articles.filter((a) => a.score < STRONG)
  const kind = decisionKind(r)
  const row = (a: Result['articles'][number], i: number) => (
    <li key={a.id} className="flex items-center gap-2">
      <Link to={`/guidance?article=${a.id}`} className="min-w-0 flex-1 truncate text-[13px] text-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={a.title} data-testid={`sandbox-article-${i}`}>{a.title}</Link>
      <span className="text-xs font-semibold tabular-nums text-ink-muted">{a.score}%</span>
    </li>
  )
  return (
    <div className="space-y-5 text-sm" data-testid={testId}>
      <section>
        <h4 className="text-xs font-medium text-ink-muted">Confidence</h4>
        <p className="mt-1 text-[15px] font-semibold tabular-nums text-ink" data-testid="inspector-confidence">{r.confidence}% <span className="text-[13px] font-normal text-ink-muted">· threshold {r.threshold}%</span></p>
        <div className="mt-2"><ConfidenceBar value={r.confidence} threshold={r.threshold} testId="inspector-bar" /></div>
      </section>
      <section>
        <h4 className="text-xs font-medium text-ink-muted">Decision</h4>
        <p className={cn('mt-1 font-medium', kind === 'handoff' ? 'text-amber-900' : 'text-ink')} data-testid="inspector-decision">{decisionWords(r)}</p>
        {r.workflow && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Link to={`/ai/workflows/${r.workflow.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })} data-testid="inspector-open-workflow"><GitBranch aria-hidden /> Open workflow</Link>
            <Link to={`/ai/workflows/${r.workflow.id}?test=1`} className={buttonVariants({ variant: 'ghost', size: 'sm' })} data-testid="inspector-test-workflow"><PlayCircle aria-hidden /> Test in workflow</Link>
          </div>
        )}
      </section>
      <section>
        <h4 className="text-xs font-medium text-ink-muted">Sources</h4>
        {strongA.length === 0 ? <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-muted" data-testid="sandbox-no-articles"><SearchX className="h-3.5 w-3.5" aria-hidden />No guidance matched well</p> : <ol className="mt-1.5 space-y-1.5" data-testid="sandbox-articles">{strongA.map(row)}</ol>}
        {weakA.length > 0 && (
          <>
            <button type="button" aria-expanded={weak} onClick={() => setWeak((w) => !w)} className="mt-2 min-h-8 text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="test-weaker-toggle">{weak ? 'Hide' : 'Show'} {weakA.length} weaker {weakA.length === 1 ? 'match' : 'matches'}</button>
            {weak && <ol className="mt-1 space-y-1.5 opacity-80" data-testid="sandbox-weaker">{weakA.map((a, i) => row(a, strongA.length + i))}</ol>}
          </>
        )}
      </section>
      <p className="flex items-center gap-2 text-[13px] text-ink" data-testid="sandbox-order-context"><Package className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />{r.order ? `Order checked: ${r.order.number} · ${statusLabel(r.order.status).toLowerCase()}` : r.orderNotFound ? `Order ${r.orderNotFound} not found. Tested without order context.` : 'No order checked'}</p>
      <section>
        <h4 className="text-xs font-medium text-ink-muted">Why</h4>
        <p className="mt-1 text-[13px] text-ink" data-testid="sandbox-reasoning">Confidence {r.confidence}% vs the {r.threshold}% threshold, so it {r.workflow ? `would start the ${r.workflow.name} workflow` : r.wouldEscalate ? 'would go to Needs you for a person' : 'would send on its own'}.</p>
      </section>
    </div>
  )
}
