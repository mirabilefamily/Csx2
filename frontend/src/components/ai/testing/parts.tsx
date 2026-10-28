import { Link } from 'react-router-dom'
import { ChevronDown, ListChecks } from 'lucide-react'
import type { TestTurn } from '@/types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const SCENARIOS: [string, string, string][] = [
  ['Sizing', 'Between sizes for a fedora', "My head measures 22.5 inches. Which size fedora should I order if I'm between sizes?"],
  ['Tracking', 'Tracking hasn’t updated', 'Where is my order? The tracking number has not updated in three days.'],
  ['Returns', 'Return a hat that doesn’t fit', 'How do I return a hat I bought last week? It does not fit.'],
  ['Damaged', 'Arrived crushed, wants a replacement', 'My fedora arrived crushed with a dent in the brim. Can you send a replacement?'],
  ['Wholesale', 'Boutique asking for terms', 'We run a boutique and want to stock your hats. What are your wholesale terms?'],
]
export const STRONG = 40
export type Result = NonNullable<TestTurn['result']>
export const strong = (r: Result) => r.articles.filter((a) => a.score >= STRONG)
export const decisionKind = (r: Result) => (r.workflow ? 'workflow' : r.wouldEscalate ? 'handoff' : 'send')
export const DECISION_SHORT = { workflow: 'Would start workflow', handoff: 'Would hand to a person', send: 'Would send' } as const
export const decisionWords = (r: Result) => (r.workflow ? `Would start workflow: ${r.workflow.name}` : r.wouldEscalate ? `Would hand to a person — confidence below ${r.threshold}%` : 'Would send on its own')
export const chipTone = (c: number, t: number) => (c >= t ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-amber-50 text-amber-900 ring-amber-200')
export const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export function ConfidenceBar({ value, threshold, testId }: { value: number; threshold: number; testId?: string }) {
  return (
    <div className="relative h-2 w-full rounded-full bg-surface-muted" role="img" aria-label={`${value}% confidence, threshold ${threshold}%`} data-testid={testId}>
      <div className={cn('h-full rounded-full', value >= threshold ? 'bg-green-600' : 'bg-amber-500')} style={{ width: `${value}%` }} />
      <span className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: `calc(${threshold}% - 1px)` }} aria-hidden data-testid={testId ? `${testId}-marker` : undefined} />
    </div>
  )
}

export function ScenarioCards({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-[760px] py-6" data-testid="test-empty">
      <h3 className="text-[15px] font-semibold text-ink">Try a scenario</h3>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {SCENARIOS.map(([l, d, q]) => (
          <button key={l} type="button" onClick={() => onPick(q)} className="group rounded-xl bg-surface p-4 text-left ring-1 ring-border transition-[background-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`test-empty-${l.toLowerCase()}`}>
            <span className="block text-sm font-semibold text-ink">{l}</span>
            <span className="mt-0.5 block text-[13px] text-ink-muted">{d}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-ink-muted" data-testid="test-empty-hint">Or type what the customer says below.</p>
    </div>
  )
}

export function ScenariosMenu({ onPick, disabled }: { onPick: (q: string) => void; disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={disabled} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))} data-testid="test-scenarios-menu"><ListChecks aria-hidden /> Scenarios <ChevronDown className="h-3.5 w-3.5" aria-hidden /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {SCENARIOS.map(([l, d, q]) => <DropdownMenuItem key={l} onSelect={() => onPick(q)} className="flex-col items-start gap-0" data-testid={`test-scenario-menu-${l.toLowerCase()}`}><span className="font-medium">{l}</span><span className="text-xs text-ink-muted">{d}</span></DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const SmallLink = ({ to, children, testId }: { to: string; children: React.ReactNode; testId: string }) => <Link to={to} className="font-medium text-tobacco-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={testId}>{children}</Link>
