import type { AiSettings, IntegrationStatus } from '@/types'
import { hoursAgo, daysAgo } from './time'

// Secrets are never stored in full, only the masked preview a real backend would return.
export const integrations: IntegrationStatus[] = [
  {
    id: 'outlook', name: 'Office 365', description: 'Shared support mailbox via Microsoft Graph', status: 'connected', lastSyncAt: hoursAgo(0.05), error: null, configured: true, attention: 'Mailbox syncing is turned off.',
    envVar: 'OUTLOOK_CLIENT_SECRET', secretPreview: 'gph-••••8c21',
    details: { Mailbox: 'support@goorin.com', 'Subscription status': 'Active · renews in 2 days', 'Mailbox sync': 'Off since yesterday', 'Last poll': '3 minutes ago', 'Processed folder': 'Inbox/Processed by Desk' },
  },
  {
    id: 'shopify', name: 'Shopify', description: 'Orders, customers and the chat widget app embed', status: 'connected', lastSyncAt: hoursAgo(0.2), error: null, configured: true,
    envVar: 'SHOPIFY_ADMIN_API_TOKEN', secretPreview: 'shpat_••••41d0',
    details: { 'Shop domain': 'goorin-bros.myshopify.com', 'App embed': 'Enabled on the live theme' },
  },
  {
    id: 'claude', name: 'Claude', description: 'First-line AI replies (Anthropic)', status: 'connected', lastSyncAt: hoursAgo(0.01), error: null, configured: true,
    envVar: 'ANTHROPIC_API_KEY', secretPreview: 'sk-ant-••••3f9a',
    details: {}, models: ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-4-5'], model: 'claude-sonnet-5-5',
  },
  {
    id: 'grokbot', name: 'Grokbot', description: 'Second-tier AI for escalations (xAI)', status: 'error', lastSyncAt: hoursAgo(6), error: '401 Unauthorized: API key was rejected', configured: true, attention: '401 Unauthorized',
    envVar: 'XAI_API_KEY', secretPreview: 'xai-••••b77e',
    details: {}, models: ['grok-4.7', 'grok-4.7-fast'], model: 'grok-4.7',
  },
  {
    id: 'resend', name: 'Resend', description: 'Outbound email and CSAT surveys', status: 'connected', lastSyncAt: hoursAgo(0.5), error: null, configured: true,
    envVar: 'RESEND_API_KEY', secretPreview: 're_••••9k2m',
    details: { 'Sending domain': 'mail.goorin.com', 'From address': 'support@goorin.com', Webhook: 'Delivery events on' },
    checklist: [{ label: 'SPF record', ok: true }, { label: 'DKIM record', ok: true }, { label: 'Return-path (MX)', ok: true }],
  },
  {
    id: 'loop', name: 'Loop Returns', description: 'Returns, exchanges and store credit (Loop API)', status: 'connected', lastSyncAt: hoursAgo(0.3), error: null, configured: true,
    envVar: 'LOOP_API_KEY', secretPreview: 'loop_••••a61c',
    details: { 'Store domain': 'goorin-bros.myshopify.com', 'Return portal': 'returns.goorin.com', 'Return window': '30 days from delivery', Webhooks: 'Active · return.created, return.closed' },
  },
]

export const aiSettings: AiSettings = {
  threshold: 75,
  autoRefund: { enabled: true, limit: 75 },
  autoSend: { email: { claude: true, grokbot: false }, chat: { claude: true, grokbot: true } },
  prompts: {
    claude: 'You are the first-line support assistant for Goorin Bros., hat makers since 1895.\nAnswer warmly and briefly, using only the guidance articles provided.\nNever promise refunds over $250 or custom work. Escalate when unsure.',
    grokbot: 'You are the second-tier support assistant for Goorin Bros.\nYou receive tickets Claude could not resolve. Use order data from Shopify to investigate.\nIf a human decision is needed, summarize the case for the agent and draft a reply for approval.',
  },
}

export const settingsUpdatedAt = daysAgo(3)
