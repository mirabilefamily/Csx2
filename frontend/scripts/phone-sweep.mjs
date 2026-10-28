// Phone sweep (Q-38..Q-41): node scripts/phone-sweep.mjs [baseUrl]
// For 360/390/430 widths: horizontal overflow, tap targets < 44px, inputs < 16px; axe + screenshots at 390.
import { chromium } from 'playwright-core'
import { AxeBuilder } from '@axe-core/playwright'

const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/test_reports/phase7'
const ONLY = process.env.ONLY
const ROUTES = [
  ['dashboard', '/dashboard'],
  ['inbox', '/inbox'],
  ['conversation', '/inbox/GB-1076'],
  ['guidance-articles', '/guidance?tab=articles'],
  ['guidance-import', '/guidance?tab=import'],
  ['ai-voice', '/ai/voice'],
  ['ai-testing', '/ai/testing'],
  ['ai-workflows', '/ai/workflows'],
  ['ai-workflow-editor', '/ai/workflows/wf-order-tracking'],
  ['channels-form', '/channels/chat?kind=form'],
  ['channels-email', '/channels/email'],
  ['settings-account', '/settings/account'],
  ['settings-csat', '/settings/csat'],
  ['inbox-trash', '/inbox?view=trash'],
  ['settings-integrations', '/settings/integrations'],
  ['integration-detail', '/settings/integrations/grokbot'],
  ['ai-replies', '/ai/replies'],
  ['channels-chat', '/channels/chat'],
  ['channels-install', '/channels/install'],
  ['shopify-overview', '/settings/integrations/shopify'],
  ['settings-users', '/settings/users'],
  ['theme-editor', '/widget-demo/theme-editor'],
  ['styleguide', '/styleguide'],
].filter(([n]) => !ONLY || ONLY.split(',').includes(n))
const WIDTHS = (process.env.WIDTHS ?? '360,390,430').split(',').map(Number)

const METRICS = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && !e.closest('[aria-hidden=true],[inert]') }
  const inlineText = (e) => e.tagName === 'A' && getComputedStyle(e).display === 'inline'
  // A control wrapped in a <label> (or a labelled row) is hit through the label, so measure the larger box.
  const box = (e) => { const r = e.getBoundingClientRect(); const l = e.closest('label')?.getBoundingClientRect(); return l && l.height >= r.height ? l : r }
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], [role=radio], [role=checkbox], [role=combobox]'
  const small = [...document.querySelectorAll(sel)].filter((e) => vis(e) && !inlineText(e) && !e.closest('.recharts-wrapper, [data-sg-specimen]')).map((e) => {
    const r = box(e)
    return r.height < 43.5 || r.width < 43.5 ? `${e.getAttribute('data-testid') || e.getAttribute('aria-label') || e.textContent?.trim().slice(0, 24) || e.tagName}(${Math.round(r.width)}x${Math.round(r.height)})` : null
  }).filter(Boolean)
  const fonts = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]), textarea, select, [contenteditable=true]')].filter(vis).filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.getAttribute('data-testid') || e.id || e.tagName)
  return { overflow: document.documentElement.scrollWidth - innerWidth, small: [...new Set(small)], fonts: [...new Set(fonts)] }
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] })
let total = { overflow: 0, small: 0, fonts: 0, axe: 0 }
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await page.goto(`${BASE}/login`)
  await page.fill('input[type=email]', 'ava@goorin.com')
  await page.fill('input[type=password]', 'goorin123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/dashboard')
  for (const [name, url] of ROUTES) {
    await page.goto(`${BASE}${url}`)
    await page.waitForTimeout(1600)
    const m = await page.evaluate(METRICS)
    let axe = ''
    if (w === 390) {
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      total.axe += bad.reduce((n, v) => n + v.nodes.length, 0)
      axe = ` axe:${bad.length ? bad.map((v) => `${v.id}x${v.nodes.length}[${v.nodes[0].target.join(' ')}]`).join(',') : 0}`
      await page.screenshot({ path: `${OUT}/${name}-390.png`, fullPage: false })
    }
    total.overflow += m.overflow > 0 ? 1 : 0
    total.small += m.small.length
    total.fonts += m.fonts.length
    console.log(`${w} ${name.padEnd(22)} overflow:${m.overflow}${axe} small:${m.small.length ? m.small.join(', ') : 0} fonts<16:${m.fonts.length ? m.fonts.join(',') : 0}`)
  }
  if (errs.length) console.log(`${w} console errors: ${[...new Set(errs)].slice(0, 5).join(' | ')}`)
  await ctx.close()
}
await browser.close()
console.log(`TOTAL routes-with-overflow:${total.overflow} small-targets:${total.small} small-fonts:${total.fonts} axe-serious-nodes@390:${total.axe}`)
