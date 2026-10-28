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
  const lx = await p.locator('label[for="acct-current"]').boundingBox(); expect('aligned fields + label above', xs[0] === xs[1] && xs[2] > xs[1] && lx.y < (await p.locator('[data-testid="account-password-current"]').boundingBox()).y, xs.join(','))
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
await step('JRN-216 fill the page', async () => {
  const SCREENS = [['/channels/chat', '[data-testid="widget-settings-form"]', '[data-testid="channels-preview"]', '[data-testid="channels-page"]', '[data-testid="ws-section-branding"]'], ['/channels/form', '[data-testid="contact-form-editor"] > div:first-child', '[data-testid="cf-preview-pane"]', '[data-testid="channels-status-form"]', '[data-testid="cf-appearance"]'], ['/channels/email', '[data-testid="email-settings"]', '[data-testid="email-preview-pane"]', '[data-testid="channels-status-email"]', '[data-testid="email-settings"]'], ['/settings/csat', '[data-testid="csat-settings-tab"] > div:first-child', '[data-testid="csat-preview-pane"]', '[data-testid="settings-tab-row"]', null], ['/ai/voice', '[data-testid="brand-voice-tab"] > div:first-child', '[data-testid="bv-rail"]', '[data-testid="ai-tab-row"]', null]]
  for (const w of [1440, 1920]) {
    const q = await page(w, 1000)
    for (const [r, set, pv, strip, card] of SCREENS) {
      await spa(q, r); await q.waitForSelector(pv); await settle(q, 400)
      if (card === '[data-testid="ws-section-branding"]') { const bt = q.locator(`${card} button`).first(); if ((await bt.getAttribute('aria-expanded')) !== 'true') await bt.click(); await settle(q, 300) }
      const [a, c, s] = await Promise.all([set, pv, strip].map((x) => q.locator(x).first().boundingBox()))
      const gap = Math.round(c.x - (a.x + a.width)), right = Math.round(c.x + c.width - (s.x + s.width))
      const rights = card ? await q.locator(card).first().evaluate((el) => { const fs = [...el.querySelectorAll('input:not([type=checkbox]):not([type=color]):not([type=hidden]):not([type=file]):not([type=radio]), textarea')].filter((f) => f.offsetParent); const cardR = el.getBoundingClientRect().right; const rs = fs.map((f) => Math.round(f.getBoundingClientRect().right)); return { rs, cardR: Math.round(cardR) } }) : { rs: [], cardR: 0 }
      const maxR = Math.max(...rights.rs, 0), aligned = rights.rs.every((x) => Math.abs(x - maxR) <= 2 || x < maxR - 100)
      const paired = rights.rs.filter((x) => Math.abs(x - maxR) > 2).length
      expect(`${w} ${r} gap ${gap} ≤32, preview right ${right} ±2, fields share right edge`, gap >= 0 && gap <= 32 && Math.abs(right) <= 2 && (!card || rights.rs.length === 0 || (aligned && maxR >= rights.cardR - 64)), `paired-left:${paired} fields:${rights.rs.length}`)
    }
    for (const r of ['/settings/account', '/settings/integrations/outlook']) {
      await spa(q, r); await settle(q, 600)
      const ok = await q.evaluate(() => { const card = document.querySelector('[data-testid="account-tab"]') ?? document.querySelector('[data-testid="integration-section-credentials"]')?.parentElement; if (!card) return 'no card'; const cr = card.getBoundingClientRect().right; const items = [...card.querySelectorAll('section > div:last-child')]; return items.map((d) => Math.round(cr - d.getBoundingClientRect().right)).join(',') })
      expect(`${w} ${r} controls reach card padding`, String(ok).split(',').every((x) => Number(x) <= 40), ok)
    }
    if (w === 1440) { await spa(q, '/settings/account'); const [n, c] = await Promise.all(['next', 'confirm'].map((k) => q.locator(`[data-testid="account-password-${k}"]`).boundingBox())); expect('1440 new + confirm side by side', Math.abs(n.y - c.y) < 2 && c.x > n.x, `${Math.round(n.x)},${Math.round(c.x)}`) }
    await q.context().close()
  }
})
await step('JRN-217 chat preview fits the viewport', async () => {
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    const q = await page(w, h); await spa(q, '/channels/chat'); await q.waitForSelector('[data-testid="preview-stage"]'); await settle(q, 600)
    for (const v of ['home', 'active_chat', 'order_tracking']) {
      await q.click(`[data-testid="preview-view-${v}"]`); await settle(q, 500)
      if (v === 'home') expect(`${w} REQ-970 preview shows "See last conversation" last`, (await q.locator('[data-testid="channels-preview"] [data-testid^="widget-starter-"]').last().innerText()) === 'See last conversation')
      const scale = Number(await q.locator('[data-testid="preview-stage"]').getAttribute('data-scale'))
      const [pb, lb, sb, cb] = await Promise.all(['widget-panel', 'widget-launcher', 'preview-surface', 'preview-caption'].map((x) => q.locator(`[data-testid="channels-preview"] [data-testid="${x}"]`).first().boundingBox()))
      const sy = await q.evaluate(() => scrollY)
      const scrolls = await q.locator('[data-testid="preview-surface"]').evaluate((e) => e.scrollHeight > e.clientHeight + 1)
      const visible = pb.y >= sb.y - 1 && lb.y + lb.height <= sb.y + sb.height + 1 && lb.y + lb.height <= h
      expect(`${w}×${h} ${v} canvas + caption end ≥24px above fold (no page scroll)`, sy === 0 && sb.y + sb.height <= h - 24 && cb.y + cb.height <= h - 24 + 1 && cb.y >= sb.y + sb.height - 1, `canvas ${Math.round(sb.y)}-${Math.round(sb.y + sb.height)} caption→${Math.round(cb.y + cb.height)}`)
      expect(`${w}×${h} ${v} scale ${scale} ≥0.85, ${w === 1920 ? 'whole widget + launcher visible' : 'visible or canvas scrolls'}`, scale >= 0.85 && (w === 1920 ? visible && !scrolls : visible || scrolls), `panel ${Math.round(pb.y)}-${Math.round(pb.y + pb.height)} launcher→${Math.round(lb.y + lb.height)} scrolls ${scrolls}`)
    }
    await q.context().close()
  }
  const wq = await page(1440, 900); await wq.goto(`${BASE}/widget-demo`); await settle(wq, 1500); await wq.click('[data-testid="widget-launcher"]'); await settle(wq, 600)
  const look = await wq.locator('[data-testid="widget-panel"]').evaluate((e) => { const cs = getComputedStyle(e); return { bg: cs.backgroundColor, blur: cs.backdropFilter, r: parseFloat(cs.borderTopLeftRadius), bw: cs.borderTopWidth, h: Math.round(e.getBoundingClientRect().height) } })
  expect('REQ-962 Home frosted warm panel, radius ≥36, no border', look.bg !== 'rgb(255, 255, 255)' && look.blur.includes('blur') && look.r >= 36 && look.bw === '0px', JSON.stringify(look))
  expect('REQ-968 no greeting by default, no Back on Home', (await wq.locator('[data-testid="widget-home-greeting"]').count()) === 0 && (await wq.locator('[data-testid="widget-back"]').count()) === 0)
  const [stb, inb, bodyb] = await Promise.all(['widget-starters', 'widget-composer-input', 'widget-body'].map((x) => wq.locator(`[data-testid="${x}"]`).boundingBox()))
  expect('REQ-968 starters at the bottom, above input', stb.y > bodyb.y + bodyb.height * 0.4 && stb.y + stb.height < inb.y, `${Math.round(stb.y)}-${Math.round(stb.y + stb.height)} / input ${Math.round(inb.y)}`)
  const sp = await wq.locator('[data-testid^="widget-starter-"]').evaluateAll((els) => els.map((e) => { const cs = getComputedStyle(e); return `${cs.fontSize}|${Math.round(e.getBoundingClientRect().height)}|${cs.backgroundColor}` }))
  expect('REQ-969 starters translucent 16px ~44px', sp.every((x) => { const [f, h, bg] = x.split('|'); return f === '16px' && +h >= 42 && /rgba\(255, 255, 255, 0\.4/.test(bg) }), sp[0])
  expect('REQ-961 live panel height', look.h >= 680 || look.h >= 900 - 112 - 2, look.h)
  expect('REQ-967 Home placeholder + no send while empty', (await wq.locator('[data-testid="widget-composer-input"]').getAttribute('placeholder')) === 'Ask anything' && (await wq.locator('[data-testid="widget-send"]').count()) === 0)
  await wq.fill('[data-testid="widget-composer-input"]', 'Is the Hampton Wool Fedora water resistant?'); expect('REQ-967 send appears with text', (await wq.locator('[data-testid="widget-send"]').count()) === 1)
  await wq.press('[data-testid="widget-composer-input"]', 'Enter'); await settle(wq, 2600)
  const cu = await wq.locator('[data-testid="widget-msg-customer"] .gw-bubble-text').last().evaluate((e) => { const cs = getComputedStyle(e); return `${cs.backgroundColor} ${cs.borderTopLeftRadius} ${cs.fontSize}` })
  expect('REQ-964 customer pill #F2F3F5 r22 16px', cu === 'rgb(242, 243, 245) 22px 16px', cu)
  const ai = await wq.locator('[data-testid="widget-msg-ai"] .gw-ai-text').last().evaluate((e) => { const cs = getComputedStyle(e); return `${cs.fontSize} ${(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2)} ${cs.backgroundColor}` })
  expect('REQ-964 AI plain 16px/1.55', ai === '16px 1.55 rgba(0, 0, 0, 0)', ai)
  await settle(wq, 400)
  expect('REQ-962 conversation surface white', (await wq.locator('[data-testid="widget-panel"]').evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(255, 255, 255)')
  expect('REQ-967 Reply placeholder', (await wq.locator('[data-testid="widget-composer-input"]').getAttribute('placeholder')) === 'Reply')
  await wq.locator('[data-testid="widget-thumb-up"]').last().click(); await settle(wq, 200)
  const th = await wq.locator('[data-testid="widget-thumbs"]').last().evaluate((e) => [...e.querySelectorAll('button')].map((x) => getComputedStyle(x).backgroundColor).join('|'))
  expect('REQ-965 chosen thumb filled dark, other outline', th.startsWith('rgb(31, 29, 26)|') && !th.endsWith('rgb(31, 29, 26)'), th)
  const fb = await wq.locator('[data-testid="widget-float-bar"] button').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
  expect('REQ-963 floating controls ~44px', fb.every((x) => x >= 42 && x <= 46), fb.join())
  for (const q2 of ['Do you ship to Canada?', 'How long does it take?']) { await wq.fill('[data-testid="widget-composer-input"]', q2); await wq.press('[data-testid="widget-composer-input"]', 'Enter'); await settle(wq, 2600) }
  expect('REQ-966 no scroll-to-latest at bottom', (await wq.locator('[data-testid="widget-scroll-latest"]').count()) === 0)
  await wq.locator('[data-testid="widget-body"]').evaluate((e) => { e.scrollTop = 0 }); await settle(wq, 300)
  expect('REQ-966 scroll-to-latest when scrolled up', (await wq.locator('[data-testid="widget-scroll-latest"]').count()) === 1)
  await wq.click('[data-testid="widget-scroll-latest"]'); await settle(wq, 900)
  expect('REQ-966 tap returns to latest', (await wq.locator('[data-testid="widget-scroll-latest"]').count()) === 0)
  await wq.context().close()
})
await step('JRN-218 inbox reply at end of thread', async () => {
  const q = await page(1440, 900); await spa(q, '/inbox/GB-1076'); await q.waitForSelector('[data-testid="message-thread"]'); await settle(q, 900)
  const inCol = await q.evaluate(() => { const col = document.querySelector('[data-testid="thread-column"]'); const ra = document.querySelector('[data-testid="reply-area"]'); const dd = document.querySelector('[data-testid="draft-dock"]'); return !!(col && ra && col.contains(ra) && dd && ra.contains(dd)) })
  expect('REQ-971 draft-dock inside thread-column (not a fixed dock)', inCol)
  const [mt, dc] = await Promise.all(['message-thread', 'draft-dock'].map((x) => q.locator(`[data-testid="${x}"]`).boundingBox()))
  expect('REQ-971 draft same width as messages', Math.abs(mt.width - dc.width) <= 2 && Math.abs(mt.x - dc.x) <= 2, `${Math.round(mt.width)}/${Math.round(dc.width)}`)
  const gapB = await q.locator('[data-testid="thread-scroll"]').evaluate((e) => Math.round(e.scrollHeight - e.scrollTop - e.clientHeight))
  expect('REQ-972 opens at the bottom', gapB <= 4, gapB)
  expect('REQ-973 no Reply pill while reply area in view', (await q.locator('[data-testid="jump-to-reply"]').count()) === 0)
  await q.locator('[data-testid="thread-scroll"]').evaluate((e) => { e.scrollTop = 0 }); await settle(q, 400)
  expect('REQ-973 Reply pill when scrolled up', await q.locator('[data-testid="jump-to-reply"]').isVisible())
  const pill = await q.locator('[data-testid="jump-to-reply"]').boundingBox(), ts = await q.locator('[data-testid="thread-scroll"]').boundingBox()
  expect('REQ-973 pill bottom-centre of thread', Math.abs(pill.x + pill.width / 2 - (ts.x + ts.width / 2)) <= 12 && ts.y + ts.height - (pill.y + pill.height) <= 40, `${Math.round(pill.x + pill.width / 2)} vs ${Math.round(ts.x + ts.width / 2)}`)
  await q.click('[data-testid="jump-to-reply"]'); await settle(q, 1000)
  expect('REQ-973 pill scrolls to reply + focuses Approve & send', (await q.locator('[data-testid="jump-to-reply"]').count()) === 0 && await q.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'draft-approve'), await q.evaluate(() => document.activeElement?.getAttribute('data-testid')))
  await q.locator('[data-testid="thread-scroll"]').evaluate((e) => { e.scrollTop = 0 }); await settle(q, 300)
  await q.locator('body').click({ position: { x: 5, y: 5 } }); await q.keyboard.press('r'); await settle(q, 1000)
  expect('REQ-973 reply shortcut scrolls + focuses Approve & send', await q.evaluate(() => { const r = document.querySelector('[data-testid="reply-area"]').getBoundingClientRect(); return document.activeElement?.getAttribute('data-testid') === 'draft-approve' && r.bottom <= innerHeight + 2 }), await q.evaluate(() => document.activeElement?.getAttribute('data-testid')))
  await q.click('[data-testid="draft-write-own"]'); await settle(q, 500)
  expect('REQ-971 composer inside thread-column', await q.evaluate(() => document.querySelector('[data-testid="thread-column"]').contains(document.querySelector('[data-testid="composer"]'))))
  const ed = q.locator('[data-testid="composer-editor"]'); await ed.click()
  await q.keyboard.type('Thanks for waiting, Margaret. Line one.'); for (let i = 0; i < 5; i++) { await q.keyboard.press('Shift+Enter'); await q.keyboard.type(`More detail ${i}`) }
  await settle(q, 300)
  const gapG = await q.locator('[data-testid="thread-scroll"]').evaluate((e) => Math.round(e.scrollHeight - e.scrollTop - e.clientHeight))
  expect('REQ-971 stays pinned while composer grows', gapG <= 4, gapG)
  const before = await q.locator('[data-testid="message-thread"] > li').count()
  await q.click('[data-testid="composer-send"]'); await settle(q, 1200)
  const after = (await q.locator('[data-testid="message-thread"] > li').last().innerText()).includes('Thanks for waiting, Margaret') ? before + 1 : before
  const [lastMsg, comp] = await Promise.all([q.locator('[data-testid="message-thread"] > li').last().boundingBox(), q.locator('[data-testid="reply-area"]').boundingBox()])
  const gapS = await q.locator('[data-testid="thread-scroll"]').evaluate((e) => Math.round(e.scrollHeight - e.scrollTop - e.clientHeight))
  expect('REQ-972 sent message above reply area, pinned to bottom', after > before && (!lastMsg || lastMsg.y < comp.y) && gapS <= 4, `${before}→${after} gap ${gapS}`)
  await q.locator('[data-testid="thread-scroll"]').evaluate((e) => { e.scrollTop = 0 }); await settle(q, 300)
  await q.locator('body').click({ position: { x: 5, y: 5 } }); await q.keyboard.press('r'); await settle(q, 1000)
  expect('REQ-973 reply shortcut with composer open focuses the composer', await q.evaluate(() => { const ra = document.querySelector('[data-testid="reply-area"]'); const r = ra.getBoundingClientRect(); return ra.contains(document.activeElement) && r.bottom <= innerHeight + 2 }))
  await spa(q, '/inbox/GB-1080'); await q.waitForSelector('[data-testid="ai-handling-banner"]'); await settle(q, 600)
  expect('REQ-975 AI-handling bar at end of thread', await q.evaluate(() => document.querySelector('[data-testid="thread-column"]').contains(document.querySelector('[data-testid="ai-handling-banner"]'))))
  await q.context().close()
  const m = await page(390, 844, true); await spa(m, '/inbox/GB-1076'); await m.waitForSelector('[data-testid="draft-dock"]'); await settle(m, 800)
  const docked = await m.evaluate(() => { const d = document.querySelector('[data-testid="draft-dock"]'); return !document.querySelector('[data-testid="thread-scroll"]').contains(d) && Math.round(d.getBoundingClientRect().bottom) })
  expect('REQ-974 phone keeps the docked reply', docked && docked >= 844 - 2 && (await m.locator('[data-testid="jump-to-reply"]').count()) === 0, docked)
  await m.context().close()
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
