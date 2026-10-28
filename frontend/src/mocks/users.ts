import type { Session, User } from '@/types'
import { daysAgo, hoursAgo } from './time'

export const users: User[] = [
  { id: 'u-ava', name: 'Ava Martinez', email: 'ava@goorin.com', role: 'admin', status: 'active', lastLoginAt: hoursAgo(1) },
  { id: 'u-sam', name: 'Sam Okafor', email: 'sam@goorin.com', role: 'agent', status: 'active', lastLoginAt: hoursAgo(5) },
  { id: 'u-priya', name: 'Priya Shah', email: 'priya@goorin.com', role: 'agent', status: 'invited', lastLoginAt: null, invitedAt: daysAgo(1) },
]

export const sessions: Session[] = [
  { id: 'sess-this', device: 'This browser · Chrome on macOS', lastActiveAt: hoursAgo(0), current: true },
  { id: 'sess-iphone', device: 'Safari on iPhone', lastActiveAt: hoursAgo(2), current: false },
  { id: 'sess-windows', device: 'Chrome on Windows', lastActiveAt: daysAgo(3), current: false },
]

export const invites = {
  'demo-invite': { email: 'priya@goorin.com', suggestedName: 'Priya Shah', role: 'agent' as const, invitedBy: 'Ava Martinez', sentAt: daysAgo(1) },
}
