// REQ-961..967 widget look shots: node scripts/phase18-widget-shots.mjs [baseUrl] → /app/memory/shots/phase18/fill/
import { chromium } from 'playwright-core'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase18/fill'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const wait = (p, ms) => p.waitForTimeout(ms)
const converse = async (p) => {
  for (const q of ['Is the Hampton Wool Fedora water resistant, and how do I care for a felt hat?', 'Do you ship to Canada and how long does it take?', 'Great, thank you!']) {
    await p.fill('[data-testid="widget-composer-input"]', q); await p.press('[data-testid="widget-composer-input"]', 'Enter'); await wait(p, 2600)
  }
  await p.locator('[data-testid="widget-thumb-up"]').first().click(); await wait(p, 200)
  await p.locator('[data-testid="widget-body"]').evaluate((e) => { e.scrollTop = 0 }); await wait(p, 400)
}
for (const [w, h, mobile, names] of [[1920, 1080, false, ['home', 'conversation']], [1440, 900, false, ['home', 'conversation']], [390, 844, true, ['home', 'conversation']]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })).newPage()
  await p.goto(`${BASE}/widget-demo`); await wait(p, 1500)
  await p.click('[data-testid="widget-launcher"]'); await wait(p, 700)
  const tag = w === 1440 ? '1440x900' : String(w)
  if (names.includes('home')) await p.screenshot({ path: `${OUT}/widget-${w === 390 ? '390' : `home-${tag}`}.png` })
  await converse(p)
  console.log(w, 'panel', await p.locator('[data-testid="widget-panel"]').evaluate((e) => `${Math.round(e.getBoundingClientRect().height)}h r${getComputedStyle(e).borderTopLeftRadius} bg ${getComputedStyle(e).backgroundColor}`), '| latest btn', await p.locator('[data-testid="widget-scroll-latest"]').count())
  await p.screenshot({ path: `${OUT}/widget-conversation-${tag}.png` })
  await p.context().close()
}
await b.close()
console.log('saved', OUT)
