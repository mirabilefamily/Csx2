import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { settingsApi, widgetApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { StatusChip } from '@/components/StatusChip'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

const ACTION = cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'max-sm:w-full')

function Strip({ chip, text, fact, note, action, testId }: { chip: ReactNode; text: ReactNode; fact?: ReactNode; note?: ReactNode; action?: ReactNode; testId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface px-5 py-3.5 shadow-card ring-1 ring-black/[0.04] max-sm:px-4" data-testid={testId}>
      {chip}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-ink" data-testid={`${testId}-text`}>{text}{fact && <span className="font-normal text-ink-muted"> · {fact}</span>}</p>
        {note}
      </div>
      {action}
    </div>
  )
}

function ChatStrip() {
  const { data } = useApi(() => widgetApi.getInstallStatus(), [])
  if (!data) return <Skeleton className="h-[62px] w-full rounded-2xl" data-testid="channels-status-chat-loading" />
  return (
    <Strip
      testId="channels-status-chat"
      chip={<StatusChip label={data.embedEnabled ? 'Live' : 'Off'} />}
      text={`Live on ${data.shopDomain} · AI replies on`}
      fact={data.lastSeenAt ? <span data-testid="channels-status-chat-fact">Last loaded {timeAgo(data.lastSeenAt)}</span> : undefined}
      action={<Link to="/channels/install" className={ACTION} data-testid="channels-status-chat-action">Installation</Link>}
    />
  )
}

function EmailStrip() {
  const { data: o } = useApi(() => settingsApi.getIntegration('outlook'), [])
  if (!o) return <Skeleton className="h-[62px] w-full rounded-2xl" data-testid="channels-status-email-loading" />
  const attention = o.attention && o.status === 'connected'
  const label = o.status === 'error' ? 'Error' : attention ? 'Needs attention' : o.status === 'connected' ? 'Connected' : 'Not connected'
  return (
    <Strip
      testId="channels-status-email"
      chip={<StatusChip label={label} />}
      text="support@goorin.com via Office 365"
      note={attention && <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-amber-800" data-testid="email-mailbox-attention"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {o.attention}</p>}
      action={<Link to="/settings/integrations/outlook" className={ACTION} data-testid="email-manage-integration">{attention || o.status === 'error' ? 'Fix in Integrations' : 'Manage in Integrations'}</Link>}
    />
  )
}

// One-line status strip at the top of each Channels tab (REQ-919 to REQ-923).
export function ChannelStatus({ tab }: { tab: string }) {
  if (tab === 'chat') return <ChatStrip />
  if (tab === 'email') return <EmailStrip />
  if (tab === 'form')
    return <Strip testId="channels-status-form" chip={<StatusChip label="Live" />} text="Live on /pages/contact · Submissions become email tickets" action={<Link to="/channels/install" className={ACTION} data-testid="channels-status-form-action">Installation</Link>} />
  return (
    <Strip
      testId="channels-status-install"
      chip={<StatusChip label="Installed" />}
      text={<><span data-testid="channels-status-install-chat">Chat widget: Installed</span> · <span data-testid="channels-status-install-form">Contact form: Installed</span></>}
      action={<Link to="/channels/chat" className={ACTION} data-testid="channels-status-install-action">Customize chat</Link>}
    />
  )
}
