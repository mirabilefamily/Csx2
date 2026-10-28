import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { useDirtyCount, useUnsavedGuard } from '@/components/UnsavedGuard'
import { cn } from '@/lib/utils'

export interface PageTab { id: string; label: string; to: string; Icon?: LucideIcon; extra?: ReactNode }

// Route-backed segmented tabs used by AI & Workflows, Channels and Settings. Respects the unsaved-changes guard.
export function PageTabs({ tabs, current, label, testIdPrefix, status }: { tabs: PageTab[]; current: string; label: string; testIdPrefix: string; status?: string }) {
  const dirty = useDirtyCount() > 0
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid={`${testIdPrefix}-row`}>
      <TabNav tabs={tabs} current={current} label={label} testIdPrefix={testIdPrefix} />
      {status && <span className="sm:ml-auto"><SaveState dirty={dirty} testId={status} /></span>}
    </div>
  )
}

function TabNav({ tabs, current, label, testIdPrefix }: { tabs: PageTab[]; current: string; label: string; testIdPrefix: string }) {
  const navigate = useNavigate()
  const { confirmLeave } = useUnsavedGuard()
  return (
    <nav aria-label={label} className="-mx-4 min-w-0 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0">
      <div className="inline-flex gap-1 rounded-xl bg-surface-muted p-1">
        {tabs.map((t) => {
          const active = current === t.id
          return (
            <Link
              key={t.id}
              to={t.to}
              aria-current={active ? 'page' : undefined}
              data-testid={`${testIdPrefix}-${t.id}`}
              onClick={(e) => { e.preventDefault(); if (!active) confirmLeave(() => navigate(t.to)) }}
              className={cn(
                'relative inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:h-11 max-sm:px-3',
                active ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
              )}
            >
              {t.Icon && <t.Icon className={cn('h-4 w-4', active ? 'text-tobacco-600' : 'text-ink-subtle')} aria-hidden />}
              {t.label}
              {t.extra}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Small underline tabs for a second level (Chat / Contact form, Appearance / Preferences).
export function SubTabs<T extends string>({ tabs, value, onChange, label, testIdPrefix }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; testIdPrefix: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn('-mb-px min-h-11 whitespace-nowrap border-b-2 px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', value === t.id ? 'border-tobacco-600 text-ink' : 'border-transparent text-ink-muted hover:text-ink')}
          data-testid={`${testIdPrefix}-${t.id}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function SaveState({ dirty, testId }: { dirty: boolean; testId: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', dirty ? 'text-amber-800' : 'text-ink-muted')} role="status" data-testid={testId}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dirty ? 'bg-amber-500' : 'bg-green-600')} aria-hidden />
      {dirty ? 'Unsaved changes' : 'All changes saved'}
    </span>
  )
}
