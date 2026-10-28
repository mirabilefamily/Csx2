// Phase 17 journeys JRN-194..205 (Guidance refinement). MOCKED. node scripts/phase17-check.mjs [baseUrl]
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase17'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const errs = []
const log = (...a) => console.log(...a)
const step = async (n, fn) => { try { await fn() } catch (e) { log(`FAIL ${n}: ${e.message.split('\n')[0]}`) } }
const page = async (w, h, mobile = false, email = 'ava@goorin.com') => { const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, acceptDownloads: true })).newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(`${BASE}/login`); await p.fill('input[type=email]', email); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard'); return p }
const t = (p, s) => p.locator(s).first().innerText({ timeout: 4000 }).then((x) => x.replace(/\s+/g, ' ').trim()).catch(() => 'MISSING')
const settle = (p, ms = 500) => p.waitForTimeout(ms)
const spa = async (p, path) => { await p.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')) }, path); await settle(p, 700) }
const over = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth)

const p = await page(1440, 900)
await step('JRN-194 header', async () => {
  await spa(p, '/guidance'); await p.waitForSelector('[data-testid="articles-table"]')
  log('JRN-194 tabs:', await p.locator('[data-testid^="guidance-tab-"]').count(), '| New article buttons:', await p.locator('[data-testid="new-article"]').count(), '| summary:', await t(p, '[data-testid="guidance-summary"]'), '| AI link:', await t(p, '[data-testid="guidance-ai-link"]'))
  await p.click('[data-testid="guidance-io-menu"]'); log('  menu:', (await p.locator('[role=menuitem]').allInnerTexts()).join(' / '))
  const dl = p.waitForEvent('download'); await p.click('[data-testid="export-csv"]'); log('  export file:', (await dl).suggestedFilename())
  for (const q of ['?tab=macros', '?tab=nope']) { await spa(p, `/guidance${q}`); log(`  ${q} →`, new URL(p.url()).pathname + new URL(p.url()).search) }
  await spa(p, '/guidance?tab=import'); log('  ?tab=import dialog:', await p.locator('[data-testid="csv-import-dialog"]').count(), '| list behind:', await p.locator('[data-testid="articles-table"]').count()); await p.keyboard.press('Escape'); await settle(p)
})
await step('JRN-195 library', async () => {
  await spa(p, '/guidance')
  log('JRN-195 rail:', (await p.locator('[data-testid="article-category-rail"] button').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ')).join(' | '))
  log('  status control:', await t(p, '[data-testid="article-active-filter"]'), '| sort:', await t(p, '[data-testid="article-sort"]'))
  const r = p.locator('[data-testid^="article-row-"]').first()
  log('  first row:', (await r.innerText()).replace(/\s+/g, ' ').slice(0, 220))
  const off = p.locator('[data-testid^="article-off-"]').first(); const offId = (await off.getAttribute('data-testid')).replace('article-off-', '')
  log('  off row:', await t(p, `[data-testid="article-uses-${offId}"]`), '| bg:', await p.locator(`[data-testid="article-row-${offId}"]`).evaluate((e) => getComputedStyle(e).backgroundColor))
  await p.screenshot({ path: `${OUT}/list-1440.png` })
  const cat = p.locator('[data-testid="article-category-rail"] button').nth(1); const cn = (await cat.innerText()).split('\n')[0]
  await cat.click(); await settle(p, 300); log('  category', cn, '→ rows', await p.locator('[data-testid^="article-row-"]').count(), '| pressed:', await cat.getAttribute('aria-pressed'))
  await p.click('[data-testid="article-category-all"] >> nth=-1')
  await p.fill('[data-testid="article-search"]', 'zzzzz'); log('  no match:', await t(p, '[data-testid="articles-no-match"]'))
  await p.click('[data-testid="articles-clear-filters"]'); await settle(p, 300); log('  cleared rows:', await p.locator('[data-testid^="article-row-"]').count())
  await p.fill('[data-testid="article-search"]', 'brim'); await settle(p, 300); log('  body search "brim":', await p.locator('[data-testid^="article-row-"]').count()); await p.fill('[data-testid="article-search"]', '')
  await p.click('[data-testid="article-sort"]'); await p.getByRole('option', { name: 'Most used by AI' }).click(); await settle(p, 300)
  log('  most used first:', (await p.locator('[data-testid^="article-uses-"]').allInnerTexts()).slice(0, 3).join(' | '))
  await p.click('[data-testid="article-sort"]'); await p.getByRole('option', { name: 'Recently updated' }).click()
  const sw = p.locator('[data-testid^="article-active-"][role=switch]').first(); await sw.click(); await settle(p, 700)
  log('  toggle toast:', await t(p, '[data-sonner-toast]'), '| summary:', await t(p, '[data-testid="guidance-summary"]'), '| status:', await t(p, '[data-testid="article-active-filter"]'))
  await sw.click(); await settle(p, 700)
})
await step('JRN-196 editor', async () => {
  await p.locator('[data-testid^="article-open-"]').nth(2).click(); await p.waitForSelector('[data-testid="article-editor"]')
  const ver = await t(p, '[data-testid="article-version"]')
  log('JRN-196 views:', (await p.locator('[data-testid^="editor-tab-"]').allInnerTexts()).join('/'), '| split default:', await p.getAttribute('[data-testid="editor-tab-split"]', 'aria-checked'), '| settings right:', await p.locator('[data-testid="article-settings"]').evaluate((e) => e.getBoundingClientRect().left > 900))
  log('  status label:', await t(p, '[data-testid="article-status-label"]'), '| details:', await t(p, '[data-testid="article-details"]'), '| history items:', await p.locator('[data-testid^="article-history-v"]').count())
  await p.click('[data-testid="article-body"]'); await p.keyboard.press('Control+End'); await p.click('[data-testid="md-bold"]'); log('  bold inserted:', (await p.inputValue('[data-testid="article-body"]')).endsWith('**bold text**'))
  await p.fill('[data-testid="article-tags"]', 'phase17'); await p.keyboard.press('Enter'); await p.fill('[data-testid="article-tags"]', 'phase17'); await p.keyboard.press(','); log('  tags (dup ignored):', await p.locator('[data-testid="article-tag-phase17"]').count())
  log('  save bar:', await t(p, '[data-testid="unsaved-bar"]'))
  await p.screenshot({ path: `${OUT}/editor-1440.png` })
  const title = await p.inputValue('[data-testid="article-title"]'); await p.fill('[data-testid="article-title"]', ''); await p.click('[data-testid="article-save"]'); log('  empty title:', await t(p, '[data-testid="article-editor"] [role=alert], [data-testid="article-editor"] .text-red-700'))
  await p.fill('[data-testid="article-title"]', title)
  await p.click('[data-testid="article-back"]'); log('  leave guard:', await t(p, '[role=alertdialog]')); await p.getByRole('button', { name: /Keep editing|Cancel|Stay/ }).first().click().catch(() => {})
  await p.click('[data-testid="article-save"]'); await p.waitForSelector('[data-testid="articles-table"]'); await settle(p, 500)
  log('  saved toast:', await t(p, '[data-sonner-toast]'), '| first row:', (await t(p, '[data-testid^="article-row-"]')).slice(0, 60), '| was', ver)
  await p.click('[data-testid="new-article"]'); await p.waitForSelector('[data-testid="article-editor"]')
  await p.click('[data-testid="article-category"]'); await p.click('[data-testid="article-category-new-option"]'); log('  new category field:', await p.locator('[data-testid="article-category-new"]').count())
  await p.click('[data-testid="article-back"]'); await p.getByRole('button', { name: /Discard|Leave/ }).first().click().catch(() => {})
})
await step('JRN-197 import', async () => {
  await spa(p, '/guidance'); await p.click('[data-testid="guidance-io-menu"]'); await p.click('[data-testid="guidance-import"]'); await p.waitForSelector('[data-testid="csv-steps"]')
  log('JRN-197 steps:', await t(p, '[data-testid="csv-steps"]'), '| current:', await t(p, '[aria-current=step]'))
  writeFileSync('/tmp/p17.txt', 'x'); await p.setInputFiles('[data-testid="csv-file-input"]', '/tmp/p17.txt'); log('  non-csv:', await t(p, '[data-testid="csv-import-dialog"] [role=alert], [data-testid="csv-import-dialog"] .text-red-700'))
  writeFileSync('/tmp/p17.csv', 'Name,Text,Group\n"P17 one","Body one",Sizing\n"","no title",X\n"P17 two","Body two",Care\n')
  await p.setInputFiles('[data-testid="csv-file-input"]', '/tmp/p17.csv'); await p.waitForSelector('[data-testid="csv-mapping"]')
  log('  map rows:', await p.locator('[data-testid^="map-"]').count(), '| title error:', await t(p, '[data-testid="csv-map-title-error"]'), '| next disabled:', await p.isDisabled('[data-testid="csv-next"]'))
  for (const [f, c] of [['title', 'Name'], ['body', 'Text'], ['category', 'Group']]) { await p.click(`[data-testid="map-${f}"]`); await p.getByRole('option', { name: c, exact: true }).click() }
  await p.screenshot({ path: `${OUT}/import-1440.png` })
  await p.click('[data-testid="csv-next"]'); log('  review:', await t(p, '[data-testid="csv-review-summary"]'), '| step:', await t(p, '[aria-current=step]'))
  await p.click('[data-testid="csv-import-confirm"]'); await settle(p, 900)
  log('  toasts:', (await p.locator('[data-sonner-toast]').allInnerTexts()).join(' | '), '| dialog closed:', !(await p.locator('[data-testid="csv-import-dialog"]').count()), '| summary:', await t(p, '[data-testid="guidance-summary"]'))
})
await step('JRN-198 search + agent', async () => {
  await p.click('[data-testid="global-search"]').catch(() => p.keyboard.press('Control+k')); await p.fill('[data-testid="global-search-input"]', 'Order status'); await settle(p, 1200)
  log('JRN-198 options:', (await p.locator('[data-testid^="search-result-"]').allInnerTexts()).slice(0, 3).map((x) => x.replace(/\s+/g, ' ')).join(' | '))
  await p.locator('[data-testid^="search-result-"]', { hasText: 'Order status and tracking' }).first().click(); await settle(p, 900)
  log('JRN-198 search opens:', new URL(p.url()).search, '| editor:', await p.locator('[data-testid="article-editor"]').count())
  await spa(p, '/guidance'); await p.waitForSelector('[data-testid="articles-table"]')
  const a = p; await a.click('[data-testid="user-menu-trigger"]'); await a.click('[data-testid="role-toggle-agent"]'); await a.keyboard.press('Escape'); await spa(a, '/guidance'); await a.waitForSelector('[data-testid="articles-table"]')
  log('  agent: new', await a.locator('[data-testid="new-article"]').count(), '| io menu', await a.locator('[data-testid="guidance-io-menu"]').count(), '| switches', await a.locator('[data-testid^="article-active-"][role=switch]').count(), '| AI link', await a.locator('[data-testid="guidance-ai-link"]').count())
  await a.click('[data-testid="user-menu-trigger"]'); await a.click('[data-testid="role-toggle-admin"]'); await a.keyboard.press('Escape')
})
await step('JRN-199 widths + phone', async () => {
  const res = []
  for (const w of [390, 768, 1024, 1280, 1440, 1920]) {
    const q = await page(w, 900, w < 640); await spa(q, '/guidance'); await q.waitForSelector('[data-testid="articles-table"]'); const l = await over(q)
    if (w === 1024) { log('JRN-199 1024 rail:', await q.isVisible('[data-testid="article-category-rail"]')); await q.screenshot({ path: `${OUT}/list-1024.png` }) }
    if (w === 390) { log('  390 chips:', await q.isVisible('[data-testid="article-category-chips"]')); await q.screenshot({ path: `${OUT}/list-390.png` }) }
    await q.locator('[data-testid^="article-open-"]').first().click(); await q.waitForSelector('[data-testid="article-editor"]'); const e = await over(q)
    if (w === 390) { log('  390 editor views:', (await q.locator('[data-testid^="editor-tab-"]').allInnerTexts()).join('/'), '| settings below body:', await q.evaluate(() => document.querySelector('[data-testid="article-settings"]').getBoundingClientRect().top > document.querySelector('[data-testid="article-body"]').getBoundingClientRect().top), '| tab bar hidden:', !(await q.locator('[data-testid="bottom-tab-bar"]').isVisible().catch(() => false))); await q.screenshot({ path: `${OUT}/editor-390.png` }) }
    await spa(q, '/guidance?tab=import'); await q.waitForSelector('[data-testid="csv-import-dialog"]'); const d = await over(q)
    res.push(`${w}: list ${l} editor ${e} import ${d}`); await q.context().close()
  }
  log('  overflow px:', res.join(' | '))
})
await step('JRN-200 states', async () => {
  await spa(p, '/guidance'); await p.waitForSelector('[data-testid="articles-table"]')
  if (!(await p.locator('[data-testid="demo-state-trigger"]').count())) return log('JRN-200 demo tools not in this build')
  for (const s of ['loading', 'empty', 'error', 'live']) {
    await p.click('[data-testid="demo-state-trigger"]'); await p.click(`[data-testid="demo-state-option-${s}"]`); await p.keyboard.press('Escape'); await settle(p, 1500)
    if (s !== 'live') log(`JRN-200 ${s}:`, await p.locator(`[data-testid="articles-${s}"]`).count())
  }
})
log('page errors:', errs.length, errs.slice(0, 3).map((e) => e.slice(0, 160)))
await b.close()
