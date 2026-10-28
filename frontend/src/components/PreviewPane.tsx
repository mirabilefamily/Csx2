import { useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Sticky preview column at 1024+; below that it sits under the settings behind a "Show preview" toggle (REQ-954).
export function PreviewPane({ label, testId, toggleTestId, className, children }: { label: string; testId: string; toggleTestId?: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <aside aria-label={label} className={cn('min-w-0 lg:sticky lg:top-6 lg:self-start', className)} data-testid={testId}>
      <Button variant="outline" className="w-full lg:hidden" aria-expanded={open} onClick={() => setOpen(!open)} data-testid={toggleTestId ?? `${testId}-toggle`}>
        {open ? <EyeOff aria-hidden /> : <Eye aria-hidden />} {open ? 'Hide preview' : 'Show preview'}
      </Button>
      <div className={cn(open ? 'mt-4 block' : 'hidden', 'lg:mt-0 lg:block lg:h-full')}>{children}</div>
    </aside>
  )
}
