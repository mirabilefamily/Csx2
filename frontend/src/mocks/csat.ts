import { parseISO } from 'date-fns'
import type { Channel, CsatResponse, CsatSurvey, Resolver } from '@/types'
import { dailyMetrics } from './metrics'
import { customers } from './customers'
import { tickets } from './tickets'
import { NOW, daysAgo, hoursAgo, mulberry32 } from './time'

export const csatSurvey: CsatSurvey = {
  id: 'survey-default',
  questions: [
    { id: 'q-1', type: 'rating', label: 'How would you rate the help you received?', required: true },
    { id: 'q-2', type: 'choice', label: 'What did we get right?', required: false, options: ['Speed', 'Accuracy', 'Friendliness', 'Knew our hats'] },
    { id: 'q-3', type: 'text', label: 'Anything we could do better?', required: false },
  ],
  sendDelay: { value: 2, unit: 'hours' },
  channels: { email: true, inlineChat: true },
  lowScoreRecipients: ['ava@goorin.com'],
  lowScoreThreshold: 2,
  updatedAt: daysAgo(14),
  messages: {
    subject: 'How did we do, {first_name}?',
    intro: 'Thanks for reaching out about “{ticket_subject}”. It takes 10 seconds to tell us how it went.',
    chatPrompt: 'Glad that’s sorted! Mind rating this chat?',
    thanks: 'Thanks, {first_name}! Your feedback helps us make better hats and better help.',
  },
  ratingStyle: 'stars',
}

// Hand-written responses with comments, tied to real resolved/closed tickets.
const commented: [ticketId: string, score: number, hoursAgo: number, comment: string][] = [
  ['GB-1066', 5, 40, 'The chat assistant nailed my size on the first try. The Hampton fits like it was made for me.'],
  ['GB-1062', 4, 66, "Quick swap for the right color. Would've loved the prepaid label a little sooner."],
  ['GB-1057', 5, 92, 'Fast, friendly and knew exactly how your fedoras run.'],
  ['GB-1056', 1, 140, 'Two weeks and three emails to get a replacement brim. Not the Goorin I know.'],
  ['GB-1055', 5, 186, 'Sam went above and beyond for our production. Caps arrived early.'],
  ['GB-1054', 4, 236, 'Got my tracking in seconds. Easy.'],
  ['GB-1053', 2, 280, 'The answer about the return window was vague and I had to ask twice.'],
  ['GB-1052', 3, 330, 'Got there eventually, but the size chart link was broken.'],
  ['GB-1050', 5, 425, 'Love that someone answered on a Sunday.'],
  ['GB-1049', 2, 470, 'Exchange took longer than expected and no one told me why.'],
  ['GB-1048', 4, 520, 'The replacement Mae is perfect. Thank you for making it right.'],
  ['GB-1046', 5, 610, 'Promo code fixed in a minute. Bought two caps.'],
  ['GB-1044', 3, 640, 'Fine, but I expected a faster answer for a simple question.'],
  ['GB-1042', 2, 1190, 'The replacement fedora was lovely, but the process was slow.'],
]

const commentedResponses: CsatResponse[] = commented.map(([ticketId, score, h, comment], i) => {
  const t = tickets.find((x) => x.id === ticketId)!
  return {
    id: `csat-c${i + 1}`, ticketId, customerName: t.customer.name, channel: t.channel, resolvedBy: t.resolvedBy!,
    score, comment, createdAt: hoursAgo(h), needsFollowUp: score <= csatSurvey.lowScoreThreshold,
  }
})

// Background responses without comments, all scored 3–5, so the low-score list is exactly the hand-written set.
const rand = mulberry32(7)
const pickResolver = (): Resolver => { const r = rand(); return r < 0.58 ? 'claude' : r < 0.78 ? 'grokbot' : 'human' }
const pickScore = (progress: number) => { const r = rand(); return r < 0.5 + progress * 0.12 ? 5 : r < 0.86 ? 4 : 3 }

const background: CsatResponse[] = dailyMetrics.flatMap((m, dayIndex) => {
  const progress = dayIndex / (dailyMetrics.length - 1)
  const dayStart = parseISO(m.date).getTime()
  const span = Math.min(86_400_000, NOW.getTime() - dayStart)
  const count = Math.round(m.surveysSent * (0.27 + rand() * 0.08))
  return Array.from({ length: count }, (_, k) => {
    const channel: Channel = rand() < 0.6 ? 'email' : 'chat'
    return {
      id: `csat-${m.date}-${k}`,
      ticketId: `GB-0${(700 + dayIndex * 3 + k).toString().padStart(3, '0')}`,
      customerName: customers[Math.floor(rand() * customers.length)].name,
      channel,
      resolvedBy: pickResolver(),
      score: pickScore(progress),
      comment: null,
      createdAt: new Date(dayStart + rand() * span).toISOString(),
      needsFollowUp: false,
    }
  })
})

export const csatResponses: CsatResponse[] = [...commentedResponses, ...background]
