// REQ-466: the bottom tab bar hides in full-screen phone editors. node scripts/tabbar-check.mjs [baseUrl]
import { chromium } from 'playwright-core'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const bar = () => p.locator('[data-testid=bottom-tab-bar]').count()
await p.goto(`${BASE}/login`)
await p.fill('input[type=email]', 'ava@goorin.com')
await p.fill('input[type=password]', 'goorin123')
await p.getByRole('button', { name: 'Sign in' }).click()
await p.waitForURL('**/dashboard')
const out = []
for (const [route, open, ready] of [
  ['/guidance', '[data-testid=new-article]', '[data-testid=article-editor], textarea'],
  ['/guidance', '[data-testid=guidance-io-menu]', '[data-testid=csv-import-dialog]'],
]) {
  await p.goto(`${BASE}${route}`)
  await p.waitForSelector(open)
  const before = await bar()
  await p.click(open)
  if (open.includes('io-menu')) await p.click('[data-testid=guidance-import]')
  await p.waitForSelector(ready)
  await p.waitForTimeout(300)
  const during = await bar()
  await p.keyboard.press('Escape')
  out.push(`${route} ${open}: bar before=${before} during=${during}`)
}
await p.goto(`${BASE}/dashboard`)
await p.waitForSelector('[data-testid=bottom-tab-bar]')
out.push(`dashboard after: bar=${await bar()}`)
console.log(out.join('\n'))
await browser.close()
