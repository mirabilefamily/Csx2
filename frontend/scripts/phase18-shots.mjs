// Phase 18 screenshots: OUT=/dir node scripts/phase18-shots.mjs [baseUrl]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const OUT = process.env.OUT ?? '/app/memory/shots/phase18'
mkdirSync(OUT, { recursive: true })
const CS = [
  ['channels-chat', '/channels/chat'], ['channels-form', '/channels/form'], ['channels-email', '/channels/email'], ['channels-install', '/channels/install'],
  ['settings-account', '/settings/account'], ['settings-users', '/settings/users'], ['settings-integrations', '/settings/integrations'], ['settings-csat', '/settings/csat'],
  ['integration-outlook', '/settings/integrations/outlook'],
]
const OTHER = [['dashboard', '/dashboard'], ['inbox', '/inbox'], ['ai-voice', '/ai/voice'], ['ai-replies', '/ai/replies'], ['ai-workflows', '/ai/workflows'], ['ai-testing', '/ai/testing'], ['guidance', '/guidance']]
const ALL = process.env.ALL === '1'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] })
for (const w of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, ...(w === 390 ? { isMobile: true, hasTouch: true } : {}) })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/login`)
  await p.fill('input[type=email]', 'ava@goorin.com')
  await p.fill('input[type=password]', 'goorin123')
  await p.getByRole('button', { name: 'Sign in' }).click()
  await p.waitForURL('**/dashboard')
  const routes = w === 1440 || ALL ? [...CS, ...OTHER] : CS
  for (const [name, url] of routes) {
    await p.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')) }, url)
    await p.waitForTimeout(1500)
    await p.screenshot({ path: `${OUT}/${name}-${w}.png` })
  }
  await ctx.close()
}
await browser.close()
console.log('shots saved to', OUT)
