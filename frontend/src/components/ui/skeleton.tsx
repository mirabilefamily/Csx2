import * as React from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-muted', className)} {...props} />
}

export const Table = ({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
    <table className={cn('w-full caption-bottom text-sm', className)} {...p} />
  </div>
)
export const TableHeader = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} className={cn('[&_tr]:border-b', p.className)} />
export const TableBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} className={cn('[&_tr:last-child]:border-0', p.className)} />
export const TableRow = (p: React.HTMLAttributes<HTMLTableRowElement>) => <tr {...p} className={cn('border-b border-border transition-colors hover:bg-surface-sunken', p.className)} />
export const TableHead = (p: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th {...p} className={cn('h-10 px-4 text-left align-middle text-xs font-medium text-ink-muted', p.className)} />
)
export const TableCell = (p: React.TdHTMLAttributes<HTMLTableCellElement>) => <td {...p} className={cn('px-4 py-3 align-middle text-ink', p.className)} />
