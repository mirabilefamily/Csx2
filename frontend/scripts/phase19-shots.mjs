// Phase 19 shots: node scripts/phase19-shots.mjs [baseUrl] → /app/memory/shots/phase19/
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase19'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const page = async (w, h, mobile = false) => {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })).newPage()
  await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard')
  await p.evaluate(() => { history.pushState({}, '', '/ai/testing'); dispatchEvent(new PopStateEvent('popstate')) }); await p.waitForSelector('[data-testid="test-empty"]'); await p.waitForTimeout(500)
  return p
}
const p = await page(1440, 900)
await p.screenshot({ path: `${OUT}/empty-1440.png` })
await p.click('[data-testid="test-customer"]'); await p.click('[data-testid="test-customer-c01"]')
await p.click('[data-testid="test-empty-sizing"]'); await p.waitForSelector('[data-testid="test-turn-insight-1"]')
await p.fill('[data-testid="sandbox-question"]', 'Is the 7 3/8 more of a snug fit?'); await p.press('[data-testid="sandbox-question"]', 'Enter'); await p.waitForSelector('[data-testid="test-turn-insight-3"]'); await p.waitForTimeout(500)
await p.screenshot({ path: `${OUT}/chat-inspector-1440.png` })
await p.click('[data-testid="test-reset"]'); await p.click('[data-testid="test-empty-tracking"]'); await p.waitForSelector('[data-testid="test-turn-insight-1"]'); await p.waitForTimeout(500)
await p.screenshot({ path: `${OUT}/workflow-detect-1440.png` })
await p.click('[data-testid="test-run-all"]'); await p.waitForSelector('[data-testid="test-runall-table"]', { timeout: 20000 }); await p.waitForTimeout(400)
await p.screenshot({ path: `${OUT}/scorecard-1440.png` })
const s = await page(1100, 800)
await s.click('[data-testid="test-empty-damaged"]'); await s.waitForSelector('[data-testid="test-turn-insight-1"]'); await s.click('[data-testid="test-insight-toggle-1"]'); await s.waitForSelector('[data-testid="test-inspector-sheet"]'); await s.waitForTimeout(500)
await s.screenshot({ path: `${OUT}/1024-sheet.png` })
const m = await page(390, 844, true)
await m.click('[data-testid="test-empty-returns"]'); await m.waitForSelector('[data-testid="test-turn-insight-1"]'); await m.click('[data-testid="test-insight-toggle-1"]'); await m.waitForTimeout(500)
await m.screenshot({ path: `${OUT}/390.png` })
await b.close()
console.log('saved', OUT)
