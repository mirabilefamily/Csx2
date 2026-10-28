// Phase 20 CSAT preview shots: node scripts/phase20-shots.mjs [baseUrl] → /app/memory/shots/phase20/
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase20'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const page = async (w, h, mobile = false) => {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })).newPage()
  p.on('pageerror', (e) => console.log('pageerror', e.message))
  await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard')
  await p.evaluate(() => { history.pushState({}, '', '/settings/csat'); dispatchEvent(new PopStateEvent('popstate')) }); await p.waitForSelector('[data-testid="survey-preview"]', { state: 'attached' }); await p.waitForTimeout(600)
  if (mobile) { await p.click('[data-testid="csat-preview-pane-toggle"]'); await p.waitForTimeout(400) }
  return p
}
const shot = async (p, n) => { await p.locator('[data-testid="csat-preview-canvas"]').scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${n}.png` }) }
const p = await page(1440, 900)
await shot(p, 'chat-rating-1440')
await p.click('[data-testid="csat-chat-rating-5"]'); await p.waitForTimeout(300)
await shot(p, 'chat-followup-1440')
await p.click('[data-testid="csat-chat-option-Speed"]'); await p.fill('[data-testid="csat-chat-input"]', 'Keep the overnight swaps!'); await p.click('[data-testid="csat-chat-send"]'); await p.waitForTimeout(300)
await shot(p, 'chat-thanks-1440')
await p.click('[data-testid="csat-preview-email"]'); await p.waitForTimeout(300)
await shot(p, 'email-1440')
await p.click('[data-testid="csat-email-rating-4"]'); await p.waitForTimeout(300)
await shot(p, 'survey-page-1440')
await p.click('[data-testid="csat-style-emoji"]'); await p.click('[data-testid="csat-preview-chat"]'); await p.waitForTimeout(300)
await shot(p, 'emoji-style-1440')
await p.locator('[data-testid="csat-messages"]').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/messages-1440.png` })
const m = await page(390, 844, true)
await m.locator('[data-testid="csat-preview-canvas"]').scrollIntoViewIfNeeded(); await m.waitForTimeout(300)
await m.screenshot({ path: `${OUT}/csat-390.png`, fullPage: false })
console.log('overflow 390:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await b.close()
console.log('saved', OUT)
