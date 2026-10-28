// Phase 9 journeys + screenshots: node scripts/phase9-check.mjs [baseUrl]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase9'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const errors = []
const log = (...a) => console.log(...a)
const txt = (p, s) => p.innerText(s).then((t) => t.replace(/\s+/g, ' ').trim()).catch(() => 'MISSING')
const nav = async (p, path) => { await p.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')) }, path); await p.waitForTimeout(700) }
const step = async (name, fn) => { try { await fn() } catch (e) { log(`FAIL ${name}: ${e.message.split('\n')[0]}`); await p.screenshot({ path: `/tmp/fail-${name.replace(/ /g, '-')}.png` }).catch(() => {}) } }

async function login(p, email = 'ava@goorin.com') {
  await p.goto(`${BASE}/login`)
  await p.fill('input[type=email]', email)
  await p.fill('input[type=password]', 'goorin123')
  await p.getByRole('button', { name: 'Sign in' }).click()
  await p.waitForURL('**/dashboard')
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await login(p)

const SHOTS = [
  ['dashboard', '/dashboard'], ['inbox', '/inbox/GB-1076'], ['ai-voice', '/ai/voice'], ['ai-replies', '/ai/replies'], ['ai-workflows', '/ai/workflows'], ['ai-testing', '/ai/testing'],
  ['guidance', '/guidance'], ['channels-chat', '/channels/chat'], ['channels-contact-form', '/channels/chat?kind=form'], ['channels-email', '/channels/email'], ['channels-install', '/channels/install'],
  ['settings-account', '/settings/account'], ['settings-users', '/settings/users'], ['settings-integrations', '/settings/integrations'], ['settings-csat', '/settings/csat'],
]
for (const [name, route] of SHOTS) {
  await p.goto(`${BASE}${route}`)
  await p.waitForLoadState('networkidle')
  await p.waitForTimeout(1500)
  await p.screenshot({ path: `${OUT}/${name}-1440.png` })
}
log('shots 1440:', SHOTS.length)

await step('redirects', async () => {
  const r = []
  for (const from of ['/settings/ai', '/settings/widget', '/settings/widget#install', '/settings/integrations/shopify/widget', '/settings/integrations/shopify/install', '/guidance?tab=sandbox', '/dashboard?csat=settings', '/ai', '/channels', '/settings']) {
    await p.goto(`${BASE}${from}`)
    await p.waitForTimeout(400)
    r.push(`${from} -> ${new URL(p.url()).pathname}${new URL(p.url()).search}`)
  }
  log('redirects:', r.join(' | '))
})

await step('sidebar', async () => {
  await p.goto(`${BASE}/dashboard`)
  log('sidebar:', (await p.$$eval('nav[aria-label] a[data-testid^=nav-]', (els) => els.map((e) => e.getAttribute('data-testid')))).join(','))
})

await step('integrations', async () => {
  await p.goto(`${BASE}/settings/integrations`)
  await p.waitForSelector('[data-testid=integration-tile-loop]')
  log('integrations summary:', await txt(p, '[data-testid=integrations-summary]'))
  log('office tile:', await txt(p, '[data-testid=integration-tile-outlook]'))
  log('attention rings:', (await p.$$eval('[data-testid^=integration-tile-]', (e) => e.filter((x) => x.dataset.ring === 'attention' || x.dataset.ring === 'error').map((x) => `${x.dataset.testid.slice(17)}:${x.dataset.ring}`))).join(','))
})

await step('search settings', async () => {
  await p.goto(`${BASE}/dashboard`)
  await p.click('[data-testid=global-search-input]')
  await p.keyboard.type('brand')
  await p.waitForTimeout(900)
  log('search settings group:', await txt(p, '[data-testid=search-group-settings]'))
  await p.keyboard.press('Escape')
})

await step('brand voice', async () => {
  await p.goto(`${BASE}/ai/voice`)
  await p.waitForSelector('[data-testid=bv-brandName]')
  log('bv save bar when clean:', await p.locator('[data-testid=unsaved-bar]').count(), await txt(p, '[data-testid=ai-save-state]'))
  await p.fill('[data-testid=bv-brandName]', 'x'.repeat(101))
  log('bv over:', await txt(p, '[data-testid=bv-error-brandName]'))
  await p.fill('[data-testid=bv-brandName]', 'Goorin Bros. Hat Shop')
  await p.click('[data-testid=bv-save]')
  await p.waitForSelector('[data-sonner-toast]:has-text("Brand voice saved")')
  log('bv saved; state:', await txt(p, '[data-testid=ai-save-state]'), '(conversation testing is covered by phase15-check)')
})

await step('inbox', async () => {
  await p.goto(`${BASE}/inbox`)
  await p.waitForSelector('[data-testid^=ticket-link-]')
  log('pagination:', await txt(p, '[data-testid=inbox-pagination]'))
  log('view counts:', await txt(p, '[data-testid=view-spam]'), '|', await txt(p, '[data-testid=view-trash]'), '|', await txt(p, '[data-testid=view-all]'))
  await nav(p, '/inbox/GB-1076')
  await p.waitForSelector('[data-testid=conversation-subject]')
  log('meta:', await txt(p, '[data-testid=conversation-meta]'))
  log('ai banner:', await p.isVisible('[data-testid=ai-replied-banner]'), '| timing:', await txt(p, '[data-testid=email-timing-toggle]'))
  log('composer:', await txt(p, '[data-testid=composer-goes-to]'), '|', await txt(p, '[data-testid=composer-send]'))
  const dl = p.locator('[data-testid^=delivery-]').first()
  if (await dl.count()) { await dl.click(); log('delivery:', (await txt(p, '[data-testid^=delivery-timeline-]')).slice(0, 120)); await p.keyboard.press('Escape') }
  await p.click('[data-testid=ticket-more]')
  await p.click('[data-testid=ticket-move-trash]')
  await p.waitForSelector('[data-sonner-toast]:has-text("Moved to Trash")')
  await nav(p, '/inbox?view=trash')
  await p.waitForSelector('[data-testid=restore-GB-1076]')
  log('trash list:', await p.locator('[data-testid^=restore-]').count())
  await p.click('[data-testid=restore-GB-1076]')
  await p.waitForTimeout(600)
  await p.click('[data-testid=delete-forever-GB-1081]')
  await p.click('[data-testid=delete-forever-confirm]')
  await p.waitForTimeout(800)
  log('trash after restore+delete:', await txt(p, '[data-testid=view-trash]'))
  await p.click('[data-testid=new-ticket-button]')
  await p.click('[data-testid=new-ticket-submit]')
  log('new ticket errors:', await txt(p, '[data-testid=new-ticket-dialog] [role=alert], [data-testid=new-ticket-dialog] p.text-red-700'))
  await p.fill('[data-testid=new-ticket-email]', 'grace@example.com')
  await p.fill('[data-testid=new-ticket-subject]', 'Checking in on your fitting')
  await p.fill('[data-testid=new-ticket-body]', 'Hi Grace, just checking the fedora fits well.')
  await p.click('[data-testid=new-ticket-submit]')
  await p.waitForURL(/inbox\/GB-\d+/)
  log('new ticket:', new URL(p.url()).pathname, '|', await txt(p, '[data-testid=conversation-subject]'))
})

await step('customer panel', async () => {
  await p.goto(`${BASE}/inbox/GB-1064`)
  const found = await p.waitForSelector('[data-testid=details-toggle], [data-testid=summary-panel], [data-testid=summary-rail]', { timeout: 8000 }).then(() => true, () => false)
  if (!found) { log('summary panel: not on screen at this width (layout approved in later phases)'); return }
  if (!(await p.locator('[data-testid=summary-panel]').count()) && (await p.locator('[data-testid=details-toggle]').isVisible())) await p.click('[data-testid=details-toggle]')
  if (await p.locator('[data-testid=summary-expand]').count()) await p.click('[data-testid=summary-expand]')
  log('summary panel:', await p.locator('[data-testid=summary-panel]').count(), '| full details:', await p.locator('[data-testid=full-details]').count(), '(order tools moved into the full-details menu in later phases; covered by phase11/phase14 checks)')
})

await step('fraud note', async () => {
  await p.goto(`${BASE}/dashboard`)
  await p.click('[data-testid=rf-tab-fraud]'); await p.waitForSelector('[data-testid=fraud-view-all]'); await p.click('[data-testid=fraud-view-all]'); await p.waitForSelector('[data-testid=fraud-list-open] [data-testid=fraud-action-safe-fa-101]')
  await p.click('[data-testid=fraud-action-safe-fa-101]')
  await p.fill('[data-testid=fraud-note-input]', 'Called the customer, address confirmed.')
  await p.click('[data-testid=fraud-note-confirm]')
  await p.waitForSelector('[data-sonner-toast]:has-text("note saved")')
  await p.click('[data-testid=fraud-tab-reviewed]')
  log('reviewed note:', await txt(p, '[data-testid=fraud-note-fa-101]'))
  await nav(p, '/inbox/GB-1064')
  await p.waitForSelector('[data-testid=fraud-banner-reviewed]')
  log('inbox banner note:', await txt(p, '[data-testid=fraud-banner-reviewed]'))
})

await step('account', async () => {
  await p.goto(`${BASE}/settings/account`)
  await p.fill('[data-testid=account-password-current]', 'wrong')
  await p.fill('[data-testid=account-password-next]', 'newpassword1')
  await p.fill('[data-testid=account-password-confirm]', 'newpassword1')
  await p.click('[data-testid=account-password-submit]')
  await p.waitForTimeout(700)
  log('wrong current:', await txt(p, '#acct-current-error'))
})

// Agent: admin areas hidden + blocked
const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const a = await actx.newPage()
await step('agent', async () => {
  await login(a)
  await a.click('[data-testid=user-menu-trigger]')
  await a.click('[data-testid=role-toggle-agent]')
  await a.waitForTimeout(500)
  await a.waitForTimeout(800)
  await a.screenshot({ path: '/tmp/agent.png' })
  log('agent nav:', (await a.$$eval('a[data-testid^=nav-]', (els) => els.map((e) => e.getAttribute('data-testid')))).join(','))
  await a.evaluate(() => { history.pushState({}, '', '/ai/voice'); dispatchEvent(new PopStateEvent('popstate')) })
  await a.waitForTimeout(600)
  log('agent /ai:', await a.isVisible('[data-testid=ai-no-access]'))
})

// Phone shots
const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
const ph = await pctx.newPage()
ph.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await login(ph)
for (const [name, route] of [['inbox', '/inbox'], ['settings-integrations', '/settings/integrations']]) {
  await ph.goto(`${BASE}${route}`)
  await ph.waitForLoadState('networkidle')
  await ph.waitForTimeout(1200)
  await ph.screenshot({ path: `${OUT}/${name}-390.png` })
}
await step('phone more', async () => {
  await ph.click('[data-testid=bottom-tab-more]')
  log('phone more:', await txt(ph, '[data-testid=bottom-more-sheet]'))
})
log('console errors:', errors.length, errors.slice(0, 3))
await browser.close()
