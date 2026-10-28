import { cn } from '@/lib/utils'

export type Tone = 'success' | 'attention' | 'error' | 'pending' | 'neutral'

const TONES: Record<Tone, [string, string]> = {
  success: ['bg-green-50 text-green-800', 'bg-green-600'],
  attention: ['bg-amber-50 text-amber-900', 'bg-amber-500'],
  error: ['bg-red-50 text-red-800', 'bg-red-600'],
  pending: ['bg-brass-50 text-brass-700', 'bg-brass-500'],
  neutral: ['bg-surface-muted text-ink-muted', 'bg-slate-400'],
}

export const TONE_BY_LABEL: Record<string, Tone> = {
  Connected: 'success', Active: 'success', Live: 'success', Installed: 'success',
  'Needs attention': 'attention', Error: 'error', Invited: 'pending',
  Deactivated: 'neutral', Off: 'neutral', 'Not connected': 'neutral', 'Not installed': 'neutral',
}

// The one status chip (REQ-916): one colour per meaning, used across Channels, Settings and the app.
export function StatusChip({ label, tone, testId, className }: { label: string; tone?: Tone; testId?: string; className?: string }) {
  const [cls, dot] = TONES[tone ?? TONE_BY_LABEL[label] ?? 'neutral']
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', cls, className)} data-status-chip data-testid={testId}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} aria-hidden />
      {label}
    </span>
  )
}
