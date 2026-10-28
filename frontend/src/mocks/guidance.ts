import type { GuidanceArticle } from '@/types'
import { daysAgo } from './time'

type ArticleSeed = [id: string, title: string, category: string, tags: string[], ageDays: number, updatedBy: string, body: string, active?: boolean]

const articleSeeds: ArticleSeed[] = [
  ['ga-01', 'Sizing guide: measuring your head', 'Sizing & Fit', ['sizing', 'fit'], 12, 'Ava Martinez',
    '## Measuring\nWrap a soft tape around the head about one finger above the brows and ears.\n\n| Inches | cm | Size |\n|---|---|---|\n| 21 5/8–22 | 55–56 | S |\n| 22 3/8–22 3/4 | 57–58 | M |\n| 23 1/8–23 1/2 | 59–60 | L |\n| 23 7/8–24 1/4 | 61–62 | XL |'],
  ['ga-02', 'Between sizes: which way to go', 'Sizing & Fit', ['sizing', 'fit'], 30, 'Sam Okafor',
    'If a customer is between sizes, recommend sizing **up** for felt and straw. Every fedora ships with a foam sizing tape that takes up about half a size.'],
  ['ga-03', 'Trucker hat fit and snapback adjustment', 'Sizing & Fit', ['sizing', 'trucker'], 44, 'Sam Okafor',
    'Animal Farm truckers are one size with a snapback that fits 21.5–24 in. Kids should use the Little Goorin line.'],
  ['ga-04', 'Order status and tracking', 'Orders & Shipping', ['order-status', 'tracking'], 5, 'Ava Martinez',
    'Look up the order in Shopify by number. Share carrier and tracking link. If tracking has not moved in 3+ business days, open a carrier trace and offer a replacement after 7 days.'],
  ['ga-05', 'Holiday shipping cutoffs (last season)', 'Orders & Shipping', ['shipping'], 260, 'Ava Martinez',
    'Archived. Replaced by the current shipping times article.', false],
  ['ga-06', 'Shipping times and international delivery', 'Orders & Shipping', ['shipping', 'international'], 20, 'Ava Martinez',
    'US ground 3–5 business days. Canada 5–8 days, duties collected at checkout. UK and EU 6–10 days with DDP, so no surprise fees.'],
  ['ga-07', 'Changing an order or shipping address', 'Orders & Shipping', ['order-status', 'address'], 18, 'Sam Okafor',
    'Orders can be edited until fulfilment starts (usually within 12 hours). After that, offer a carrier redirect.'],
  ['ga-08', 'Returns policy: 30-day window', 'Returns & Exchanges', ['returns'], 9, 'Ava Martinez',
    'Unworn hats with tags can be returned within 30 days of delivery. Store purchases can be returned by mail with the receipt.'],
  ['ga-09', 'Exchanges for a different size or color', 'Returns & Exchanges', ['exchange', 'returns', 'sizing'], 9, 'Sam Okafor',
    'Exchanges are free. Send a prepaid label and ship the new size as soon as the return is scanned.'],
  ['ga-10', 'Refund approval limits', 'Returns & Exchanges', ['refund', 'returns', 'internal'], 60, 'Ava Martinez',
    'AI may approve refunds up to **$250**. Anything above needs a human with refund permission.'],
  ['ga-11', 'Damaged or defective items', 'Returns & Exchanges', ['damaged', 'replacement'], 7, 'Sam Okafor',
    'Ask for photos, apologize sincerely, and ship a replacement with expedited shipping. No need to return the damaged hat.'],
  ['ga-12', 'Custom orders and embroidery', 'Custom & Wholesale', ['custom-order'], 35, 'Ava Martinez',
    'Custom embroidery minimum is 24 units, lead time 4–6 weeks. Always hand off to a human for a quote.'],
  ['ga-13', 'Wholesale program and terms', 'Custom & Wholesale', ['wholesale'], 15, 'Ava Martinez',
    'Wholesale accounts get net-30 after the first order. Minimum opening order $1,500. Route to the wholesale desk.'],
  ['ga-14', 'Hat care: felt, wool and straw', 'Product Care', ['care'], 25, 'Sam Okafor',
    'Felt: brush counter-clockwise, let rain dry naturally crown-down on a towel. Straw: avoid soaking, reshape while damp, never use a hair dryer.'],
  ['ga-15', 'Gift cards and promo codes', 'Billing', ['gift-card', 'promo'], 40, 'Ava Martinez',
    'Gift card balances can be checked in Shopify. Newsletter codes expire 7 days after sending and do not stack.'],
]

export const guidanceArticles: GuidanceArticle[] = articleSeeds.map(([id, title, category, tags, ageDays, updatedBy, body, active = true]) => ({
  id, title, category, tags, body, active, updatedAt: daysAgo(ageDays), updatedBy,
  aiUses30d: active ? 12 + ((id.charCodeAt(id.length - 1) * 37 + title.length * 11) % 180) : 0,
  version: 1 + ((id.charCodeAt(id.length - 1) + title.length) % 6),
  history: Array.from({ length: Math.min(3, 1 + ((id.charCodeAt(id.length - 1) + title.length) % 6)) }, (_, i) => ({ version: 1 + ((id.charCodeAt(id.length - 1) + title.length) % 6) - i, editor: i === 0 ? updatedBy : 'Ava Martinez', at: daysAgo(ageDays + i * 23) })),
}))
