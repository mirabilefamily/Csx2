import type { AIAttempt, AIDraft, Message, Ticket } from '@/types'
import { ESCALATION_LABELS, RESOLVER_LABELS } from '@/lib/labels'
import { tickets, ticketBodies } from './tickets'
import { users } from './users'
import { aiSettings } from './settings'
import { minutesAfter, mulberry32 } from './time'

interface Script { claude: string; grokbot: string; agent: string; note: string; thanks: string; guidance: string[] }

const scripts: Record<string, Script> = {
  sizing: {
    claude: 'Happy to help you find the right fit. Based on your measurement, our size guide points to a Medium. If you are between sizes, go up and use the foam sizing tape tucked inside the sweatband.',
    grokbot: 'I checked the fit notes for this style. It runs slightly snug, so I recommend sizing up. An exchange is free if it is not quite right.',
    agent: 'I double-checked with our fitting team. Go with the Large, and if it is loose, the sizing tape will take it in. I have added a note so any exchange ships first.',
    note: 'Customer is between sizes. Checked fit notes with the shop team.',
    thanks: 'Perfect, thank you! Ordering now.',
    guidance: ['ga-01', 'ga-02'],
  },
  'order-status': {
    claude: 'I found your order. It shipped with UPS and is currently in transit. Here is your tracking link. I will keep an eye on it for you.',
    grokbot: 'I pulled the carrier scans. The package has been sitting at the regional hub. I have flagged it with the carrier and you should see movement within a day.',
    agent: 'I opened a carrier trace and sent a replacement with expedited shipping today. You will get the new tracking number by email within the hour.',
    note: 'Carrier trace opened. Tracking stalled 3+ days at the Chicago hub.',
    thanks: 'Thanks for sorting this out.',
    guidance: ['ga-04', 'ga-07'],
  },
  returns: {
    claude: 'Unworn hats can be returned within 30 days of delivery. I can email you a prepaid return label right now.',
    grokbot: 'I see the return was scanned at our warehouse. Refunds usually post within 5–7 business days after inspection.',
    agent: 'I processed your refund in full today. It should appear on your statement in 3–5 business days. So sorry for the wait.',
    note: 'Refund exceeds the $250 AI limit. Needs approval from someone with refund permission.',
    thanks: 'Got it, thank you!',
    guidance: ['ga-08', 'ga-10'],
  },
  exchange: {
    claude: 'Exchanges are free. I can send a prepaid label and reserve the new size for you.',
    grokbot: 'Your new size is in stock and reserved. A prepaid label is on its way, and we will ship the replacement as soon as the return is scanned.',
    agent: 'I have shipped the new size ahead of your return so you have it this week.',
    note: 'Shipping exchange ahead of return.',
    thanks: 'Wonderful, thanks so much.',
    guidance: ['ga-09'],
  },
  damaged: {
    claude: 'I am so sorry your hat arrived damaged. Could you share a photo or two so I can get a replacement moving?',
    grokbot: 'Thank you for the photos. The damage is clear. Replacements for damaged items need a quick check from our team, so I am passing this to a colleague now.',
    agent: 'A replacement is on its way with overnight shipping. No need to send the damaged one back. Again, our apologies.',
    note: 'Photos confirm crushed crown. Checking stock for overnight replacement.',
    thanks: 'Thank you, that is a relief.',
    guidance: ['ga-11'],
  },
  'custom-order': {
    claude: 'Custom embroidery is something we love to do. Minimums start at 24 units with a 4–6 week lead time. Let me bring in someone who can put a quote together.',
    grokbot: 'I gathered the details for a custom quote: quantity, design and deadline. A member of our custom team will follow up personally.',
    agent: 'Lovely project. I have attached a mock-up and a quote, and we can hit your date with standard production.',
    note: 'Quote requested from the custom shop. Waiting on monogram artwork.',
    thanks: 'This looks fantastic, thank you!',
    guidance: ['ga-12'],
  },
  wholesale: {
    claude: 'Thanks for your interest in carrying Goorin. I am looping in our wholesale desk with your details.',
    grokbot: 'I confirmed your wholesale account and terms. A wholesale specialist will finalize pricing and availability.',
    agent: 'I have attached the line sheet and confirmed your order on net-30 terms. It ships from our warehouse within 5 business days.',
    note: 'Account WS-118 in good standing. Confirm Mae Wide Brim availability before replying.',
    thanks: 'Appreciate the quick turnaround.',
    guidance: ['ga-13'],
  },
  care: {
    claude: 'Let it air dry crown-down on a clean towel, away from direct heat. Reshape the brim gently while it is still slightly damp.',
    grokbot: 'Vintage restoration is outside what I can advise on confidently. I am passing this to our team for a recommendation.',
    agent: 'We partner with a restoration hatter in San Francisco who works on vintage Goorin pieces. I have emailed you their details.',
    note: 'Ask the Haight Street shop which restorer they use.',
    thanks: 'Thank you, very helpful.',
    guidance: ['ga-14'],
  },
  general: {
    claude: 'Thanks for reaching out to Goorin Bros. Here is what I found for you.',
    grokbot: 'I looked a little deeper and here is the full answer.',
    agent: 'Thanks for your patience. Here is everything you need.',
    note: 'Checking with the team.',
    thanks: 'Thanks!',
    guidance: ['ga-06', 'ga-15'],
  },
}

const scriptFor = (t: Ticket) => scripts[t.tags[0]] ?? scripts.general
const rand = mulberry32(42)
const pick = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 100) / 100

export const messages: Message[] = []
export const aiAttempts: AIAttempt[] = []

for (const t of tickets) {
  const s = scriptFor(t)
  const agentName = users.find((u) => u.id === t.assignee)?.name ?? 'Sam Okafor'
  let clock = t.createdAt
  let n = 0
  const push = (authorType: Message['authorType'], authorName: string, body: string, gapMin: number, isInternal = false) => {
    clock = minutesAfter(clock, gapMin)
    messages.push({ id: `${t.id}-m${++n}`, ticketId: t.id, authorType, authorName, body, createdAt: clock, isInternal })
  }
  const attempt = (tier: AIAttempt['tier'], confidence: number, outcome: AIAttempt['outcome'], reason: string | null) =>
    aiAttempts.push({
      id: `${t.id}-a${aiAttempts.filter((a) => a.ticketId === t.id).length + 1}`,
      ticketId: t.id, tier, model: tier === 'claude' ? 'claude-sonnet-5-5' : 'grok-4.7', confidence, outcome, reason,
      guidanceIds: s.guidance, latencyMs: Math.round(pick(900, 3200)), createdAt: clock,
    })

  push('customer', t.customer.name, ticketBodies[t.id], 0)
  if (t.status === 'open') continue

  const skipGrok = t.escalationReason === 'asked_for_human'
  const viaGrok = t.status === 'grok_handling' || t.status === 'needs_human' || t.resolvedBy === 'grokbot' || t.resolvedBy === 'human'
  if (skipGrok) {
    push('claude', 'AI', s.claude, 2)
    attempt('claude', pick(0.7, 0.8), 'escalated', 'Customer asked for a human')
    push('system', 'System', 'Customer asked for a human. Skipped Grokbot and escalated to the team.', 1)
    if (t.assignee) push('agent', agentName, s.note, 20, true)
    continue
  }
  const short = t.status === 'ai_handling' && t.id === 'GB-1080'
  if (t.status === 'ai_handling') {
    if (!short) push('claude', 'AI', s.claude, 2)
    attempt('claude', pick(0.74, 0.9), 'in_progress', null)
    continue
  }
  push('claude', 'AI', s.claude, 2)
  if (!viaGrok) {
    attempt('claude', pick(0.86, 0.96), 'answered', null)
  } else {
    const c = pick(0.42, 0.66)
    attempt('claude', c, 'escalated', `Confidence ${c.toFixed(2)} below ${(aiSettings.threshold / 100).toFixed(2)} threshold`)
    push('system', 'System', `AI confidence ${c.toFixed(2)} is below the ${(aiSettings.threshold / 100).toFixed(2)} threshold. Handed to Grokbot.`, 3)
    if (t.status === 'grok_handling') {
      attempt('grokbot', pick(0.6, 0.78), 'in_progress', null)
      continue
    }
    push('grokbot', 'Grokbot', s.grokbot, 6)
    if (t.resolvedBy === 'grokbot') attempt('grokbot', pick(0.8, 0.92), 'answered', null)
    else {
      const reason = t.escalationReason ? ESCALATION_LABELS[t.escalationReason] : 'Needs a human decision'
      attempt('grokbot', pick(0.48, 0.68), 'escalated', reason)
      push('system', 'System', `Escalated to a human: ${reason}.`, 2)
      if (t.id === 'GB-1076') push('system', 'System', 'Damaged item claim handed over: refund above $75 limit', 1)
      if (t.assignee || t.id === 'GB-1076') push('agent', t.assignee ? agentName : 'Sam Okafor', s.note, 20, true)
      if (t.status === 'needs_human') continue
      push('agent', agentName, s.agent, 35)
    }
  }
  push('customer', t.customer.name, s.thanks, 50)
  push('system', 'System', `Resolved by ${RESOLVER_LABELS[t.resolvedBy ?? 'claude']}.`, 5)
  if (t.status === 'closed') push('system', 'System', 'Ticket closed automatically after 5 days with no reply.', 60 * 24 * 5)
}

const draftSeeds: [string, AIDraft['tier'], number, string][] = [
  ['GB-1076', 'claude', 0.58, "Dear Margaret,\n\nI'm so sorry your Hampton arrived crushed, especially with the wedding this weekend. I've reserved a new Hampton Wool Fedora in Tobacco, size M, and can ship it overnight today so it arrives Thursday. There's no need to send the damaged one back.\n\nWarmly,\nGoorin Bros."],
  ['GB-1074', 'claude', 0.49, "Hi Jonah,\n\nCongratulations! We'd be honored to make caps for your guests. For 120 embroidered truckers, our custom shop typically needs 4–6 weeks. Could you send your monogram artwork and preferred cap color? We'll put together a quote and mock-up."],
  ['GB-1068', 'grokbot', 0.63, "Hi Clara,\n\nThank you for your patience. We received all three hats from order #GB20360 and your refund of $451.00 is ready to be approved. You'll see it on your statement within 3–5 business days of approval."],
  ['GB-1065', 'claude', 0.52, "Hi Marcus,\n\nThanks for the reorder of 48 units. I've noted your request for net-30 terms on this order. Our wholesale team approves terms, so I've passed it to them and you'll hear back today with a confirmed invoice.\n\nBest,\nGoorin Bros."],
  ['GB-1058', 'claude', 0.46, "Hi Rosa,\n\nWhat a treasure. A 1950s Goorin fedora deserves careful hands. We don't restore vintage felt in-house, but our team can recommend a trusted hatter near Santa Fe and share how to store it until then.\n\nWarmly,\nGoorin Bros."],
  ['GB-1061', 'grokbot', 0.55, "Hi Dev,\n\nI'm sorry you've had to ask more than once. Your Hampton Wool Fedora (order #GB20340) has been held at the FedEx Chicago hub since last Tuesday. I've opened a trace and can ship a replacement today with overnight delivery."],
]

export const aiDrafts: AIDraft[] = draftSeeds.map(([ticketId, tier, confidence, body], i) => {
  const t = tickets.find((x) => x.id === ticketId)!
  return { id: `draft-${i + 1}`, ticketId, tier, body, confidence, guidanceIds: scriptFor(t).guidance, createdAt: t.updatedAt }
})
