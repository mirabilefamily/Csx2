// Phase 24 Help Center KB shots: node scripts/phase24-shots.mjs [baseUrl] → /app/memory/shots/phase24/
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase24'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const shot = (p, n, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full })
const go = async (p, path, sel) => { await p.goto(`${BASE}${path}`); await p.waitForSelector(sel); await p.waitForTimeout(500) }
const backX = (p) => p.evaluate(() => { const r = document.querySelector('[data-testid="help-back"]')?.getBoundingClientRect(); return r ? `${Math.round(r.x)},${Math.round(r.y)} h${Math.round(r.height)}` : null })

const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await go(p, '/help', '[data-testid="help-folder-orders-shipping"]'); await shot(p, 'home-1440'); await shot(p, 'home-1440-full', true)
console.log('counts:', await p.evaluate(() => [...document.querySelectorAll('[data-testid^="help-folder-"]')].map((e) => e.textContent.match(/(\d+) articles/)?.[1]).join(',')))
console.log('chat row gone:', !(await p.isVisible('[data-testid="help-chat-line"]')))
await p.click('[data-testid="help-search-input"]'); await p.keyboard.type('refund', { delay: 20 }); await p.waitForTimeout(250); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(250); await shot(p, 'home-typeahead-1440')
console.log('suggest path:', await p.textContent('[data-testid="help-suggestion-0"]')); await p.keyboard.press('Enter'); await p.waitForSelector('[data-testid="help-article-body"]'); console.log('suggestion →', p.url())
await go(p, '/help', '[data-testid="help-folder-orders-shipping"]')
await p.click('[data-testid="help-folder-orders-shipping"]'); await p.waitForSelector('[data-testid="help-folder-articles"]'); await p.waitForTimeout(400); await shot(p, 'folder-1440', true)
console.log('folder back:', await backX(p), 'rows:', await p.locator('[data-testid="help-folder-articles"] li').count())
await go(p, '/help/friday-drops', '[data-testid="help-folder-articles"]'); await shot(p, 'folder-2-1440', true); console.log('drops rows:', await p.locator('[data-testid="help-folder-articles"] li').count())
await go(p, '/help/orders-shipping', '[data-testid="help-folder-articles"]')
await p.click('[data-testid="help-article-link-track-your-order"]'); await p.waitForSelector('[data-testid="help-article-body"]'); await p.waitForTimeout(400)
await p.click('[data-testid="help-vote-yes"]'); await shot(p, 'article-1440', true)
console.log('article back:', await backX(p), await p.textContent('[data-testid="help-back"]'), 'crumbs:', await p.textContent('[data-testid="help-breadcrumb"]'), 'more:', await p.locator('[data-testid="help-more"] li').count())
await p.click('[data-testid="help-back"]'); await p.waitForSelector('[data-testid="help-folder-articles"]'); console.log('back →', p.url())
await go(p, '/help', '[data-testid="help-search-input"]'); await p.fill('[data-testid="help-search-input"]', 'returns'); await p.keyboard.press('Enter')
await p.waitForSelector('[data-testid="help-results-count"]'); await p.waitForTimeout(300); await shot(p, 'search-1440', true)
console.log('search:', await p.textContent('[data-testid="help-results-count"]'), 'quick:', await p.isVisible('[data-testid="help-quick-answer"]'))
await go(p, '/help/search?q=submarine', '[data-testid="help-no-results"]'); console.log('empty ok, chat btn:', await p.locator('[data-testid="help-open-chat"]').count())
for (const u of ['/help/article/ga-08', '/help/topic/cleaning-care', '/help/orders-shipping/tracking/track-your-order', '/help/orders-shipping/changes/cancel-order', '/help/orders-shipping/tracking']) {
  await p.goto(`${BASE}${u}`); await p.waitForSelector('[data-testid="help-article-body"], [data-testid="help-folder-articles"]'); console.log(u, '→', p.url().replace(BASE, ''))
}
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
await go(m, '/help', '[data-testid="help-folder-orders-shipping"]'); await shot(m, 'home-390')
console.log('overflow 390 home:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await go(m, '/help/orders-shipping/track-your-order', '[data-testid="help-article-body"]'); await shot(m, 'article-390')
console.log('overflow 390 article:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await b.close()
console.log('saved', OUT)
