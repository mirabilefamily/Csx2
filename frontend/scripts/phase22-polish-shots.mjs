// Phase 22 polish shots: node scripts/phase22-polish-shots.mjs [baseUrl] → /app/memory/shots/phase22/polish/
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase22/polish'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const login = async (p) => { await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard') }
const go = async (p, u) => { await p.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')) }, u); await p.waitForTimeout(1400) }
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` })
const w = (p, id) => p.evaluate((x) => Math.round(document.querySelector(`[data-testid="${x}"]`)?.getBoundingClientRect().width ?? 0), id)
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await login(p)
await go(p, '/inbox?folder=needs-you'); await p.hover('[data-testid="ticket-list"] li:nth-child(3)'); await shot(p, 'inbox-list-1440')
await p.click('[data-testid="select-group-overdue"]', { force: true }); await p.waitForTimeout(300); await shot(p, 'inbox-list-1440-selected')
console.log('selected bar:', await p.textContent('[data-testid="bulk-count"]'))
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await go(p, '/inbox/GB-1076?folder=needs-you'); await p.evaluate(() => document.querySelector('[data-testid="thread-scroll"]')?.scrollTo(0, 0)); await p.waitForTimeout(300)
await shot(p, 'ticket-1440'); await shot(p, 'ticket-1440-panel-open')
console.log('1440 thread:', await w(p, 'thread-scroll'), 'panel:', await w(p, 'customer-panel'), 'rail:', await w(p, 'customer-rail'))
await p.click('[data-testid="rail-toggle"]'); await p.waitForTimeout(500); await shot(p, 'ticket-1440-panel-closed')
await p.click('[data-testid="rail-ask"]'); await p.waitForTimeout(500); await shot(p, 'ticket-1440-ask-ai')
await p.click('[data-testid="rail-customer"]'); await p.waitForTimeout(400); await shot(p, 'ticket-1440-customer')
await p.click('[data-testid="rail-shopify"]'); await p.waitForTimeout(400); await shot(p, 'ticket-1440-shopify')
await p.click('[data-testid="rail-loop"]'); await p.waitForTimeout(400); await shot(p, 'ticket-1440-loop')
await p.click('[data-testid="rail-loop"]'); await p.waitForTimeout(400); console.log('active click collapses:', !(await p.$('[data-testid="customer-panel"]')))
await p.click('[data-testid="rail-customer"]'); await p.waitForTimeout(300)
const x = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); await login(x)
await go(p, '/settings/integrations'); await shot(p, 'settings-integrations-1440')
await go(x, '/inbox/GB-1076?folder=needs-you'); await shot(x, 'ticket-1920')
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); await login(m)
await go(m, '/inbox'); await shot(m, 'folders-390')
console.log('overflow 390:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await b.close()
console.log('saved', OUT)
