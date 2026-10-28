import type { BrandVoice, ContactFormSettings, EmailChannelSettings, NotificationPrefs } from '@/types'
import { daysAgo } from './time'

export const brandVoice: BrandVoice = {
  enabled: true,
  brandName: 'Goorin Bros.',
  tone: 'Warm, unhurried and a little old-world, like the shop clerk who has fitted hats since 1895. Confident about craft, never stuffy.',
  howToRespond: 'Lead with the answer in the first sentence. Keep email replies under 120 words and chat replies under 50. Use the customer\'s first name once. End with one clear next step.',
  phrasesToUse: 'Happy to help\nYour hat is in good hands\nWe\'ll make it right',
  phrasesToAvoid: 'Unfortunately\nPer our policy\nAs previously stated',
  examples: 'Hi Grace, happy to help. Your fedora shipped this morning with UPS, and it should be with you by Friday. Here\'s the tracking link. If it doesn\'t fit just right, exchanges are always free.',
  signOff: 'Warmly,\nThe Goorin Bros. hat shop',
  updatedAt: daysAgo(4),
}

export const contactForm: ContactFormSettings = {
  heading: 'Contact the hat shop',
  intro: 'Questions about sizing, orders or care? We reply within one business day.',
  fields: [
    { id: 'name', label: 'Name', enabled: true, required: true },
    { id: 'email', label: 'Email', enabled: true, required: true },
    { id: 'order', label: 'Order number', enabled: true, required: false },
    { id: 'topic', label: 'Topic', enabled: true, required: true, options: ['Order status', 'Sizing & fit', 'Returns & exchanges', 'Wholesale', 'Something else'] },
    { id: 'message', label: 'Message', enabled: true, required: true },
    { id: 'attachments', label: 'Photos', enabled: false, required: false },
  ],
  buttonLabel: 'Send message',
  successMessage: 'Thanks! Your message is with our team. We reply within one business day.',
}

export const emailChannel: EmailChannelSettings = {
  mailbox: 'support@goorin.com',
  fromName: 'Goorin Bros. Support',
  replyTo: 'support@goorin.com',
  signature: 'Warmly,\n{agent_first_name}\nGoorin Bros. Hat Makers · Since 1895\ngoorin.com',
  autoAck: { enabled: true, message: 'Thanks for writing to Goorin Bros. We\'ve got your message and will reply within one business day. Your reference is {ticket_id}.' },
}

export const notificationPrefs: Record<string, NotificationPrefs> = {}
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { needsHuman: true, lowCsat: true, fraudAlerts: false }
