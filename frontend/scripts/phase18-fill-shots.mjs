// REQ-956..960 fill shots: node scripts/phase18-fill-shots.mjs [baseUrl] → /app/memory/shots/phase18/fill/
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:3000'
const OUT = '/app/memory/shots/phase18/fill'
mkdirSync(OUT, { recursive: true })
const R = [['chat', '/channels/chat'], ['contact-form', '/channels/form'], ['email', '/channels/email'], ['account', '/settings/account'], ['csat', '/settings/csat'], ['brand-voice', '/ai/voice'], ['office365', '/settings/integrations/outlook']]
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
for (const [w, h, mobile] of [[1440, 900, false], [1920, 1080, false], [390, 844, true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })).newPage()
  await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard')
  for (const [name, url] of R) {
    if (w === 390 && !['chat', 'account'].includes(name)) continue
    await p.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')) }, url); await p.waitForTimeout(1500)
    if (name === 'chat' && w > 1000) { const look = p.locator('[data-testid="ws-section-branding"] button').first(); if ((await look.getAttribute('aria-expanded')) !== 'true') await look.click(); await p.waitForTimeout(400) }
    await p.screenshot({ path: `${OUT}/${name}-${w}.png` })
    if (name === 'chat' && w > 1000) {
      for (const v of ['home', 'active_chat']) {
        await p.click(`[data-testid="preview-view-${v}"]`); await p.waitForTimeout(700)
        await p.locator('[data-testid="preview-canvas-wrap"]').scrollIntoViewIfNeeded(); await p.waitForTimeout(300)
        await p.screenshot({ path: `${OUT}/chat-preview-${v === 'home' ? 'home' : 'conversation'}-${w}x${h}.png` })
      }
      await p.evaluate(() => scrollTo(0, 0))
    }
  }
  await p.context().close()
}
await b.close()
console.log('saved', OUT)
