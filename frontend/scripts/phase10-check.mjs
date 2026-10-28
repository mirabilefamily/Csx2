// Phase 10 Modern Inbox journeys + screenshots: node scripts/phase10-check.mjs [baseUrl]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase10'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const errors = []
const log = (...a) => console.log(...a)
const txt = (p, s) => p.locator(s).first().innerText({ timeout: 3000 }).then((t) => t.replace(/\s+/g, ' ').trim()).catch(() => 'MISSING')
const has = (p, s) => p.locator(s).count().then((n) => n > 0)
let p
const step = async (name, fn) => { try { await fn() } catch (e) { log(`FAIL ${name}: ${e.message.split('\n')[0]}`); await p.screenshot({ path: `/tmp/fail10-${name.replace(/ /g, '-')}.png` }).catch(() => {}) } }

async function login(page, email = 'ava@goorin.com') {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', 'goorin123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard')
}
const go = async (path) => { await p.goto(`${BASE}${path}`); await p.waitForLoadState('networkidle'); await p.waitForTimeout(900) }
const convWidth = () => p.locator('[aria-label="Conversation"]').first().evaluate((e) => Math.round(e.getBoundingClientRect().width)).catch(() => 0)

const ctx = await browser.newContext({ viewport: { width: 1920, height: 1000 } })
p = await ctx.newPage()
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
p.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`))
await login(p)

await step('widths', async () => {
  for (const w of [1024, 1280, 1440, 1600, 1920, 2560]) {
    await p.setViewportSize({ width: w, height: 1000 })
    await go('/inbox/GB-1076')
    const docked = await p.locator('[data-testid="inbox-views-panel"]').first().isVisible().catch(() => false)
    const sidebar = await p.locator('nav[aria-label="Main"], [data-testid="sidebar"]').first().evaluate((e) => Math.round(e.getBoundingClientRect().width)).catch(() => -1)
    log(`${w}: conversation=${await convWidth()}px viewsDocked=${docked} sidebar=${sidebar}`)
    if ([1440, 1920, 1024].includes(w)) await p.screenshot({ path: `${OUT}/inbox-${w}.png` })
  }
})

await p.setViewportSize({ width: 1440, height: 900 })
await step('flyout', async () => {
  log('SKIP flyout: superseded (views flyout replaced by the docked views panel in phase 11)'); return
  await go('/inbox')
  await p.click('[data-testid="views-panel-toggle"]')
  log('flyout open:', await p.locator('[data-testid="views-flyout"]').isVisible())
  const counts = {}
  for (const id of ['mine', 'unassigned', 'all']) counts[id] = await txt(p, `[data-testid="views-flyout"] [data-testid="view-${id}"]`)
  log('default views:', JSON.stringify(counts))
  log('shared:', await txt(p, '[data-testid="views-flyout"] [data-testid="views-shared"]'))
  log('private:', await txt(p, '[data-testid="views-flyout"] [data-testid="views-private"]'))
  await p.keyboard.press('Escape')
  await p.click('[data-testid="views-flyout-backdrop"]').catch(() => {})
  log('flyout closed:', !(await has(p, '[data-testid="views-flyout"]')))
})

await step('sidebar restore', async () => {
  await go('/dashboard')
  const w = await p.locator('aside').first().evaluate((e) => Math.round(e.getBoundingClientRect().width))
  log('sidebar width after leaving inbox:', w)
})

await p.setViewportSize({ width: 1920, height: 1000 })
await step('saved view', async () => {
  await go('/inbox?saved=sv-damaged')
  log('saved view title:', await txt(p, '[data-testid="page-title"]'), '| range:', await txt(p, '[data-testid="pagination-range"]'))
  await go('/inbox?view=all')
  await p.click('[data-testid="filter-trigger"], button:has-text("Filter")').catch(() => {})
  log('save-view-button present when no filters:', await has(p, '[data-testid="save-view-button"]'))
})

await step('handover cases', async () => {
  await go('/inbox?view=needs_human')
  const ids = await p.locator('[data-testid^="ticket-link-"]').evaluateAll((els) => els.map((e) => e.dataset.testid.replace('ticket-link-', '')))
  for (const id of ids) {
    await go(`/inbox/${id}?view=needs_human`)
    const n = await p.locator('[data-testid^="message-"][data-author]:not([data-author="system"])').count()
    const full = await has(p, '[data-testid="handover-summary-text"]')
    const short = await has(p, '[data-testid="handover-summary-short"]')
    log(`${id}: messages=${n} handover=${full ? 'full' : short ? 'short' : 'none'} intent="${(await txt(p, '[data-testid="handover-intent"]')).slice(0, 70)}"`)
  }
})

await step('composer + ai', async () => {
  await go('/inbox/GB-1076')
  await p.click('[data-testid="draft-write-own"]')
  log('REQ-971 composer inside thread-column:', await p.evaluate(() => document.querySelector('[data-testid="thread-column"]').contains(document.querySelector('[data-testid="composer"]'))))
  log('send disabled empty:', await p.locator('[data-testid="composer-send"]').isDisabled())
  log('REQ-856 macro search bar:', await p.locator('[data-testid="composer-macro-search"]').count(), '| toolbar:', (await p.locator('[data-testid="composer"] button[aria-label], [data-testid="composer-link"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).join(','))
  await p.keyboard.press('Escape')
  await p.keyboard.press(process.platform === 'darwin' ? 'Meta+g' : 'Control+g')
  await p.waitForSelector('[data-testid="ask-ai-panel"]', { timeout: 3000 })
  await p.click('[data-testid="ask-ai-prompt-0"]')
  await p.waitForSelector('[data-testid="ask-ai-answer"]', { timeout: 5000 })
  log('ask ai answer:', (await txt(p, '[data-testid="ask-ai-answer"]')).slice(0, 140))
  await p.click('[data-testid="ask-ai-close"]')
})

await step('header controls', async () => {
  log('SKIP header controls: superseded (breadcrumb/team/snooze moved into the header More menu in phase 11)'); return
  await go('/inbox/GB-1076')
  log('breadcrumb:', await txt(p, '[data-testid="conversation-breadcrumb"]'))
  log('team:', await txt(p, '[data-testid="header-team"]'))
  await p.click('[data-testid="ticket-snooze"]')
  await p.click('[data-testid="snooze-24"]')
  await p.waitForTimeout(500)
  log('snoozed:', await txt(p, '[data-testid="snoozed-until"]'))
  log('ai footer count:', await p.locator('[data-testid^="ai-footer-"]').count())
})

await step('refund', async () => {
  log('SKIP refund: superseded (order actions moved into full details; covered by customer-panel-check)'); return
  await go('/inbox/GB-1076')
  const btn = p.locator('[data-testid^="order-refund-"]').first()
  const oid = (await btn.getAttribute('data-testid')).replace('order-refund-', '')
  await btn.click()
  log('refund available:', await txt(p, '[data-testid="refund-available"]'))
  const qty = p.locator('[data-testid^="refund-qty-"]').first()
  await qty.fill('1')
  log('refund total:', await txt(p, '[data-testid="refund-total"]'))
  await p.click('[data-testid="refund-submit"]')
  await p.waitForSelector('[data-testid="order-action-confirmation"]', { timeout: 4000 })
  log('refund confirmation:', await txt(p, '[data-testid="order-action-confirmation"]'))
  await p.click('[data-testid="order-action-done"]')
  await p.waitForTimeout(600)
  log(`order ${oid} payment now:`, await txt(p, `[data-testid="order-payment-${oid}"]`))
  for (const k of ['edit', 'duplicate']) {
    await p.locator(`[data-testid^="order-${k}-"]`).first().click()
    await p.click('[data-testid="order-dialog-confirm"]')
    log(`${k}:`, await txt(p, '[data-testid="order-action-confirmation"]'))
    await p.click('[data-testid="order-action-done"]')
  }
})

await step('tags', async () => {
  log('SKIP tags: superseded (tag editing moved into full details in phase 11)'); return
  await go('/inbox/GB-1076')
  await p.click('[data-testid="ticket-tag-add"]')
  await p.fill('[data-testid="ticket-tag-input"]', 'vip')
  await p.keyboard.press('Enter')
  await p.waitForSelector('[data-testid="ticket-tag-vip"]', { timeout: 4000 }).catch(() => {})
  if (await has(p, '[data-testid="ticket-tags-overflow"]')) await p.click('[data-testid="ticket-tags-overflow"]')
  log('tag vip added:', await has(p, '[data-testid="ticket-tag-vip"]'))
})

await step('seeds', async () => {
  await go('/inbox/GB-1064')
  log('GB-1064 fraud banner:', await has(p, '[data-testid^="fraud-banner"]'))
})

const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const pp = await ph.newPage()
pp.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await login(pp)
await pp.goto(`${BASE}/inbox/GB-1076`); await pp.waitForTimeout(1200)
await pp.screenshot({ path: `${OUT}/inbox-390.png` })
await pp.goto(`${BASE}/inbox`); await pp.waitForTimeout(900)
await pp.screenshot({ path: `${OUT}/inbox-list-390.png` })
log('phone overflow:', await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth))

log('console errors:', errors.length, JSON.stringify(errors.slice(0, 5)))
await browser.close()
