// Phase 16 screenshots. node scripts/phase16-shots.mjs [baseUrl]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:3000'
const OUT = '/app/memory/shots/phase16'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })).newPage()
  await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard')
  const go = async (u) => { await p.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')) }, u); await p.waitForTimeout(1400) }
  for (const [name, url, act] of [
    ['list', '/ai/workflows'], ['editor-damaged', '/ai/workflows/wf-damaged'], ['editor-restock', '/ai/workflows/wf-restock'],
    ['runs-damaged', '/ai/workflows/wf-damaged?tab=runs'], ['versions-order-tracking', '/ai/workflows/wf-order-tracking?tab=versions'],
    ['run-detail', '/ai/workflows/wf-damaged?tab=runs', async () => { await p.click('[data-testid="run-row-run-damaged-gb1076"]'); await p.waitForTimeout(900) }],
  ]) {
    if (w === 390 && !['list', 'editor-damaged', 'runs-damaged'].includes(name)) continue
    await go(url); if (act) await act()
    await p.screenshot({ path: `${OUT}/${name}-${w}.png` })
  }
  await p.context().close()
}
await b.close()
console.log('saved', OUT)
