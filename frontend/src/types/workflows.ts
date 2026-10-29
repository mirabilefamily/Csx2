export type WorkflowStatus = 'active' | 'off' | 'draft'
export type WorkflowChannel = 'chat' | 'form' | 'email'
export type StepType = 'message' | 'ask' | 'send_code' | 'check_code' | 'find_orders' | 'show_orders' | 'update_address' | 'find_returns' | 'start_return' | 'condition' | 'add_tag' | 'set_field' | 'handover' | 'end'
  | 'pick_order' | 'pick_items' | 'address_form' | 'upload_photos' | 'consent' | 'check_inventory' | 'cancel_order' | 'create_replacement' | 'issue_refund' | 'create_discount' | 'send_email' | 'wait' | 'run_workflow' | 'add_to_list'
export type AskKind = 'text' | 'email' | 'number' | 'buttons'
export type ConditionOp = 'gt' | 'lt' | 'eq' | 'is'

export interface StepOption { id: string; label: string }

export interface StepConfig {
  text?: string
  kind?: AskKind
  variable?: string
  options?: StepOption[]
  validation?: string
  attempts?: number
  wrongText?: string
  limit?: number
  condVar?: string
  op?: ConditionOp
  condValue?: string
  yesLabel?: string
  noLabel?: string
  tag?: string
  field?: string
  fieldValue?: string
  note?: string
  csat?: boolean
  linkLabel?: string
  linkUrl?: string
  helpLabel?: string
  helpText?: string
  orderFilter?: 'any' | 'unfulfilled' | 'delivered'
  withinDays?: number
  noneText?: string
  minPhotos?: number
  maxPhotos?: number
  required?: boolean
  amountMode?: 'items' | 'custom'
  amount?: number
  discountType?: 'percent' | 'fixed'
  discountValue?: number
  expiryDays?: number
  subject?: string
  body?: string
  waitFor?: 'duration' | 'reply'
  waitMinutes?: number
  workflowId?: string
  listId?: string
}

export interface Step {
  id: string
  type: StepType
  config: StepConfig
  position: { x: number; y: number }
}

export interface Edge {
  id: string
  source: string
  sourceHandle: string
  target: string
}

export interface Trigger {
  intent: string
  phrases: string[]
  channels: WorkflowChannel[]
  quickReply: string | null
}

export interface Variable { key: string; label: string; setBy: string }

export interface Workflow {
  id: string
  name: string
  description: string
  status: WorkflowStatus
  trigger: Trigger
  steps: Step[]
  edges: Edge[]
  runs7d: number
  completedPct: number | null
  handedPct: number | null
  editedAt: string
  editedBy: string
  templateId?: string
  published: WorkflowSnapshot | null
  versions: WorkflowVersion[]
}

export type WorkflowSnapshot = Pick<Workflow, 'name' | 'description' | 'trigger' | 'steps' | 'edges'>
export interface WorkflowVersion { n: number; by: string; at: string; note: string; snap: WorkflowSnapshot }
export type RunOutcome = 'completed' | 'handed' | 'dropped' | 'failed'
export interface RunEvent { stepId: string; label: string; detail: string }
export interface WorkflowRun { id: string; workflowId: string; at: string; customer: string; channel: WorkflowChannel; outcome: RunOutcome; lastStep: string; reach: number; durationSec: number; version: number; ticketId?: string; note?: string; timeline: RunEvent[] }

export interface WorkflowTemplate { id: string; name: string; description: string; build: () => Pick<Workflow, 'name' | 'description' | 'trigger' | 'steps' | 'edges'> }

export interface WorkflowIssue { stepId: string | null; text: string }

export interface RunOrder { number: string; date: string; items: string; status: string; total: number; carrier: string | null; trackingUrl: string | null; fulfilled?: boolean; ageDays?: number; lineItems?: { title: string; price: number }[] }
export interface RunChatMessage { id: string; from: 'bot' | 'customer'; text: string; buttons?: string[]; orders?: RunOrder[]; link?: { label: string; url: string }; photos?: number }
export interface MockEmail { id: string; from: string; to: string; subject: string; body: string; at: string }
export interface RunLogEntry { stepId: string; text: string; ok: boolean }

export interface TestRun {
  workflowId: string
  channel: WorkflowChannel
  vars: Record<string, unknown>
  current: string | null
  waitingFor: string | null
  attempts: number
  chat: RunChatMessage[]
  inbox: MockEmail[]
  log: RunLogEntry[]
  ended: string | null
}
