// Accessibility + tablet + console audit: node scripts/audit.mjs [baseUrl]
// Runs axe (WCAG 2.1 A/AA) on every route, checks horizontal overflow at 768/1024 and collects console errors.
import { chromium } from 'playwright-core'
import { AxeBuilder } from '@axe-core/playwright'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'
const ROUTES = [
  ['/login', false],
  ['/dashboard', true],
  ['/inbox/GB-1076', true],
  ['/guidance?tab=articles', true],
  ['/guidance?tab=import', true],
  ['/ai/voice', true],
  ['/ai/testing', true],
  ['/ai/workflows', true],
  ['/ai/workflows/wf-order-tracking', true],
  ['/channels/chat', true],
  ['/channels/chat?kind=form', true],
  ['/channels/email', true],
  ['/settings/account', true],
  ['/settings/csat', true],
  ['/inbox?view=trash', true],
  ['/settings/integrations', true],
  ['/settings/integrations/claude', true],
  ['/ai/replies', true],
  ['/settings/integrations/loop', true],
  ['/channels/install', true],
  ['/settings/users', true],
  ['/styleguide', false],
  ['/widget-demo', false, 'open'],
  ['/widget-demo/theme-editor', false],
  ['/survey/tok_GB1066', false],
]

const FOCUS_CHECK = () => {
  let el = document.activeElement
  while (el?.shadowRoot?.activeElement && el.tagName !== 'INPUT') el = el.shadowRoot.activeElement
  if (!el || el === document.body) return null
  const cs = getComputedStyle(el)
  const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !cs.outlineColor.includes('0)') && cs.outlineColor !== 'transparent'
  const ring = cs.boxShadow && cs.boxShadow !== 'none'
  // Native time/date pickers: the clock button's ring lives on ::-webkit-calendar-picker-indicator (index.css),
  // which getComputedStyle can't read. Verified by screenshot (test_reports/phase6/time-picker-focus.png).
  const picker = el.tagName === 'INPUT' && /time|date/.test(el.type)
  const id = el.getAttribute('data-testid') || el.getAttribute('aria-label') || `${el.tagName.toLowerCase()}.${(el.className?.toString?.() ?? '').split(' ')[0]}`
  return outline || ring || picker ? null : id
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('crash', () => console.log('PAGE CRASHED at', page.url()))
const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`${page.url()} :: ${m.text()}`))
page.on('pageerror', (e) => consoleErrors.push(`${page.url()} :: ${e.message}`))

await page.goto(`${BASE}/login`)
await page.fill('input[type=email]', 'ava@goorin.com')
await page.fill('input[type=password]', 'goorin123')
await page.getByRole('button', { name: 'Sign in' }).click()
await page.waitForURL('**/dashboard')

const results = []
for (const [route, signedIn, action] of ROUTES.filter(([r]) => !process.env.AUDIT_ONLY || r.startsWith(process.env.AUDIT_ONLY))) {
  if (process.env.AUDIT_VERBOSE) console.log('route', route)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}${route}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  if (action === 'open') {
    await page.locator('[data-testid=widget-launcher]').click()
    await page.waitForTimeout(800)
  }
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const bad = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  const noRing = []
  await page.evaluate(() => document.activeElement?.blur?.())
  for (let t = 0; t < 30; t++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(170)
    let r = await page.evaluate(FOCUS_CHECK)
    if (r) { await page.waitForTimeout(300); r = await page.evaluate(FOCUS_CHECK) }
    if (r) noRing.push(r)
  }
  const overflow = {}
  if (signedIn)
    for (const w of [768, 1024]) {
      await page.setViewportSize({ width: w, height: 900 })
      await page.waitForTimeout(400)
      overflow[w] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    }
  results.push({ route, noRing: [...new Set(noRing)], serious: bad.reduce((n, v) => n + v.nodes.length, 0), rules: bad.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`), overflow })
}
await browser.close()

for (const r of results) {
  console.log(`${r.route.padEnd(28)} serious/critical nodes: ${r.serious}  overflow: ${JSON.stringify(r.overflow)}`)
  for (const x of r.rules) console.log(`    - ${x}`)
  if (r.noRing.length) console.log(`    focus without visible ring: ${r.noRing.join(', ')}`)
}
console.log(`\nTOTAL serious/critical nodes: ${results.reduce((n, r) => n + r.serious, 0)}`)
console.log(`Console errors: ${consoleErrors.length}`)
for (const e of [...new Set(consoleErrors)].slice(0, 30)) console.log(`    ! ${e}`)
