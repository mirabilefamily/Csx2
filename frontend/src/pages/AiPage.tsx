import { Navigate, useParams } from 'react-router-dom'
import { FlaskConical, GitBranch, MessageSquareQuote, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import { PageTabs } from '@/components/PageTabs'
import { NoAccess } from '@/components/NoAccess'
import { AiTab } from '@/components/settings/AiTab'
import { BrandVoiceTab } from '@/components/ai/BrandVoiceTab'
import { ConversationTesting } from '@/components/ai/ConversationTesting'
import { WorkflowsTab } from '@/components/workflows/WorkflowsTab'
import { WorkflowEditor } from '@/components/workflows/WorkflowEditor'

const TABS = [
  { id: 'voice', label: 'Brand voice', to: '/ai/voice', Icon: MessageSquareQuote },
  { id: 'replies', label: 'AI replies', to: '/ai/replies', Icon: Sparkles },
  { id: 'workflows', label: 'Workflows', to: '/ai/workflows', Icon: GitBranch },
  { id: 'testing', label: 'Conversation testing', to: '/ai/testing', Icon: FlaskConical },
]
const INTRO: Record<string, string> = {
  voice: 'How every AI reply sounds: tone, habits, words to use and avoid, and the sign-off.',
  replies: 'When the AI answers on its own, what it sends without review, and the refunds it can issue.',
  workflows: 'Step-by-step automations the AI runs in chat, like order tracking or starting a return.',
  testing: 'Chat with the AI as a customer to see what it would say, how sure it is and whether it hands over.',
}

export default function AiPage() {
  const { user } = useAuth()
  const { tab, workflowId } = useParams()
  const current = workflowId ? 'workflows' : tab
  if (user?.role !== 'admin') return <NoAccess title="AI & Workflows" testId="ai-no-access" />
  if (!TABS.some((t) => t.id === current)) return <Navigate to="/ai/voice" replace />
  return (
    <div className="space-y-6" data-testid="ai-page">
      <PageHeader title="AI & Workflows" description="How the AI sounds, what it can do on its own, and when it hands over to your team." />
      <div>
        <PageTabs tabs={TABS} current={current!} label="AI & Workflows sections" testIdPrefix="ai-tab" status={current === 'voice' || current === 'replies' || workflowId ? 'ai-save-state' : undefined} />
        {!workflowId && <p className="mt-3 text-sm text-ink-muted" data-testid="ai-tab-intro">{INTRO[current!]}</p>}
      </div>
      <div>
        {current === 'voice' && <BrandVoiceTab />}
        {current === 'replies' && <AiTab />}
        {current === 'workflows' && (workflowId ? <WorkflowEditor key={workflowId} id={workflowId} /> : <WorkflowsTab />)}
        {current === 'testing' && <ConversationTesting />}
      </div>
    </div>
  )
}
