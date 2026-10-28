// Phase 19 Conversation testing journeys JRN-219..225: node scripts/phase19-check.mjs [baseUrl]
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const errs = []
let fails = 0
const log = (...a) => console.log(...a)
const expect = (label, ok, got) => { if (!ok) fails++; log(`  ${ok ? 'ok ' : 'BAD'} ${label}${got !== undefined ? ` → ${got}` : ''}`) }
const step = async (name, fn) => { log(name); try { await fn() } catch (e) { fails++; log(`FAIL ${name}: ${e.message.split('\n')[0]}`) } }
const settle = (p, ms = 400) => p.waitForTimeout(ms)
const t = (p, s) => p.locator(s).first().innerText({ timeout: 4000 }).then((x) => x.replace(/\s+/g, ' ').trim()).catch(() => 'MISSING')
const spa = async (p, u) => { await p.evaluate((x) => { history.pushState({}, '', x); dispatchEvent(new PopStateEvent('popstate')) }, u); await settle(p, 700) }
const page = async (w, h, mobile = false) => {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })).newPage()
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard')
  return p
}
const open = async (p) => { await spa(p, '/ai/testing'); await p.waitForSelector('[data-testid="test-empty"]'); await settle(p, 300) }
const pick = async (p, id = 'c01') => { await p.click('[data-testid="test-customer"]'); await p.click(`[data-testid="test-customer-${id}"]`); await settle(p, 300) }
const say = async (p, text, n) => { await p.fill('[data-testid="sandbox-question"]', text); await p.press('[data-testid="sandbox-question"]', 'Enter'); await p.waitForSelector(`[data-testid="test-turn-insight-${n}"]`, { timeout: 8000 }) }
const setThreshold = async (p, v) => {
  await spa(p, '/ai/replies'); await p.waitForSelector('[data-testid="threshold-slider"]')
  const th = p.locator('[data-testid="threshold-slider"] [role=slider]'); await th.focus()
  for (let i = 0; i < 60; i++) { const cur = Number(await th.getAttribute('aria-valuenow')); if (cur === v) break; await p.keyboard.press(cur < v ? 'ArrowRight' : 'ArrowLeft') }
  if (await p.locator('[data-testid="ai-save"]').isEnabled().catch(() => false)) { await p.click('[data-testid="ai-save"]'); await settle(p, 900) }
}

const p = await page(1440, 900)
await step('JRN-219 workspace at a glance', async () => {
  await open(p)
  const g = await p.evaluate(() => ({ scroll: document.documentElement.scrollHeight - innerHeight, cols: ['test-setup', 'test-chat', 'test-inspector-panel'].map((x) => { const r = document.querySelector(`[data-testid="${x}"]`)?.getBoundingClientRect(); return r ? Math.round(r.left) : null }), bottom: Math.round(document.querySelector('[data-testid="test-workspace"]').getBoundingClientRect().bottom) }))
  expect('REQ-976 three columns rail | chat | inspector', g.cols.every((x) => x !== null) && g.cols[0] < g.cols[1] && g.cols[1] < g.cols[2], g.cols.join())
  expect('REQ-976 no page scroll at 1440×900, workspace ends ≥16px above fold', g.scroll <= 0 && g.bottom <= 900 - 16 && g.bottom >= 900 - 40, `scroll ${g.scroll} bottom ${g.bottom}`)
  const rail = await t(p, '[data-testid="test-setup"]')
  expect('REQ-980 rail: channel, customer, order, voice, threshold', ['Channel', 'Customer', 'Order', 'Brand voice: Saved voice', 'Hands to a person below 75%', 'Change'].every((x) => rail.includes(x)), rail.slice(0, 160))
  expect('REQ-981 no scenario list in setup', (await p.locator('[data-testid="test-setup"] [data-testid^="sandbox-example-"], [data-testid="test-setup"] [data-testid^="test-empty-"]').count()) === 0)
  expect('REQ-984 header "Chat · Guest" + Scenarios / Run all scenarios / Reset', (await t(p, '[data-testid="test-chat-context"]')) === 'Chat · Guest' && (await t(p, '[data-testid="test-run-all"]')) === 'Run all scenarios' && (await p.locator('[data-testid="test-scenarios-menu"]').count()) === 1 && (await p.locator('[data-testid="test-reset"]').count()) === 1)
  expect('REQ-985 "Try a scenario" + 5 cards + hint', (await t(p, '[data-testid="test-empty"] h3')) === 'Try a scenario' && (await p.locator('[data-testid="test-empty"] button').count()) === 5 && (await t(p, '[data-testid="test-empty-hint"]')) === 'Or type what the customer says below.')
  await p.click('[data-testid="test-scenarios-menu"]'); expect('REQ-981 header Scenarios menu lists 5', (await p.locator('[data-testid^="test-scenario-menu-"]').count()) === 5); await p.keyboard.press('Escape')
})
await step('JRN-220 customer context', async () => {
  await pick(p)
  const card = p.locator('[data-testid="test-customer-context"]')
  const clipped = await card.evaluate((e) => [...e.querySelectorAll('p')].some((x) => x.scrollWidth > x.clientWidth + 1 || getComputedStyle(x).textOverflow === 'ellipsis'))
  const txt = await t(p, '[data-testid="test-customer-context"]')
  expect('REQ-982 card: name, full email, orders, #GB20398 · Delivered, nothing truncated', !clipped && txt.includes('Margaret Okonkwo') && txt.includes('margaret.okonkwo@example.com') && /\d+ orders?/.test(txt) && txt.includes('#GB20398 · Delivered'), txt)
  expect('REQ-984 header "Chat · Margaret Okonkwo"', (await t(p, '[data-testid="test-chat-context"]')).startsWith('Chat · Margaret Okonkwo'))
  expect('REQ-988 placeholder "Reply as Margaret Okonkwo…"', (await p.getAttribute('[data-testid="sandbox-question"]', 'placeholder')) === 'Reply as Margaret Okonkwo…')
})
await step('JRN-221 chat and inspector', async () => {
  expect('REQ-988 Send disabled when empty', await p.locator('[data-testid="sandbox-run"]').isDisabled())
  await p.click('[data-testid="test-empty-sizing"]')
  expect('REQ-989 typing indicator while waiting', await p.locator('[data-testid="sandbox-loading"]').isVisible().catch(() => false))
  await p.waitForSelector('[data-testid="test-turn-insight-1"]')
  await say(p, 'Can it arrive before Saturday?', 3)
  const th = await p.locator('[data-testid="test-thread"]').boundingBox(), [c0, r1] = [await p.locator('[data-testid="test-turn-0"]').boundingBox(), await p.locator('[data-testid="test-turn-1"]').boundingBox()]
  expect('REQ-986 customer left, AI right', c0.x - th.x < 60 && th.x + th.width - (r1.x + r1.width) < 60)
  const meta = await t(p, '[data-testid="test-turn-insight-1"]')
  expect('REQ-987 one meta line: %, decision, sources', /\d+%/.test(meta) && /Would/.test(meta) && /\d+ sources?/.test(meta), meta)
  const chip = await p.locator('[data-testid="test-turn-insight-1"] [data-testid="confidence-value"]').evaluate((e) => [parseInt(e.textContent), getComputedStyle(e).backgroundColor])
  const [cr, cg, cb] = chip[1].match(/\d+/g).map(Number)
  expect('REQ-987 chip green ≥75 / amber below', chip[0] >= 75 ? cg > cr && cg > cb : cr >= cg && cr > cb + 10, chip.join(' '))
  expect('REQ-990 newest reply selected by default', (await p.getAttribute('[data-testid="test-turn-3"]', 'data-selected')) === 'true' && (await t(p, '[data-testid="test-inspector-panel"]')).includes('reply 2'))
  await p.click('[data-testid="test-turn-1"] [data-testid="sandbox-draft"]'); await settle(p, 300)
  expect('REQ-990 clicking first reply moves selection', (await p.getAttribute('[data-testid="test-turn-1"]', 'data-selected')) === 'true' && (await p.getAttribute('[data-testid="test-turn-3"]', 'data-selected')) === null)
  const ins = await t(p, '[data-testid="test-inspector"]')
  const marker = await p.locator('[data-testid="inspector-bar-marker"]').evaluate((e) => e.style.left)
  expect('REQ-991 confidence bar with 75% marker', marker.includes('75%'), marker)
  expect('REQ-992 decision in words', /Would (send on its own|hand to a person — confidence below 75%|start workflow: .+)/.test(await t(p, '[data-testid="inspector-decision"]')))
  const scores = await p.locator('[data-testid="sandbox-articles"] li span').allInnerTexts()
  expect('REQ-993 only sources ≥40% shown', scores.length > 0 && scores.every((x) => parseInt(x) >= 40), scores.join(','))
  expect('REQ-993 source rows link to guidance', ((await p.getAttribute('[data-testid="sandbox-article-0"]', 'href')) ?? '').startsWith('/guidance?article='))
  if (await p.locator('[data-testid="test-weaker-toggle"]').count()) {
    const lbl = await t(p, '[data-testid="test-weaker-toggle"]'); await p.click('[data-testid="test-weaker-toggle"]')
    expect(`REQ-994 "${lbl}" reveals weaker (<40%)`, /^Show \d+ weaker match/.test(lbl) && (await p.locator('[data-testid="sandbox-weaker"] li').count()) === parseInt(lbl.replace(/\D+/g, '')))
  } else log('  (no weaker matches for this reply)')
  expect('REQ-995 order checked + why', ins.includes('Order checked: #GB20398') && (await t(p, '[data-testid="sandbox-reasoning"]')).startsWith('Confidence'))
  await p.click('[data-testid="sandbox-question"]'); await p.keyboard.type('line one'); await p.keyboard.press('Shift+Enter'); await p.keyboard.type('line two')
  expect('REQ-988 Shift+Enter adds a new line', (await p.inputValue('[data-testid="sandbox-question"]')) === 'line one\nline two')
  await p.fill('[data-testid="sandbox-question"]', '')
})
await step('JRN-222 workflow detection matches the widget', async () => {
  await p.click('[data-testid="test-reset"]'); await settle(p)
  const phrases = [['I want to cancel my order', 'Cancel an order'], ['my hat arrived damaged', 'Damaged item claim'], ['where is my order', 'Order tracking']]
  let n = 1
  for (const [q, wf] of phrases) { await say(p, q, n); expect(`REQ-996 "${q}" → Would start workflow: ${wf}`, (await t(p, `[data-testid="test-turn-insight-${n}"] [data-testid="sandbox-verdict"]`)) === `Would start workflow: ${wf}`); n += 2 }
  const w = await page(1440, 900); await w.goto(`${BASE}/widget-demo`); await settle(w, 1200)
  const widgetPick = []
  log('  Q-870: widget and test both call workflowsApi.activeWorkflowFor →', readFileSync('src/components/widget/SupportWidget.tsx', 'utf8').includes('activeWorkflowFor(') && readFileSync('src/api/ai.ts', 'utf8').includes('activeWorkflowFor('))
  for (const [q, wf] of phrases) {
    await w.click('[data-testid="widget-launcher"]'); await settle(w, 500)
    await w.fill('[data-testid="widget-composer-input"]', q); await w.press('[data-testid="widget-composer-input"]', 'Enter'); await settle(w, 2600)
    widgetPick.push(`${wf}: ${(await w.locator('[data-testid="widget-body"]').innerText()).replace(/\s+/g, ' ').slice(-90)}`)
    await w.goto(`${BASE}/widget-demo`); await settle(w, 1000)
  }
  log('  widget replies for the same phrases (Q-870):\n   ', widgetPick.join('\n    '))
  await w.context().close()
  expect('REQ-996 inspector Open workflow → editor', ((await p.getAttribute('[data-testid="inspector-open-workflow"]', 'href')) ?? '') === '/ai/workflows/wf-order-tracking')
  expect('REQ-996 Test in workflow → Test panel', ((await p.getAttribute('[data-testid="inspector-test-workflow"]', 'href')) ?? '') === '/ai/workflows/wf-order-tracking?test=1')
  await p.click('[data-testid="inspector-test-workflow"]'); await settle(p, 900)
  expect('REQ-996 Test panel opens for that workflow', p.url().includes('/ai/workflows/wf-order-tracking') && (await p.locator('[data-testid="test-idle-hint"], [data-testid="test-sheet"]').count()) > 0, p.url())
})
await step('JRN-223 run all scenarios scorecard', async () => {
  await open(p); await pick(p)
  await p.click('[data-testid="test-run-all"]'); await p.waitForSelector('[data-testid="test-runall-table"]', { timeout: 20000 })
  const sum = await t(p, '[data-testid="test-scorecard-summary"]')
  const dec = await p.locator('[data-testid="test-runall-decision"]').allInnerTexts()
  const conf = (await p.locator('[data-testid="test-runall-confidence"]').allInnerTexts()).map((x) => parseInt(x))
  const want = `5 scenarios · ${dec.filter((x) => x === 'Would send').length} would send · ${dec.filter((x) => x === 'Would hand to a person').length} would hand to a person · ${dec.filter((x) => x === 'Would start workflow').length} would start a workflow · average confidence ${Math.round(conf.reduce((a, c) => a + c, 0) / conf.length)}%`
  expect('REQ-997 summary header counts match rows', sum === want, sum)
  expect('REQ-998 rows: bar + threshold marker, decision, workflow, sources', (await p.locator('[data-testid^="test-runall-bar-"][role=img]').count()) === 5 && (await p.locator('[data-testid$="-marker"]').count()) >= 5 && (await p.locator('[data-testid="test-runall-workflow"]').count()) === 5 && (await p.locator('[data-testid="test-runall-sources"]').count()) === 5)
  const ov = await p.locator('[data-testid="test-runall-row-sizing"]').evaluate((e) => [...e.querySelectorAll('span')].some((s) => s.scrollWidth > s.clientWidth + 1 && getComputedStyle(s).textOverflow !== 'ellipsis'))
  expect('REQ-998 rows fit the chat panel (no overlap)', !ov)
  await p.click('[data-testid="test-runall-row-wholesale"]'); await settle(p)
  expect('REQ-999 row → transcript with reply selected + Back', (await t(p, '[data-testid="test-turn-0"]')).includes('boutique') && (await p.getAttribute('[data-testid="test-turn-1"]', 'data-selected')) === 'true' && (await p.locator('[data-testid="test-runall-back"]').count()) === 1)
  await p.click('[data-testid="test-runall-back"]'); await settle(p)
  expect('REQ-999 Back to results', await p.locator('[data-testid="test-runall-table"]').isVisible())
  await p.click('[data-testid="test-reset"]'); await settle(p)
  expect('REQ-1000 Reset clears but keeps Margaret + #GB20398', await p.locator('[data-testid="test-empty"]').isVisible() && (await t(p, '[data-testid="test-customer"]')).includes('Margaret') && (await p.inputValue('[data-testid="sandbox-order"]')) === '#GB20398')
})
await step('JRN-224 threshold stays in sync', async () => {
  await setThreshold(p, 85); await open(p); await pick(p)
  expect('REQ-1001 rail reads 85%', (await t(p, '[data-testid="test-threshold"]')).includes('below 85%'))
  await p.click('[data-testid="test-empty-sizing"]'); await p.waitForSelector('[data-testid="test-turn-insight-1"]')
  const c = parseInt(await t(p, '[data-testid="test-turn-insight-1"] [data-testid="confidence-value"]'))
  const marker = await p.locator('[data-testid="inspector-bar-marker"]').evaluate((e) => e.style.left)
  const dec = await t(p, '[data-testid="inspector-decision"]')
  expect('REQ-1001 marker + decision use 85', marker.includes('85%') && (c >= 85 || dec.startsWith('Would start workflow') || dec === 'Would hand to a person — confidence below 85%'), `${c}% · ${marker} · ${dec}`)
  await setThreshold(p, 75)
})
await step('JRN-225 states, tablet, phone', async () => {
  // Demo tools only exist in the dev build, so the Error state runs against the dev server.
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  const DEV = process.env.DEV_BASE ?? 'http://localhost:3000'
  await d.goto(`${DEV}/login`); await d.fill('input[type=email]', 'ava@goorin.com'); await d.fill('input[type=password]', 'goorin123'); await d.getByRole('button', { name: 'Sign in' }).click(); await d.waitForURL('**/dashboard')
  await open(d)
  if (await d.locator('[data-testid="demo-state-trigger"]').count()) {
    await d.click('[data-testid="demo-state-trigger"]'); await d.click('[data-testid="demo-state-option-error"]'); await d.keyboard.press('Escape')
    await d.fill('[data-testid="sandbox-question"]', 'Hello?'); await d.press('[data-testid="sandbox-question"]', 'Enter'); await d.waitForSelector('[data-testid="sandbox-error"]')
    expect('REQ-1002 error copy + Retry', (await t(d, '[data-testid="sandbox-error"]')).startsWith('Couldn’t get a reply. Try again.'))
    await d.click('[data-testid="demo-state-trigger"]'); await d.click('[data-testid="demo-state-option-live"]'); await d.keyboard.press('Escape')
    await d.click('[data-testid="sandbox-retry"]'); await d.waitForSelector('[data-testid="test-turn-insight-1"]')
    expect('REQ-1002 Retry gets the reply', (await d.locator('[data-testid="sandbox-error"]').count()) === 0)
  } else { fails++; log('  BAD demo tools missing on dev server') }
  await d.context().close()
  const s = await page(1024, 768); await open(s); await s.click('[data-testid="test-empty-damaged"]'); await s.waitForSelector('[data-testid="test-turn-insight-1"]')
  expect('REQ-1003 1024: no inspector column', (await s.locator('[data-testid="test-inspector-panel"]').count()) === 0)
  await s.click('[data-testid="test-insight-toggle-1"]'); await s.waitForSelector('[data-testid="test-inspector-sheet"]')
  expect('REQ-1003 1024: Details opens inspector sheet', await s.locator('[data-testid="test-inspector-sheet"] [data-testid="test-inspector"]').isVisible())
  await s.context().close()
  for (const [w, h, mob] of [[768, 1024, false], [390, 844, true]]) {
    const m = await page(w, h, mob); await open(m)
    expect(`REQ-1004 ${w}: setup is a "Test setup" sheet`, (await t(m, '[data-testid="test-setup-open"]')) === 'Test setup' && (await m.locator('[data-testid="test-setup"]').count()) === 0)
    await m.click('[data-testid="test-setup-open"]'); await m.waitForSelector('[data-testid="test-setup"]'); expect(`REQ-1004 ${w}: setup sheet opens`, (await t(m, '[data-testid="test-setup"]')).includes('Customer')); await m.keyboard.press('Escape'); await settle(m)
    await m.click('[data-testid="test-empty-returns"]'); await m.waitForSelector('[data-testid="test-turn-insight-1"]'); await m.click('[data-testid="test-insight-toggle-1"]'); await settle(m)
    expect(`REQ-1004 ${w}: details inline`, await m.locator('[data-testid="test-turn-1"] [data-testid="test-insight-details-1"]').isVisible())
    const g = await m.evaluate(() => { const c = document.querySelector('[data-testid="test-composer"]').getBoundingClientRect(), s = document.querySelector('[data-testid="test-chat"]').getBoundingClientRect(); return { over: document.documentElement.scrollWidth > innerWidth, pinned: Math.abs(c.bottom - s.bottom) <= 2 } })
    expect(`REQ-1004 ${w}: no sideways scroll, composer pinned at chat bottom`, !g.over && g.pinned, JSON.stringify(g))
    await m.context().close()
  }
  await spa(p, '/inbox'); await settle(p, 800)
  expect('REQ-1004 test chats never reach Inbox', !(await t(p, 'main')).includes('Hello?'))
})
log('page errors:', errs.length, JSON.stringify(errs.slice(0, 3)))
log(fails ? `FAILURES: ${fails}` : 'ALL PASS')
await b.close()
process.exit(fails ? 1 : 0)
