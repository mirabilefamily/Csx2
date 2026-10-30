import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { FileText, Mail, MessageCircle, MonitorDown } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import { PageTabs } from '@/components/PageTabs'
import { NoAccess } from '@/components/NoAccess'
import { WidgetSettingsTab } from '@/components/widgetSettings/WidgetSettingsTab'
import { ContactFormEditor } from '@/components/channels/ContactFormEditor'
import { EmailTab } from '@/components/channels/EmailTab'
import { ChannelStatus } from '@/components/channels/StatusStrip'

const TABS = [
  { id: 'chat', label: 'Chat', to: '/channels/chat', Icon: MessageCircle, status: 'ws-save-state' },
  { id: 'form', label: 'Contact form', to: '/channels/form', Icon: FileText, status: 'cf-save-state' },
  { id: 'email', label: 'Email', to: '/channels/email', Icon: Mail, status: 'email-save-state' },
  { id: 'install', label: 'Installation', to: '/channels/install', Icon: MonitorDown, status: 'install-save-state' },
]

export default function ChannelsPage() {
  const { user } = useAuth()
  const { tab } = useParams()
  const [params] = useSearchParams()
  const legacyForm = params.get('kind') === 'form'
  if (user?.role !== 'admin') return <NoAccess title="Channels" testId="channels-no-access" />
  if (tab === 'chat' && legacyForm) return <Navigate to="/channels/form" replace />
  const meta = TABS.find((t) => t.id === tab)
  if (!meta) return <Navigate to="/channels/chat" replace />
  return (
    <div className="space-y-6" data-testid="channels-page">
      <PageHeader title="Channels" description="How customers reach you: the chat widget, contact form and email." actions={<a href="/help" target="_blank" rel="noopener" className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-muted" data-testid="channels-help-center">Help center ↗</a>} />
      <PageTabs tabs={TABS} current={tab!} label="Channels sections" testIdPrefix="channels-tab" status={meta.status} />
      {tab !== 'chat' && <ChannelStatus tab={tab!} />}
      <div>
        {tab === 'chat' && <div data-testid="channels-chat"><WidgetSettingsTab /></div>}
        {tab === 'form' && <div data-testid="channels-form"><ContactFormEditor /></div>}
        {tab === 'email' && <EmailTab />}
        {tab === 'install' && <div className="space-y-6" data-testid="channels-install"><WidgetSettingsTab view="install" /></div>}
      </div>
    </div>
  )
}
