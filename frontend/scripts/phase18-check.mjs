// Phase 18 journeys JRN-206..215 + DOM sweep for REQ-913/914/915/917. node scripts/phase18-check.mjs [baseUrl]
import { chromium } from 'playwright-core'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const errs = []
let fails = 0
const log = (...a) => console.log(...a)
const step = async (n, fn) => { try { await fn() } catch (e) { fails++; log(`FAIL ${n}: ${e.message.split('\n')[0]}`) } }
const page = async (w, h, mobile = false) => { const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, permissions: ['clipboard-read', 'clipboard-write'] })).newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(`${BASE}/login`); await p.fill('input[type=email]', 'ava@goorin.com'); await p.fill('input[type=password]', 'goorin123'); await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForURL('**/dashboard'); return p }
const t = (p, s) => p.locator(s).first().innerText({ timeout: 5000 }).then((x) => x.replace(/\s+/g, ' ').trim()).catch(() => 'MISSING')
const settle = (p, ms = 500) => p.waitForTimeout(ms)
const spa = async (p, path) => { await p.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')) }, path); await settle(p, 1200); if (await p.locator('[data-testid="unsaved-discard"]').count()) { await p.click('[data-testid="unsaved-discard"]'); await settle(p, 300); await p.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')) }, path); await settle(p, 1200) } }
const expect = (label, ok, got) => { if (!ok) fails++; log(`  ${ok ? 'ok ' : 'BAD'} ${label}${got !== undefined ? ` → ${got}` : ''}`) }

const p = await page(1440, 900)
await step('JRN-206 status strips', async () => {
  await spa(p, '/channels/chat'); const chat = await t(p, '[data-testid="channels-status-chat"]')
  expect('chat strip', chat.includes('Live on goorin.myshopify.com · AI replies on') && /Last loaded 4 minutes ago/.test(chat) && chat.includes('Installation'), chat)
  await spa(p, '/channels/form'); const form = await t(p, '[data-testid="channels-status-form"]')
  expect('form strip', form.includes('Live on /pages/contact · Submissions become email tickets'), form)
  await spa(p, '/channels/email'); const email = await t(p, '[data-testid="channels-status-email"]')
  expect('email strip', email.includes('support@goorin.com via Office 365') && email.includes('Mailbox syncing is turned off.') && (email.match(/Needs attention/g) ?? []).length === 1 && email.includes('Fix in Integrations'), email)
  await p.click('[data-testid="email-manage-integration"]'); await settle(p, 900); expect('fix opens Office 365', p.url().endsWith('/settings/integrations/outlook'), new URL(p.url()).pathname)
  await spa(p, '/channels/install'); const inst = await t(p, '[data-testid="channels-status-install"]')
  expect('install strip', inst.includes('Chat widget: Installed') && inst.includes('Contact form: Installed'), inst)
})
await step('JRN-207 email preview', async () => {
  await spa(p, '/channels/email'); await p.waitForSelector('[data-testid="email-preview"]')
  const box = await p.locator('[data-testid="email-settings"]').boundingBox(); const pv = await p.locator('[data-testid="email-preview"]').boundingBox()
  expect('settings left, preview right', pv.x > box.x + box.width - 1, `${Math.round(box.x)} / ${Math.round(pv.x)}`)
  await p.fill('[data-testid="email-from-name"]', 'Goorin Hat Shop')
  expect('from updates', (await t(p, '[data-testid="email-preview-from"]')) === 'Goorin Hat Shop <support@goorin.com>', await t(p, '[data-testid="email-preview-from"]'))
  await p.locator('[data-testid="email-signature"]').press('Control+End'); await p.keyboard.type('\nThanks for writing')
  const sig = await t(p, '[data-testid="email-signature-preview"]'); expect('signature live + Ava', sig.includes('Thanks for writing') && sig.includes('Ava'), sig)
  const t0 = Date.now(); await p.locator('[data-testid="email-from-name"]').focus(); await p.keyboard.press('End'); await p.keyboard.press('x'); await p.waitForFunction(() => document.querySelector('[data-testid="email-preview-from"]')?.textContent?.includes('Shopx'), null, { timeout: 5000 }); log('  keystroke→preview ms:', Date.now() - t0)
  await p.click('[data-testid="email-preview-ack"]'); expect('ack view', (await t(p, '[data-testid="email-preview-body"]')).length > 10, await t(p, '[data-testid="email-preview-subject"]'))
  await p.fill('[data-testid="email-reply-to"]', 'nope'); await p.click('[data-testid="email-save"]', { force: true }); await settle(p)
  expect('invalid reply-to blocked', (await t(p, '[data-testid="email-reply-to-error"]')) === 'Enter a valid email address.' && (await p.locator('[data-testid="unsaved-bar"]').count()) === 1, await t(p, '[data-testid="unsaved-bar"]'))
  await p.fill('[data-testid="email-reply-to"]', 'support@goorin.com'); await p.click('[data-testid="email-save"]'); await settle(p, 900)
  expect('saved state', (await t(p, '[data-testid="email-save-state"]')) === 'All changes saved', await t(p, '[data-testid="email-save-state"]'))
})
await step('JRN-208 chat offline + guard', async () => {
  await spa(p, '/channels/chat'); await p.waitForSelector('[data-testid="preview-outside-hours"]')
  expect('toggle label', (await t(p, 'label:has([data-testid="preview-outside-hours"])')) === 'Offline', await t(p, 'label:has([data-testid="preview-outside-hours"])'))
  await p.click('[data-testid="preview-outside-hours"]'); await settle(p)
  const body = await p.locator('body').innerText(); expect('no business hours copy', !/business hours/i.test(body))
  const disp = p.locator('button', { hasText: 'Display rules' }).first(); if (await disp.count()) await disp.click(); await settle(p)
  expect('display rule label', (await p.locator('text=When the team is offline').count()) > 0)
  await p.locator('[data-testid="widget-settings-form"] input[type=text], [data-testid="widget-settings-form"] input:not([type])').first().fill('Changed').catch(() => {})
  await p.click('[data-testid="nav-settings"], a[href="/settings"]').catch(() => p.locator('a[href^="/settings"]').first().click()); await settle(p)
  expect('leave asks to discard', (await p.locator('[data-testid="unsaved-dialog"]').count()) === 1)
  await p.click('[data-testid="unsaved-discard"]').catch(() => {}); await settle(p)
})
await step('JRN-209 installation', async () => {
  await spa(p, '/channels/install'); await p.waitForSelector('[data-testid="install-domain"]'); await settle(p)
  const marks = await p.locator('[data-testid^="install-step-"][data-testid$="-marker"]').allInnerTexts()
  expect('chat steps 1-3 with checks', (await p.locator('[data-testid="install-steps"] > li').count()) === 3 && (await p.locator('[data-testid="install-steps"] > li[data-done=true]').count()) >= 2, marks.length)
  expect('fallback collapsed', !(await p.locator('[data-testid="install-snippet"]').isVisible()))
  await p.click('[data-testid="install-fallback-toggle"]'); expect('snippet shown', await p.locator('[data-testid="install-snippet"]').isVisible())
  await p.click('[data-testid="install-copy"]'); expect('Copied', (await t(p, '[data-testid="install-copy"]')) === 'Copied')
  await p.click('[data-testid="install-verify"]'); await p.waitForFunction(() => (document.querySelector('[data-testid="install-verify-result"]')?.textContent ?? '').length > 5 && !document.querySelector('[data-testid="install-verify-result"]').textContent.includes('Looking')); log('  verify:', await t(p, '[data-testid="install-verify-result"]'))
  expect('no RECOMMENDED overline', !(await p.locator('body').innerText()).includes('RECOMMENDED'))
})
await step('JRN-210 settings + account', async () => {
  const want = { account: 'Your profile, password and alerts.', users: 'Who can use the desk and what they can do.', integrations: 'Connections to your mailbox, store, AI and email. Credentials are read-only here.', csat: 'The survey customers get after a ticket is resolved.' }
  for (const [k, v] of Object.entries(want)) { await spa(p, `/settings/${k}`); expect(`description ${k}`, (await t(p, '[data-testid="settings-tab-description"]')) === v) }
  await spa(p, '/settings/account')
  const xs = await Promise.all(['current', 'next', 'confirm'].map((k) => p.locator(`[data-testid="account-password-${k}"]`).boundingBox().then((r) => Math.round(r.x))))
  const lx = await p.locator('label[for="acct-current"]').boundingBox(); expect('aligned fields + label above', new Set(xs).size === 1 && lx.y < (await p.locator('[data-testid="account-password-current"]').boundingBox()).y, xs.join(','))
  await p.fill('[data-testid="account-password-current"]', 'goorin123'); await p.click('[data-testid="account-password-current-eye"]')
  expect('eye shows', (await p.getAttribute('[data-testid="account-password-current"]', 'type')) === 'text'); await p.click('[data-testid="account-password-current-eye"]'); expect('eye hides', (await p.getAttribute('[data-testid="account-password-current"]', 'type')) === 'password')
  await p.fill('[data-testid="account-password-next"]', 'newpass123'); await p.fill('[data-testid="account-password-confirm"]', 'other123'); await p.click('[data-testid="account-password-submit"]'); await settle(p)
  expect('mismatch', (await p.locator('text=Passwords don\'t match.').count()) > 0)
  await p.fill('[data-testid="account-password-confirm"]', 'newpass123'); await p.click('[data-testid="account-password-submit"]'); await settle(p, 900)
  expect('success toast', (await p.locator('text=Password changed').count()) > 0)
  log('  sessions:', (await p.locator('[data-testid^="account-session-"]').allInnerTexts()).join(' | '))
  await p.click('[data-testid="account-sign-out-all"]'); await p.click('[data-testid="account-sign-out-confirm"]'); await settle(p, 1000)
  expect('signed out toast', (await p.locator('text=Signed out of 2 other sessions').count()) > 0)
  expect('only this browser', (await p.locator('[data-testid^="account-session-"]').allInnerTexts()).join('|') === 'This browser · Chrome on macOS · Active now', (await p.locator('[data-testid^="account-session-"]').allInnerTexts()).join('|'))
})
await step('JRN-211 users', async () => {
  await spa(p, '/settings/users'); await p.waitForSelector('[data-testid="users-table"]')
  expect('summary', (await t(p, '[data-testid="users-count"]')) === '3 members · 2 active · 1 invited', await t(p, '[data-testid="users-count"]'))
  expect('Priya invite sent', /^Invite sent .+ ago$/.test(await t(p, '[data-testid="user-last-login-priya@goorin.com"]')), await t(p, '[data-testid="user-last-login-priya@goorin.com"]'))
  await p.click('[data-testid="user-actions-priya@goorin.com"]'); await p.click('[data-testid="user-resend-invite"]'); await settle(p, 900)
  expect('resent toast', (await p.locator('text=Invite resent to priya@goorin.com').count()) > 0)
  const roles = await t(p, '[data-testid="users-roles"]'); expect('roles card', roles.includes('AI & Workflows, Channels and Settings') && roles.includes('Dashboard, Inbox and Guidance'), roles)
  await p.click('[data-testid="invite-user"]'); await p.fill('[data-testid="invite-email"]', 'lee@goorin.com'); await p.click('[data-testid="invite-send"]'); await settle(p, 900)
  expect('summary after invite', (await t(p, '[data-testid="users-count"]')) === '4 members · 2 active · 2 invited', await t(p, '[data-testid="users-count"]'))
})
await step('JRN-212 integrations', async () => {
  await spa(p, '/settings/integrations'); await p.waitForSelector('[data-testid="integration-group-inbox-store"]')
  for (const [g, ids] of [['inbox-store', ['outlook', 'shopify', 'loop']], ['ai-models', ['claude', 'grokbot']], ['email-delivery', ['resend']]]) {
    const got = await p.locator(`[data-testid="integration-group-${g}"] [data-testid^="integration-tile-"]`).evaluateAll((els) => els.map((e) => e.dataset.testid.replace('integration-tile-', '')))
    expect(`group ${g}`, got.join() === ids.join(), got.join())
  }
  const tiles = await p.locator('[data-testid^="integration-tile-"]').evaluateAll((els) => els.map((e) => ({ id: e.dataset.testid, chips: e.querySelectorAll('[data-status-chip]').length, checked: /Checked /.test(e.textContent), configured: /Configured/.test(e.textContent), manage: (e.textContent.match(/Manage/g) ?? []).length, svgChevron: !!e.querySelector('.lucide-chevron-right'), ring: e.dataset.ring, tag: e.tagName })))
  expect('one chip/Checked/Manage, no Configured or chevron', tiles.every((x) => x.chips === 1 && x.checked && !x.configured && x.manage === 1 && !x.svgChevron && x.tag === 'A'), JSON.stringify(tiles.map((x) => `${x.id.slice(17)}:${x.chips}${x.ring}`)))
  expect('office ring + reason', (await p.getAttribute('[data-testid="integration-tile-outlook"]', 'data-ring')) === 'attention' && (await t(p, '[data-testid="integration-reason-outlook"]')) === 'Needs attention: Mailbox syncing is turned off.')
  expect('grokbot red + 401', (await p.getAttribute('[data-testid="integration-tile-grokbot"]', 'data-ring')) === 'error' && (await t(p, '[data-testid="integration-reason-grokbot"]')) === '401 Unauthorized')
  for (const id of ['outlook', 'grokbot']) {
    await p.click(`[data-testid="integration-tile-${id}"]`); await settle(p, 900)
    expect(`${id} header`, (await t(p, '[data-testid="integration-back"]')) === 'All integrations' && (await p.locator(`[data-testid="test-connection-${id}"]`).count()) === 1 && (await p.locator(`[data-testid="integration-status-${id}"]`).count()) >= 1)
    expect(`${id} rows + masked`, (await p.locator('[data-testid^="integration-section-"]').count()) === 3 && !(await t(p, `[data-testid="secret-${id}"]`)).match(/sk-[A-Za-z0-9]{12,}/))
    await p.click('[data-testid="integration-back"]'); await settle(p, 900)
  }
})
await step('JRN-213 csat', async () => {
  await spa(p, '/settings/csat'); await p.waitForSelector('[data-testid="survey-preview"]')
  expect('preview heading', (await t(p, '[data-testid="survey-preview"] p')) === 'Preview')
  expect('Question 1 sentence case', (await p.locator('text="Question 1"').count()) > 0)
  const q = p.locator('[data-testid^="question-label-"]').first(); const orig = await q.inputValue(); await q.fill(''); await p.click('[data-testid="csat-save"]'); await settle(p)
  expect('empty blocked', (await p.locator('text=Add the question text.').count()) > 0 && (await p.locator('[data-testid="unsaved-bar"]').count()) === 1)
  await q.fill(orig); await p.click('[data-testid="question-move-up-1"]'); await p.click('[data-testid="csat-save"]'); await settle(p, 900)
  expect('saved toast', (await p.locator('text=CSAT settings saved').count()) > 0)
})
const SWEEP = () => {
  const main = document.querySelector('main') ?? document.body
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[aria-hidden=true],[data-testid=channels-preview],[data-sg-specimen]') }
  const over = [...main.querySelectorAll('p,span,h2,h3,h4,div,li,th,dt,label')].filter((e) => vis(e) && e.childElementCount === 0 && e.textContent.trim().length > 1 && getComputedStyle(e).textTransform === 'uppercase' && parseFloat(getComputedStyle(e).letterSpacing) > 0.3).map((e) => e.textContent.trim().slice(0, 30))
  const sliver = [...main.querySelectorAll('*')].filter((e) => { if (!vis(e)) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const bl = parseFloat(cs.borderLeftWidth); const coloured = (c) => { const m = c.match(/\d+/g)?.map(Number) ?? [0, 0, 0]; return Math.max(...m.slice(0, 3)) - Math.min(...m.slice(0, 3)) > 40 }; if (bl >= 3 && coloured(cs.borderLeftColor) && r.height > 30) return true; return cs.position === 'absolute' && r.width <= 5 && r.height > 30 && coloured(cs.backgroundColor) && parseFloat(cs.left) <= 0 }).map((e) => e.dataset.testid || e.className.toString().slice(0, 40))
  const isCard = (e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.height > 48 && r.width > 160 && parseFloat(cs.borderTopLeftRadius) >= 12 && cs.boxShadow !== 'none' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' }
  const nested = [...main.querySelectorAll('*')].filter((e) => vis(e) && isCard(e) && !e.closest('[data-testid=channels-preview],[data-testid=email-preview],[data-testid=survey-preview],[data-testid=cf-preview],[role=dialog],[data-radix-popper-content-wrapper]')).filter((e) => { let n = 0; for (let a = e.parentElement; a && a !== main; a = a.parentElement) if (isCard(a)) n++; return n >= 2 }).map((e) => e.dataset.testid || e.className.toString().slice(0, 40))
  const text = main.innerText
  const terms = ['Business hours', 'Routing', 'Macro', 'Settings → AI', 'MOCKED'].filter((w) => text.includes(w))
  return { over: [...new Set(over)], sliver, nested, terms, overflow: document.documentElement.scrollWidth - innerWidth }
}
const ROUTES = ['/dashboard', '/inbox', '/inbox/GB-1076', '/ai/voice', '/ai/replies', '/ai/workflows', '/ai/workflows/wf-order-tracking', '/ai/testing', '/guidance', '/guidance?article=ga-04', '/channels/chat', '/channels/form', '/channels/email', '/channels/install', '/settings/account', '/settings/users', '/settings/integrations', '/settings/integrations/outlook', '/settings/integrations/grokbot', '/settings/csat', '/nope-404']
await step('JRN-214 DOM sweep', async () => {
  let bad = 0
  for (const r of ROUTES) {
    await spa(p, r); await settle(p, 400)
    const s = await p.evaluate(SWEEP)
    const hdr = r === '/nope-404' || r.startsWith('/inbox') ? 1 : await p.locator('[data-testid="page-title"]').count()
    const n = s.over.length + s.sliver.length + s.nested.length + s.terms.length + (hdr ? 0 : 1)
    bad += n
    log(`  ${r.padEnd(34)} ${n ? 'BAD' : 'ok '} overlines:${s.over.join('|') || 0} slivers:${s.sliver.join('|') || 0} nested:${s.nested.join('|') || 0} terms:${s.terms.join('|') || 0} header:${hdr}`)
  }
  const tabRows = []
  for (const r of ['/ai/voice', '/channels/chat', '/settings/account']) { await spa(p, r); tabRows.push(await p.locator('[data-testid$="-tab-row"] nav').evaluate((n) => `${Math.round(n.getBoundingClientRect().top)}:${n.firstElementChild.className.slice(0, 30)}`)) }
  expect('same tab component + position', new Set(tabRows).size === 1, tabRows.join(' / '))
  const chipCls = await p.evaluate(() => 1)
  log('  Q-864 violations:', bad); if (bad) fails++
  void chipCls
})
await step('JRN-214 agent no-access', async () => {
  const a = await page(1440, 900); await a.click('[data-testid="user-menu-trigger"]'); await a.click('[data-testid="role-toggle-agent"]'); await a.keyboard.press('Escape')
  await spa(a, '/settings/account'); expect('agent no access', (await a.locator('text=/access/i').count()) > 0)
})
await step('JRN-215 tablet + phone', async () => {
  for (const [w, mobile] of [[1024, false], [768, false], [390, true]]) {
    const q = await page(w, 900, mobile); let worst = 0
    for (const r of ['/channels/chat', '/channels/form', '/channels/email', '/channels/install', '/settings/account', '/settings/users', '/settings/integrations', '/settings/csat', '/settings/integrations/outlook']) {
      await spa(q, r); worst = Math.max(worst, await q.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    }
    if (w < 1024) {
      await spa(q, '/channels/email'); const tg = q.locator('[data-testid="email-preview-pane-toggle"]')
      expect(`${w} show preview toggle`, (await tg.innerText()).includes('Show preview') && !(await q.locator('[data-testid="email-preview"]').isVisible())); await tg.click(); expect(`${w} preview below settings`, (await q.locator('[data-testid="email-preview"]').boundingBox()).y > (await q.locator('[data-testid="email-settings"]').boundingBox()).y)
    }
    if (w === 390) {
      await spa(q, '/settings/integrations'); const xs = await q.locator('[data-testid^="integration-tile-"]').evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().x)))])
      expect('390 one column tiles', xs.length === 1, xs.join())
      await spa(q, '/settings/account'); const sec = q.locator('[data-testid="account-section-password"]'); const [h, f] = await Promise.all([sec.locator('h2').boundingBox(), q.locator('[data-testid="account-password-current"]').boundingBox()])
      expect('390 rows stack', f.y > h.y + h.height && Math.abs(f.x - h.x) < 2)
    }
    expect(`${w} overflow`, worst <= 0, worst)
    await q.context().close()
  }
})
log('page errors:', errs.filter((e) => !/WebSocket/.test(e)).length, errs.filter((e) => !/WebSocket/.test(e)).slice(0, 3))
log(fails ? `FAILURES: ${fails}` : 'ALL PASS')
await b.close()
process.exit(fails ? 1 : 0)
