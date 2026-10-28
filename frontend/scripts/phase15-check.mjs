// Phase 15 journeys JRN-177..183 (AI & Workflows design pass; REQ-805 + REQ-827). MOCKED. node scripts/phase15-check.mjs [baseUrl]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase15'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const errs = []
const log = (...a) => console.log(...a)
const step = async (n, fn) => { try { await fn() } catch (e) { log(`FAIL ${n}: ${e.message.split('\n')[0]}`) } }
const page = async (w, h, mobile = false) => { const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })).newPage(); p.on('pageerror', (e) => errs.push(e.message)); return p }
const login = async (p) => { await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard') }
const t = (p, s) => p.locator(s).first().innerText({ timeout: 4000 }).then((x) => x.replace(/\s+/g, ' ').trim()).catch(() => 'MISSING')
const settle = (p, ms = 600) => p.waitForTimeout(ms)
const spa = async (p, path) => { await p.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')) }, path); await settle(p) }
const leave = async (p) => { await p.getByRole('button', { name: /Leave anyway|Discard/ }).first().click({ timeout: 1500 }).catch(() => {}) }

const p = await page(1440, 900)
await login(p)

await step('JRN-177', async () => {
  await spa(p, '/ai/voice'); await p.waitForSelector('[data-testid="ai-tab-intro"]')
  const tabs = (await p.locator('[data-testid^="ai-tab-"]:not([data-testid="ai-tab-intro"])').allInnerTexts()).join(' · ')
  const intros = []
  for (const id of ['voice', 'replies', 'workflows', 'testing']) { await spa(p, `/ai/${id}`); intros.push(await t(p, '[data-testid="ai-tab-intro"]')) }
  log('JRN-177 tabs:', tabs, '| intros:', intros.filter((x) => x !== 'MISSING').length)
  await spa(p, '/ai/routing'); log('  /ai/routing →', new URL(p.url()).pathname)
  await p.keyboard.press('Control+k'); await settle(p); await p.keyboard.type('business hours'); await settle(p)
  log('  search "business hours":', (await p.locator('[role=dialog] [role=option]').allInnerTexts()).filter((x) => /routing|business hours/i.test(x)).length, 'routing results')
  await p.keyboard.press('Escape')
})

await step('JRN-178', async () => {
  await spa(p, '/ai/voice'); await p.waitForSelector('[data-testid="bv-card-identity"]')
  log('JRN-178 cards:', (await p.locator('[data-testid^="bv-card-"] h2').allInnerTexts()).join(' / '), '| how cards:', await p.locator('[data-testid="bv-how"]').count())
  const tone0 = await p.inputValue('[data-testid="bv-tone"]')
  await p.click('[data-testid="bv-preset-concise"]'); log('  preset appends:', (await p.inputValue('[data-testid="bv-tone"]')).startsWith(tone0) && (await p.inputValue('[data-testid="bv-tone"]')).includes('Concise'))
  await p.fill('[data-testid="bv-howToRespond"]', 'Answer first, then one helpful detail.')
  await p.fill('[data-testid="bv-phrasesToAvoid-input"]', 'cheap'); await p.press('[data-testid="bv-phrasesToAvoid-input"]', 'Enter')
  await p.click('[data-testid="bv-preview-sample-late"]'); await settle(p, 500)
  const reply = await t(p, '[data-testid="bv-preview-reply"]')
  log('  preview (late):', reply.slice(0, 160), '| has "cheap":', /cheap/i.test(reply), '| label:', await t(p, '[data-testid="bv-preview"] header p'), '| chip count:', await t(p, '[data-testid="bv-count-phrasesToAvoid"]'))
  log('  save bar:', await t(p, '[data-testid="unsaved-bar"]'), '| position:', await p.locator('[data-testid="unsaved-bar"]').evaluate((e) => getComputedStyle(e).position), '| duplicate labels:', await p.locator('[data-testid="bv-card-tone"] label:not(.sr-only)').count())
  await p.fill('[data-testid="bv-tone"]', 'x'.repeat(2001)); log('  over limit:', await t(p, '[data-testid="bv-error-tone"]'), '| save disabled:', await p.isDisabled('[data-testid="bv-save"]'))
  await p.fill('[data-testid="bv-tone"]', `${tone0} Concise: short sentences, the answer first.`)
  await p.screenshot({ path: `${OUT}/voice-1440.png` })
  await p.click('[data-testid="bv-test-voice"]'); await leave(p); await p.waitForURL('**/ai/testing')
  log('  test this voice →', new URL(p.url()).pathname, '|', await t(p, '[data-testid="test-voice-source"]'))
  await p.goBack(); await p.waitForSelector('[data-testid="bv-card-identity"]')
  await p.fill('[data-testid="bv-signOff"]', 'With thanks,\nThe Goorin Bros. hat shop'); await p.click('[data-testid="bv-save"]'); await settle(p, 900)
  log('  saved:', await t(p, '[data-testid="bv-save-state"]'))
})

await step('JRN-179', async () => {
  await spa(p, '/ai/replies'); await p.waitForSelector('[data-testid="ai-impact"]'); await settle(p)
  log('JRN-179 strip:', await t(p, '[data-testid="ai-impact"]'))
  const thumb = p.locator('[data-testid="threshold-slider"] [role=slider]')
  await thumb.focus()
  const to = async (v) => { const cur = Number(await thumb.getAttribute('aria-valuenow')); for (let i = 0; i < Math.abs(v - cur); i++) await p.keyboard.press(v > cur ? 'ArrowRight' : 'ArrowLeft') }
  await to(60); log('  60:', await t(p, '[data-testid="threshold-value"]'), '|', await t(p, '[data-testid="threshold-line"]'))
  await to(85); log('  85:', await t(p, '[data-testid="threshold-value"]'), '|', await t(p, '[data-testid="threshold-line"]'))
  log('  zones:', await t(p, '[data-testid="threshold-zone-person"]'), '/', await t(p, '[data-testid="threshold-zone-ai"]'))
  log('  auto-send rows:', (await p.locator('[data-testid="auto-send-matrix"] li').allInnerTexts()).map((x) => x.split('\n')[0]).join(', '), '| switches:', await p.locator('[data-testid^="auto-send-"][role=switch]').count())
  await p.click('[data-testid="auto-send-email"]')
  await p.fill('[data-testid="auto-refund-limit"]', '120')
  const body = await p.locator('[data-testid="ai-tab"]').innerText()
  log('  Grokbot on tab:', /grokbot/i.test(body), '| Claude on tab:', /claude/i.test(body), '| Fix in Integrations:', /Fix in Integrations/.test(body))
  await to(75)
  await p.screenshot({ path: `${OUT}/replies-1440.png` })
  await to(85)
  await p.click('[data-testid="ai-save"]'); await settle(p, 900)
  await spa(p, '/dashboard'); await p.waitForSelector('[data-testid="refunds-fraud-card"]'); await settle(p)
  log('  dashboard limit:', (await t(p, '[data-testid="refunds-fraud-card"]')).match(/Auto-refund limit: \$\d+/)?.[0])
  await spa(p, '/inbox/GB-1076'); await settle(p, 1200)
  await p.keyboard.press('Control+g'); await p.waitForSelector('[data-testid="ask-ai-prompt-2"]'); await p.click('[data-testid="ask-ai-prompt-2"]'); await p.waitForSelector('[data-testid="ask-ai-sources"]')
  log('  inbox note:', (await t(p, '[data-testid="ask-ai-answer"]')).match(/[^.]*\$\d+ auto-refund limit[^.]*/)?.[0] ?? 'MISSING')
  await p.keyboard.press('Escape')
  await spa(p, '/ai/replies'); await p.waitForSelector('[data-testid="auto-refund-limit"]'); await p.fill('[data-testid="auto-refund-limit"]', '75'); await p.click('[data-testid="auto-send-email"]')
  await thumb.focus(); await to(75); await p.click('[data-testid="ai-save"]'); await settle(p, 900)
})

await step('JRN-180', async () => {
  await spa(p, '/ai/workflows'); await p.waitForSelector('[data-testid="workflows-rows"]')
  log('JRN-180 stats cells:', await p.locator('[data-testid="workflows-stats"] > div').count(), '|', await t(p, '[data-testid="workflows-stats"]'))
  log('  row:', await t(p, '[data-testid="workflow-row-wf-order-tracking"]'), '| status label:', await t(p, '[data-testid="workflow-status-wf-order-tracking"]'), '| icon tooltip:', await p.locator('[data-testid="workflow-row-wf-order-tracking"] [title="Chat"]').count(), '| bar title:', await p.locator('[data-testid="workflow-completion-wf-order-tracking"]').getAttribute('title'))
  log('  templates section:', await p.locator('[data-testid="workflow-templates"]').count(), '| search shown (5 rows):', await p.locator('[data-testid="workflows-search"]').count())
  await p.screenshot({ path: `${OUT}/workflows-1440.png` })
  await p.click('[data-testid="workflow-new"]'); await p.waitForSelector('[data-testid="workflow-editor"]')
  log('  new → draft pill:', await t(p, '[data-testid="editor-status-pill"]'))
  await p.click('[data-testid="editor-back"]'); await leave(p); await p.waitForSelector('[data-testid="workflows-search"]')
  await p.fill('[data-testid="workflows-search"]', 'size'); await settle(p, 300)
  log('  search "size":', (await p.locator('[data-testid^="workflow-open-"]').allInnerTexts()).map((x) => x.split('\n')[0]).join(', '))
  await p.fill('[data-testid="workflows-search"]', '')
})

await step('JRN-181', async () => {
  await spa(p, '/ai/workflows/wf-order-tracking'); await p.waitForSelector('[data-testid="editor-list"]')
  const nm = p.locator('[data-testid="editor-name"]')
  log('JRN-181 title border (idle):', await nm.evaluate((e) => getComputedStyle(e).borderTopColor), '| bg:', await nm.evaluate((e) => getComputedStyle(e).backgroundColor))
  await nm.click(); await nm.fill('Order tracking (renamed)'); await p.keyboard.press('Enter')
  await p.click('[data-testid="step-open-ot-4"]').catch(async () => p.locator('[data-testid^="step-open-"]').nth(3).click()); await settle(p)
  log('  tiles:', await p.locator('[data-testid="editor-list"] [data-category]').count(), '| categories:', [...new Set(await p.locator('[data-testid="editor-list"] [data-category]').evaluateAll((els) => els.map((e) => e.dataset.category)))].join(','), '| var chips:', await p.locator('[data-testid="var-chip"]').count())
  log('  dotted surface:', (await p.locator('[data-testid="editor-list"]').evaluate((e) => getComputedStyle(e).backgroundImage)).startsWith('radial-gradient'), '| settings panel:', await p.locator('[data-testid="settings-panel"]').count(), '| settings title:', await t(p, '[data-testid="step-settings-title"]'), '| branch pills:', await p.locator('[data-testid^="branch-label-"]').count(), '| start card:', await t(p, '[data-testid="step-card-trigger"] span span'))
  log('  branch col min width:', Math.min(...(await p.locator('[data-testid^="branch-"][data-testid*="-"]:not([data-testid^="branch-label"])').evaluateAll((els) => els.filter((e) => /^branch-[^-]+-[^-]+/.test(e.dataset.testid) && !e.dataset.testid.startsWith('branches')).map((e) => Math.round(e.getBoundingClientRect().width))))), '| one-line titles:', await p.locator('[data-testid="editor-list"] [data-testid^="step-open-"] > span > span:first-child').evaluateAll((els) => els.every((e) => e.getBoundingClientRect().height < 24)))
  await p.screenshot({ path: `${OUT}/editor-1440.png` })
  await p.click('[data-testid="step-card-trigger"]'); await settle(p)
  const intent = p.locator('[data-testid="settings-panel"] input').first(); await intent.fill('')
  await settle(p); log('  issues chip:', await t(p, '[data-testid="editor-issues"] summary'), '| save bar:', await t(p, '[data-testid="unsaved-bar"]'))
  await p.click('[data-testid="editor-view-canvas"]'); await settle(p, 900); log('  canvas nodes:', await p.locator('.react-flow__node').count())
  await p.click('[data-testid="editor-view-list"]'); await settle(p); log('  back to list cards:', await p.locator('[data-testid^="step-card-"]').count())
  await p.click('[data-testid="editor-discard"]'); await settle(p)
})

await step('JRN-182', async () => {
  await spa(p, '/ai/testing'); await p.waitForSelector('[data-testid="test-empty"]')
  log('JRN-182 empty:', await t(p, '[data-testid="test-empty"] h3'), '|', await t(p, '[data-testid="test-empty"] p'))
  await p.click('[data-testid="test-customer"]'); await p.click('[data-testid="test-customer-c01"]'); await settle(p, 300)
  log('  customer context:', await t(p, '[data-testid="test-customer-context"]'), '| order field:', await p.inputValue('[data-testid="sandbox-order"]'))
  await p.click('[data-testid="test-channel-chat"]'); await p.click('[data-testid="sandbox-example-damaged"]'); await p.waitForSelector('[data-testid="test-turn-insight-1"]')
  await p.fill('[data-testid="sandbox-question"]', 'Can it arrive before Saturday?'); await p.click('[data-testid="sandbox-run"]'); await p.waitForSelector('[data-testid="test-turn-insight-3"]')
  log('  turns:', await p.locator('[data-testid^="test-turn-"]:not([data-testid*="insight"])').count(), '| insight:', await t(p, '[data-testid="test-turn-insight-1"]'))
  const a1 = await t(p, '[data-testid="test-turn-1"] [data-testid="sandbox-draft"]'), a3 = await t(p, '[data-testid="test-turn-3"] [data-testid="sandbox-draft"]')
  log('  follow-up differs:', a1 !== a3, '|', a3.slice(0, 120), '| insight 3:', await t(p, '[data-testid="test-turn-insight-3"]'))
  const box = async (i) => p.locator(`[data-testid="test-turn-${i}"]`).boundingBox()
  const [c0, r1] = [await box(0), await box(1)]; const th = await p.locator('[data-testid="test-thread"]').boundingBox()
  log('  layout: customer left', Math.round(c0.x - th.x) < 40, 'width', Math.round((c0.width / th.width) * 100) + '%', '| AI right', Math.round(th.x + th.width - (r1.x + r1.width)) < 40)
  log('  chip bg:', await p.locator('[data-testid="test-turn-insight-1"] [data-testid="confidence-value"]').evaluate((e) => getComputedStyle(e).backgroundColor))
  await p.click('[data-testid="test-insight-toggle-1"]'); log('  details:', await t(p, '[data-testid="test-insight-details-1"]'))
  await p.screenshot({ path: `${OUT}/testing-1440.png` })
  await p.click('[data-testid="test-run-all"]'); await p.waitForSelector('[data-testid="test-runall-table"]', { timeout: 20000 })
  log('  run all rows:', await p.locator('[data-testid^="test-runall-row-"]').count(), '|', (await p.locator('[data-testid^="test-runall-row-"]').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ')).join(' | '))
  await p.screenshot({ path: `${OUT}/testing-runall-1440.png` })
  await p.click('[data-testid="test-runall-row-returns"]'); await settle(p)
  log('  reopened:', (await t(p, '[data-testid="test-turn-0"]')).slice(0, 60))
  await p.click('[data-testid="test-reset"]'); await settle(p); log('  reset → empty:', await p.isVisible('[data-testid="test-empty"]'))
})

await step('JRN-183', async () => {
  const q = await page(390, 844, true); await login(q)
  const res = []
  for (const path of ['/ai/voice', '/ai/replies', '/ai/workflows', '/ai/workflows/wf-order-tracking', '/ai/testing']) {
    await spa(q, path); await settle(q, 900)
    const m = await q.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll('main button, main a, main input, main [role=switch], main summary')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.height < 44 && r.width < 44) && getComputedStyle(e).visibility !== 'hidden' }).map((e) => e.dataset.testid || e.textContent.trim().slice(0, 16)) }))
    res.push(`${path}: overflow ${m.over} small ${m.small.length}${m.small.length ? ` (${m.small.slice(0, 4).join(',')})` : ''}`)
    if (path === '/ai/voice') { log('JRN-183 voice preview collapsible:', await q.locator('[data-testid="bv-preview-collapsible"]').count()); await q.screenshot({ path: `${OUT}/ai-390.png` }) }
    if (path === '/ai/workflows/wf-order-tracking') log('  editor list only:', await q.locator('[data-testid="editor-view"]').count() === 0, await t(q, '[data-testid="editor-canvas-note"]'))
    if (path === '/ai/testing') { await q.click('[data-testid="test-empty-tracking"]'); await q.waitForSelector('[data-testid="test-turn-insight-1"]'); log('  phone test run insight:', await t(q, '[data-testid="test-turn-insight-1"]'), '| setup collapsible:', await q.evaluate(() => document.querySelector('[data-testid="test-setup"]').tagName)) }
  }
  log(' ', res.join('\n  '))
})

log('page errors:', errs.length, errs.slice(0, 3))
await b.close()
