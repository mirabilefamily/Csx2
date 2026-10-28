// JRN-218 inbox shots: node scripts/phase18-inbox-shots.mjs [baseUrl] → /app/memory/shots/phase18/fill/
import { chromium } from 'playwright-core'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase18/fill'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const login = async (p) => { await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard') }
const go = async (p, u) => { await p.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')) }, u); await p.waitForTimeout(1400) }
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await login(p)
await go(p, '/inbox/GB-1076')
await p.screenshot({ path: `${OUT}/inbox-reply-1440.png` })
await p.locator('[data-testid="thread-scroll"]').evaluate((e) => { e.scrollTop = 0 }); await p.waitForTimeout(500)
await p.screenshot({ path: `${OUT}/inbox-reply-scrolled-1440.png` })
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage(); await login(m)
await go(m, '/inbox/GB-1076')
await m.screenshot({ path: `${OUT}/inbox-390.png` })
await b.close()
console.log('saved', OUT)
