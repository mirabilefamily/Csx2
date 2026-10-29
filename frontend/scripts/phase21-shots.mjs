// Phase 21 inbox shots: node scripts/phase21-shots.mjs [baseUrl] → /app/memory/shots/phase21/
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase21'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const login = async (p) => { await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard') }
const go = async (p, u) => { await p.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')) }, u); await p.waitForTimeout(1400) }
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` })
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await login(p)
await go(p, '/inbox/GB-1076?view=needs_you'); await shot(p, 'list-thread-1440')
await p.click('[data-testid="customer-toggle"]'); await p.waitForTimeout(500); await shot(p, 'customer-open-1440')
await p.click('[data-testid="customer-toggle"]')
await go(p, '/inbox?view=ai_handling'); await p.locator('[data-testid^="ticket-link-"]').first().click(); await p.waitForTimeout(1200); await shot(p, 'ai-handling-1440')
const t = await (await b.newContext({ viewport: { width: 1024, height: 768 } })).newPage(); await login(t)
await go(t, '/inbox/GB-1076?view=needs_you'); await t.click('[data-testid="customer-toggle"]'); await t.waitForTimeout(500); await shot(t, '1024')
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); await login(m)
await go(m, '/inbox?view=needs_you'); await shot(m, 'list-390')
await go(m, '/inbox/GB-1076?view=needs_you'); await shot(m, 'thread-390')
console.log('overflow 390:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await b.close()
console.log('saved', OUT)
