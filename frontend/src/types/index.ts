export type Channel = 'email' | 'chat'
export type TicketStatus = 'open' | 'ai_handling' | 'grok_handling' | 'needs_human' | 'resolved' | 'closed'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type Resolver = 'claude' | 'grokbot' | 'human'
export type AuthorType = 'customer' | 'claude' | 'grokbot' | 'agent' | 'system'
export type Role = 'admin' | 'agent'
export type UserStatus = 'active' | 'invited' | 'deactivated'
export type AITier = 'claude' | 'grokbot'
export type EscalationReason =
  | 'low_confidence'
  | 'asked_for_human'
  | 'refund_over_limit'
  | 'damaged_item'
  | 'custom_order'
  | 'wholesale'
  | 'negative_sentiment'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  lastLoginAt: string | null
  invitedAt?: string | null
}

export interface Session { id: string; device: string; lastActiveAt: string; current: boolean }

export interface LineItem {
  sku: string
  title: string
  variant: string
  quantity: number
  price: number
  image: string
}

export type OrderStatus = 'unfulfilled' | 'in_transit' | 'delivered' | 'returned' | 'cancelled'
export type FinancialStatus = 'paid' | 'pending' | 'partially_refunded' | 'refunded'
export type FulfillmentStatus = 'unfulfilled' | 'fulfilled' | 'in_transit' | 'delivered'

export interface ShippingAddress {
  name: string
  line1: string
  city: string
  region: string
  zip: string
  country: string
}

export interface ShopifyOrder {
  id: string
  number: string
  status: OrderStatus
  financialStatus: FinancialStatus
  fulfillmentStatus: FulfillmentStatus
  total: number
  currency: 'USD'
  createdAt: string
  carrier: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  lineItems: LineItem[]
  refundedAmount?: number
  shippingCost?: number
  isDraft?: boolean
  discount?: number
  shippingAddress: ShippingAddress
  adminUrl: string
}

export type LoopState = 'open' | 'in_review' | 'closed' | 'cancelled' | 'expired'
export type LoopOutcome = 'refund' | 'exchange' | 'store_credit' | 'gift_card'
export type LoopLabelStatus = 'label_created' | 'in_transit' | 'delivered_to_warehouse'

export interface LoopReturnItem {
  sku: string
  title: string
  variant: string
  reason: string
  quantity: number
  price: number
  image: string
  exchangeFor: string | null
}

export interface LoopReturn {
  id: string
  customerId: string
  orderNumber: string
  state: LoopState
  outcome: LoopOutcome
  returnTotal: number
  refund: number
  exchangeTotal: number
  storeCredit: number
  items: LoopReturnItem[]
  labelStatus: LoopLabelStatus
  createdAt: string
  adminUrl: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  location: string
  tags: string[]
  shopifyCustomerId: string | null
  adminUrl: string | null
  customerSince: string
  note: string | null
  orders: ShopifyOrder[]
}

export interface CustomerRef {
  id: string
  name: string
  email: string
}

export interface Ticket {
  id: string
  subject: string
  preview: string
  channel: Channel
  status: TicketStatus
  priority: Priority
  tags: string[]
  assignee: string | null
  resolvedBy: Resolver | null
  customer: CustomerRef
  createdAt: string
  updatedAt: string
  escalationReason: EscalationReason | null
  orderNumber: string | null
  fraud?: TicketFraudFlag | null
  setAside?: 'spam' | 'trash' | null
  draftReady?: boolean
  unread?: boolean
  handoverReason?: string | null
  aiConfidence?: number | null
}

export interface Message {
  id: string
  ticketId: string
  authorType: AuthorType
  authorName: string
  body: string
  createdAt: string
  isInternal: boolean
  format?: 'text' | 'html'
  approvedBy?: string
}

export interface AIAttempt {
  id: string
  ticketId: string
  tier: AITier
  model: string
  confidence: number
  outcome: 'answered' | 'escalated' | 'in_progress'
  reason: string | null
  guidanceIds: string[]
  latencyMs: number
  createdAt: string
}

export interface AIDraft {
  id: string
  ticketId: string
  tier: AITier
  body: string
  confidence: number
  guidanceIds: string[]
  createdAt: string
}

export interface GuidanceArticle {
  id: string
  title: string
  category: string
  tags: string[]
  body: string
  active: boolean
  updatedAt: string
  updatedBy: string
  version: number
  aiUses30d: number
  history: { version: number; editor: string; at: string }[]
}

export type CsatQuestionType = 'rating' | 'text' | 'choice'

export interface CsatQuestion {
  id: string
  type: CsatQuestionType
  label: string
  required: boolean
  options?: string[]
}

export type DelayUnit = 'minutes' | 'hours'

export interface CsatMessages { subject: string; intro: string; chatPrompt: string; thanks: string }

export interface CsatSurvey {
  id: string
  questions: CsatQuestion[]
  sendDelay: { value: number; unit: DelayUnit }
  channels: { email: boolean; inlineChat: boolean }
  lowScoreRecipients: string[]
  lowScoreThreshold: number
  updatedAt: string
  messages: CsatMessages
  ratingStyle: CsatStyle
}

export interface CsatResponse {
  id: string
  ticketId: string
  customerName: string
  channel: Channel
  resolvedBy: Resolver
  score: number
  comment: string | null
  createdAt: string
  needsFollowUp: boolean
}

export interface DailyMetric {
  date: string
  ticketsCreated: number
  email: number
  chat: number
  openAtEnd: number
  resolved: number
  resolvedClaude: number
  resolvedGrokbot: number
  resolvedHuman: number
  firstResponseMinutes: number
  resolutionMinutes: number
  surveysSent: number
  escalations: Record<EscalationReason, number>
  tags: Record<string, number>
}

// ---- API DTOs ----
export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'custom'

export interface DateRange {
  from: string
  to: string
}

export type RefundStage = 'requested' | 'approved' | 'refunded' | 'declined' | 'on_hold'
export type RiskLevel = 'high' | 'medium' | 'low'
export type FraudAction = 'safe' | 'held' | 'escalated'
export type FraudStatus = 'open' | FraudAction
export type FraudSignalCode = 'repeat_refund' | 'not_received_delivered' | 'high_value' | 'new_account' | 'address_mismatch'

export interface RefundRecord {
  id: string
  ticketId: string
  orderNumber: string
  customer: string
  amount: number
  currency: 'USD'
  reason: string
  stage: RefundStage
  decidedBy: Resolver | null
  auto: boolean
  createdAt: string
  refundedAt: string | null
  recommendation: 'approve' | 'decline' | 'hold'
}

export interface FraudSignal {
  code: FraudSignalCode
  label: string
}

export interface FraudAlert {
  id: string
  ticketId: string
  orderNumber: string
  customer: string
  riskScore: number
  level: RiskLevel
  signals: FraudSignal[]
  amountAtRisk: number
  status: FraudStatus
  createdAt: string
  reviewedBy: string | null
  reviewNote?: string | null
  reviewedAt: string | null
  refundId: string | null
}

export interface FraudReviewResult {
  alert: FraudAlert
  refund: RefundRecord | null
}

export interface TicketFraudFlag {
  alertId: string
  level: RiskLevel
  score: number
}

export interface AutoRefundSettings {
  enabled: boolean
  limit: number
}

export interface RefundSummary {
  totalRefunded: number
  previousTotal: number | null
  count: number
  autoPct: number | null
  pending: { count: number; amount: number }
  stages: Record<RefundStage, number>
  trend: number[]
  awaiting: RefundRecord[]
  autoRefund: AutoRefundSettings
}

export type KpiFormat = 'count' | 'percent' | 'duration' | 'score'

export interface KpiMetric {
  key: string
  label: string
  value: number | null
  previous: number | null
  format: KpiFormat
  betterWhen: 'higher' | 'lower' | 'neutral'
  hint: string
  series?: number[]
}

export interface ScoreSplit<K extends string> {
  key: K
  label: string
  average: number | null
  responses: number
}

export interface CsatSummary {
  totalResponses: number
  average: number | null
  trend: { label: string; average: number | null; responses: number }[]
  distribution: { score: number; count: number }[]
  byChannel: ScoreSplit<Channel>[]
  byResolver: ScoreSplit<Resolver>[]
  latestComments: CsatResponse[]
  lowScores: CsatResponse[]
}

export interface DashboardSummary {
  range: DateRange
  priorRange: DateRange
  comparisonLabel: string
  kpis: KpiMetric[]
  volumeByChannel: { label: string; email: number; chat: number }[]
  resolvedBy: { key: Resolver; label: string; count: number }[]
  escalationReasons: { key: EscalationReason; label: string; count: number }[]
  topTags: { tag: string; count: number }[]
  csat: CsatSummary
}

export interface SearchCustomerResult extends CustomerRef {
  latestTicketId: string | null
  ticketCount: number
}

export interface SearchResults {
  query: string
  tickets: Ticket[]
  customers: SearchCustomerResult[]
  articles: Pick<GuidanceArticle, 'id' | 'title' | 'category'>[]
}

export type InboxViewId = 'needs_you' | 'ai_handling' | 'mine' | 'resolved' | 'closed' | 'all' | 'spam' | 'trash'
export interface NewTicketInput { email: string; name?: string; subject: string; channel: Channel; body: string; isInternal: boolean }

export interface TicketDetail {
  ticket: Ticket
  messages: Message[]
  drafts: AIDraft[]
  attempts: AIAttempt[]
  customer: Customer | null
  pastTickets: Ticket[]
  fraudAlert: FraudAlert | null
  guidanceTitles: Record<string, string>
}

export interface TicketPatch {
  status?: TicketStatus
  priority?: Priority
  assignee?: string | null
  tags?: string[]
}

export interface SavedViewFilters { q?: string; channel?: Channel | 'all'; tag?: string; status?: TicketStatus | 'active' | 'all'; sort?: 'newest' | 'oldest' | 'priority' }
export interface SavedView { id: string; name: string; scope: 'shared' | 'private'; ownerId: string; ownerName: string; filters: SavedViewFilters }
export interface OrderRefundInput { orderId: string; items: Record<string, number>; shipping: boolean; restock: boolean; reason: string; note: string; notify: boolean }

export interface BulkPatch {
  status?: TicketStatus
  assignee?: string | null
  addTag?: string
  removeTag?: string
  priority?: Priority
  unread?: boolean
  setAside?: 'spam' | 'trash' | null
}

export interface NewMessage {
  html: string
  isInternal: boolean
  draftId?: string
}

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
}

export interface Invite {
  token: string
  email: string
  suggestedName: string
  role: Role
  invitedBy: string
  expired: boolean
}

// ---- Phase 3: guidance + settings ----
export type IntegrationId = 'outlook' | 'shopify' | 'claude' | 'grokbot' | 'resend' | 'loop'
export type IntegrationState = 'connected' | 'error' | 'not_configured'

export interface IntegrationStatus {
  id: IntegrationId
  name: string
  description: string
  status: IntegrationState
  lastSyncAt: string | null
  error: string | null
  envVar: string
  secretPreview: string | null
  details: Record<string, string>
  models?: string[]
  model?: string
  checklist?: { label: string; ok: boolean }[]
  widget?: { embedEnabled: boolean; lastSeenAt: string | null }
  // Saved setup exists; independent of the live connection check.
  configured: boolean
  attention?: string | null
}

export interface TestResult { ok: boolean; ms: number; message: string }

export interface AiSettings {
  threshold: number
  autoSend: { email: { claude: boolean; grokbot: boolean }; chat: { claude: boolean; grokbot: boolean } }
  prompts: { claude: string; grokbot: string }
  autoRefund: AutoRefundSettings
}

export interface SandboxResult {
  articles: { id: string; title: string; category: string; score: number }[]
  draft: string
  confidence: number
  threshold: number
  wouldEscalate: boolean
  order: ShopifyOrder | null
  orderNotFound: string | null
}

export type ArticleInput = Omit<GuidanceArticle, 'id' | 'updatedAt' | 'updatedBy' | 'version' | 'history' | 'aiUses30d'> & { id?: string }
export interface ImportRow { title?: string; body?: string; category?: string; tags?: string; active?: string }

// ---- Customer chat widget (phase 4) ----
export type StorePageType = 'home' | 'product' | 'collection' | 'cart' | 'account' | 'pages' | 'other'
export type SharedWidgetField = 'primary' | 'accent' | 'launcherPosition' | 'hideOnMobile'
export type SettingSource = 'desk' | 'theme'
export type LauncherIcon = 'chat' | 'hat' | 'question' | 'envelope' | 'headset' | 'custom'
export type WidgetState =
  | 'launcher_closed'
  | 'greeting_bubble'
  | 'prechat'
  | 'active_chat'
  | 'handoff'
  | 'offline'
  | 'csat'
  | 'transcript_sent'
  | 'home'
  | 'order_tracking'
export type LauncherPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type CsatStyle = 'stars' | 'emoji' | 'numeric'
export type FieldMode = 'required' | 'optional' | 'off'
export interface Offset { x: number; y: number }

export type StarterAction = 'ai' | 'workflow' | 'link'
export interface WidgetStarter { id: string; label: string; action: StarterAction; workflowId?: string; url?: string }
export interface WidgetSettings {
  // Phase 14 home screen and conversation (REQ-786..799). MOCKED.
  home: {
    cart: { enabled: boolean; label: string }
    track: { enabled: boolean; label: string }
    starters: WidgetStarter[]
    showLastConversation: boolean
  }
  conversation: { botName: string; thumbs: boolean; askEmailFirst: boolean }
  branding: {
    panelStyle: 'frosted' | 'solid'
    panelColor: string
    colors: {
      primary: string
      accent: string
      headerBackground: string
      headerText: string
      customerBubble: string
      aiBubble: string
      link: string
    }
    logoUrl: string | null
    aiAvatarUrl: string | null
    agentAvatarUrl: string | null
    font: 'inherit' | 'inter'
    radius: number
    shadow: 'none' | 'soft' | 'strong'
  }
  launcher: {
    icon: LauncherIcon
    customIconUrl: string | null
    iconColor: string
    backgroundColor: string
    buttonColor?: 'white' | 'panel'
    style: 'circle' | 'pill'
    label: string
    size: 's' | 'm' | 'l'
    position: LauncherPosition
    offset: Offset
    mobileOffset: Offset
    badgeColor: string
    animation: 'none' | 'pulse_once' | 'bounce'
    bounceAfterSec: number
  }
  messaging: {
    headerTitle: string
    headerSubtitle: string
    greeting: string
    proactive: { enabled: boolean; delaySec: number; pages: StorePageType[] }
    preChat: { email: FieldMode; name: FieldMode; orderNumber: FieldMode }
    aiDisclosure: string
    handoffMessage: string
    handoffResponseTime: string
    offlineMessage: string
    offlineEmailFallback: boolean
    quickReplies: string[]
  }
  display: {
    mode: 'all' | 'page_types'
    pageTypes: StorePageType[]
    urlInclude: string[]
    urlExclude: string[]
    hideOnMobile: boolean
    outsideHours: 'keep_ai' | 'offline_form' | 'hide'
    customerContext: { loggedInCustomer: boolean; currentProduct: boolean; cartContents: boolean }
  }
  csat: { enabled: boolean; style: CsatStyle }
  // Which side owns the fields shared with the Shopify theme editor block.
  sources: Record<SharedWidgetField, SettingSource>
}

export interface ThemeEmbedSettings {
  enabled: boolean
  primary: string
  accent: string
  launcherPosition: 'bottom-right' | 'bottom-left'
  hideOnMobile: boolean
}

export interface VerifyResult { detected: boolean; message: string }

export interface ShopifyInstallStatus {
  shopDomain: string
  embedEnabled: boolean
  themeName: string
  lastSeenAt: string | null
  method: 'app_embed' | 'script_tag' | 'none'
}

export interface StoreProduct {
  id: string
  name: string
  price: number
  image: string
  category: string
  colors: string[]
  description: string
}

export interface WidgetCustomer { firstName: string; name: string; email: string }

export interface WidgetOrderCard {
  number: string
  status: OrderStatus
  productTitle: string
  variant: string
  image: string
  carrier: string | null
  trackingUrl: string | null
  eta: string | null
}

export interface ChatContext { email: string | null; orderNumber: string | null; pageType: StorePageType }
export interface ChatReply { text: string; order?: WidgetOrderCard; handoff?: boolean }
export interface OfflineMessageInput { name: string; email: string; message: string }
export type CsatAnswers = Record<string, string | number>

export type SurveyLookup =
  | { status: 'valid'; token: string; ticketId: string; ticketSubject: string; firstName: string; questions: CsatQuestion[] }
  | { status: 'invalid' }
  | { status: 'completed'; ticketSubject: string }



// ---- Phase 9: AI & Workflows, Channels, Account ----
export interface BrandVoice {
  enabled: boolean
  brandName: string
  tone: string
  howToRespond: string
  phrasesToUse: string
  phrasesToAvoid: string
  examples: string
  signOff: string
  updatedAt: string
}
export const BRAND_VOICE_LIMITS = { brandName: 100, tone: 2000, howToRespond: 2000, phrasesToUse: 2000, phrasesToAvoid: 2000, examples: 4000, signOff: 200 } as const
export interface VoiceSample { id: 'sizing' | 'late' | 'damaged'; label: string; customer: string; draft: string }
export interface ReplyImpact { resolvedPct: number; handedPct: number; autoSent: number; autoRefunds: number; autoRefundTotal: number }
export interface TestCustomer { id: string; name: string; email: string; orderNumber: string | null; ordersCount: number; orderStatus: string | null }

export interface TestTurn { role: 'customer' | 'ai'; text: string; result?: SandboxResult & { workflow?: { id: string; name: string } | null; handoffReason?: string } }
export interface ConversationTestInput { history: TestTurn[]; message: string; channel: 'email' | 'chat'; orderNumber?: string; voice?: BrandVoice; scenario?: string }

export type ContactFieldType = 'name' | 'email' | 'order' | 'topic' | 'message' | 'attachments'
export interface ContactField { id: ContactFieldType; label: string; enabled: boolean; required: boolean; options?: string[] }
export interface ContactFormSettings { heading: string; intro: string; fields: ContactField[]; buttonLabel: string; successMessage: string }

export interface EmailChannelSettings {
  mailbox: string
  fromName: string
  replyTo: string
  signature: string
  autoAck: { enabled: boolean; message: string }
}

export interface NotificationPrefs { needsHuman: boolean; lowCsat: boolean; fraudAlerts: boolean }
export interface ChangePasswordInput { current: string; next: string; confirm: string }
export * from './workflows'
