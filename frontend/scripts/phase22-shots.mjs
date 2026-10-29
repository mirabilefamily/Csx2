// Phase 22 inbox shots: node scripts/phase22-shots.mjs [baseUrl] → /app/memory/shots/phase22/
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase22'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const login = async (p) => { await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard') }
const go = async (p, u) => { await p.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')) }, u); await p.waitForTimeout(1400) }
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` })
const w = (p, id) => p.evaluate((x) => Math.round(document.querySelector(`[data-testid="${x}"]`)?.getBoundingClientRect().width ?? 0), id)
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await login(p)
await go(p, '/inbox?folder=needs-you'); await shot(p, 'inbox-list-1440')
console.log('sidebar collapsed on inbox:', await p.getAttribute('[data-testid="sidebar"]', 'data-collapsed'))
await go(p, '/inbox/GB-1076?folder=needs-you'); await p.evaluate(() => document.querySelector('[data-testid="thread-scroll"]')?.scrollTo(0, 0)); await p.waitForTimeout(300); await shot(p, 'ticket-1440')
console.log('1440 thread column:', await w(p, 'thread-scroll'), 'panel:', await w(p, 'customer-panel'))
await p.click('[data-testid="past-show-all"]'); await p.waitForTimeout(500); await shot(p, 'timeline-sheet-1440')
const x = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage(); await login(x)
await go(x, '/inbox/GB-1076?folder=needs-you'); await shot(x, 'ticket-1920')
console.log('1920 list:', await w(x, 'ticket-list-section'), 'thread:', await w(x, 'thread-scroll'))
const t = await (await b.newContext({ viewport: { width: 1024, height: 768 } })).newPage(); await login(t)
await go(t, '/inbox/GB-1076?folder=needs-you'); await shot(t, '1024')
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); await login(m)
await go(m, '/inbox'); await shot(m, 'folders-390')
await go(m, '/inbox/GB-1076?folder=needs-you'); await shot(m, 'ticket-390')
console.log('overflow 390:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await b.close()
console.log('saved', OUT)
