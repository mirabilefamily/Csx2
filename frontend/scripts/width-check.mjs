// Full-width check (REQ-497..502): overflow + main width + console errors at wide viewports. node scripts/width-check.mjs [baseUrl]
import { chromium } from 'playwright-core'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const ROUTES = ['/dashboard', '/ai/workflows', '/ai/workflows/wf-order-tracking', '/inbox/GB-1076', '/guidance', '/ai/testing', '/ai/voice', '/channels/email', '/channels/chat?kind=form', '/settings/account', '/settings/csat', '/settings/integrations', '/settings/integrations/shopify', '/channels/chat', '/ai/replies', '/settings/users', '/styleguide', '/widget-demo', '/widget-demo/theme-editor', '/survey/tok_GB1066', '/nope']
const SHOTS = { 1920: ['/dashboard', '/settings/integrations', '/guidance', '/widget-demo', '/inbox/GB-1076'], 2560: ['/dashboard', '/channels/chat'] }
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const errors = []
for (const w of [1280, 1440, 1920, 2560]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1000 } })
  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && errors.push(`${w}: ${m.text()}`))
  await p.goto(`${BASE}/login`)
  await p.fill('input[type=email]', 'ava@goorin.com')
  await p.fill('input[type=password]', 'goorin123')
  await p.getByRole('button', { name: 'Sign in' }).click()
  await p.waitForURL('**/dashboard')
  const out = []
  for (const r of ROUTES) {
    await p.goto(`${BASE}${r}`)
    await p.waitForTimeout(1300)
    const m = await p.evaluate(() => {
      const main = document.querySelector('main')
      const tiles = document.querySelectorAll('[data-testid^=integration-tile-]')
      const cols = tiles.length ? new Set([...tiles].map((t) => Math.round(t.getBoundingClientRect().top))).size : 0
      return { over: document.documentElement.scrollWidth - window.innerWidth, main: main ? Math.round(main.getBoundingClientRect().width) : 0, rows: cols }
    })
    out.push(`${r}:${m.over > 0 ? `OVERFLOW+${m.over}` : 'ok'}${r === '/settings/integrations' ? `(tile rows ${m.rows})` : ''} main=${m.main}`)
    if (SHOTS[w]?.includes(r)) await p.waitForTimeout(1800), await p.screenshot({ path: `/tmp/w${w}${r.replace(/[/?=]/g, '_')}.png` })
  }
  console.log(w, out.join(' | '))
  await ctx.close()
}
console.log('console errors:', errors.length, errors.slice(0, 3).join(' | '))
await browser.close()
