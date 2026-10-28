import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// One section pattern for /ai/* (REQ-806..826): 24px padding, 15px sentence-case title, optional header action.
export function AiCard({ title, description, action, children, className, testId }: { title: ReactNode; description?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string; testId?: string }) {
  return (
    <section className={cn('rounded-2xl bg-surface p-6 shadow-card ring-1 ring-black/[0.04] max-sm:p-4', className)} data-testid={testId}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 max-w-[65ch] text-sm text-ink-muted">{description}</p>}
        </div>
        {action}
      </header>
      {children && <div className="mt-5">{children}</div>}
    </section>
  )
}

export interface StripCell { label: string; value: ReactNode; trend?: ReactNode; testId?: string }

// 4-cell hairline strip card (AI replies impact, Workflows stats).
export function StatStrip({ cells, testId, label }: { cells: StripCell[]; testId: string; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-black/[0.04] lg:grid-cols-4" data-testid={testId}>
      {cells.map((c, i) => (
        <div key={c.label} className={cn('min-w-0 px-5 py-4', i % 2 === 1 && 'border-l border-border/70', i >= 2 && 'max-lg:border-t max-lg:border-border/70', i === 2 && 'lg:border-l lg:border-border/70')} data-testid={c.testId}>
          <dt className="truncate text-xs font-medium text-ink-muted">{c.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">{c.value}</dd>
          {c.trend && <dd className="mt-0.5 truncate text-xs text-ink-muted">{c.trend}</dd>}
        </div>
      ))}
    </dl>
  )
}
