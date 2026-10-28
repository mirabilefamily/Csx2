import { Navigate, useLocation, useParams } from 'react-router-dom'
import { Plug, Star, UserRound, Users } from 'lucide-react'
import { settingsApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/components/auth/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import { PageTabs } from '@/components/PageTabs'
import { NoAccess } from '@/components/NoAccess'
import { IntegrationsTab } from '@/components/settings/IntegrationsTab'
import { IntegrationDetail } from '@/components/settings/IntegrationDetail'
import { UsersTab } from '@/components/settings/UsersTab'
import { AccountTab } from '@/components/settings/AccountTab'
import { CsatTab } from '@/components/settings/CsatTab'

const TABS = [
  { id: 'account', label: 'Account', Icon: UserRound, description: 'Your profile, password and alerts.', status: 'account-save-state' },
  { id: 'users', label: 'Users', Icon: Users, description: 'Who can use the desk and what they can do.', status: undefined },
  { id: 'integrations', label: 'Integrations', Icon: Plug, description: 'Connections to your mailbox, store, AI and email. Credentials are read-only here.', status: undefined },
  { id: 'csat', label: 'CSAT', Icon: Star, description: 'The survey customers get after a ticket is resolved.', status: 'csat-save-state' },
]

function Tabs({ tab, status }: { tab: string; status?: string }) {
  const { data } = useApi(() => settingsApi.listIntegrations(), [])
  const attention = !!data?.some((i) => i.attention || i.status === 'error')
  const tabs = TABS.map((t) => ({
    ...t,
    to: `/settings/${t.id}`,
    extra: t.id === 'integrations' && attention ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="An integration needs attention" role="img" data-testid="settings-tab-integrations-alert" /> : undefined,
  }))
  return <PageTabs tabs={tabs} current={tab} label="Settings sections" testIdPrefix="settings-tab" status={status} />
}

export default function SettingsPage() {
  const { user } = useAuth()
  const params = useParams()
  const { hash } = useLocation()
  const tab = params.integrationId ? 'integrations' : params.tab
  if (user?.role !== 'admin') return <NoAccess title="Settings" />
  if (tab === 'widget') return <Navigate to={hash === '#install' ? '/channels/install' : '/channels/chat'} replace />
  if (tab === 'ai') return <Navigate to="/ai/replies" replace />
  if (params.integrationId === 'shopify' && params.sub) return <Navigate to={params.sub === 'install' ? '/channels/install' : '/channels/chat'} replace />
  if (!TABS.some((t) => t.id === tab)) return <Navigate to="/settings/integrations" replace />

  const meta = TABS.find((t) => t.id === tab)!
  return (
    <div className="space-y-8 [&_input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color])]:max-w-[480px] [&_button[role=combobox]]:max-w-[480px]" data-testid="settings-page">
      <div className="space-y-6">
        <PageHeader title="Settings" description={<span data-testid="settings-tab-description">{meta.description}</span>} />
        <Tabs tab={tab!} status={params.integrationId ? 'integration-save-state' : meta.status} />
      </div>
      {tab === 'integrations' && (params.integrationId ? <IntegrationDetail id={params.integrationId} sub={params.sub} /> : <IntegrationsTab />)}
      {tab === 'account' && <AccountTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'csat' && <CsatTab />}
    </div>
  )
}
