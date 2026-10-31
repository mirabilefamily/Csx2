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
console.log('folders:', await p.locator('[data-testid^="help-folder-"]').count(), 'hero h:', await p.evaluate(() => document.querySelector('[data-testid="help-hero"]').getBoundingClientRect().height))
await p.click('[data-testid="help-search-input"]'); await p.keyboard.type('refund', { delay: 20 }); await p.waitForTimeout(250); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(250); await shot(p, 'home-typeahead-1440'); console.log('active bg:', await p.evaluate(() => getComputedStyle(document.querySelector('[data-testid="help-suggestion-0"]')).backgroundColor))
console.log('suggestions:', await p.locator('[data-testid^="help-suggestion-"]').count()); await p.keyboard.press('Enter'); await p.waitForSelector('[data-testid="help-article-body"]'); console.log('suggestion →', p.url())
await go(p, '/help', '[data-testid="help-folder-orders-shipping"]')
await p.click('[data-testid="help-folder-orders-shipping"]'); await p.waitForSelector('[data-testid="help-folder-page"] h1'); await p.waitForTimeout(400); await shot(p, 'folder-1440', true)
console.log('folder back:', await backX(p), 'see all:', await p.locator('[data-testid^="help-see-all-"]').count())
await p.click('[data-testid="help-sub-link-tracking"]'); await p.waitForSelector('[data-testid="help-subfolder-page"] h1'); await p.waitForTimeout(400); await shot(p, 'subfolder-1440')
console.log('sub back:', await backX(p))
await p.click('[data-testid="help-article-link-track-your-order"]'); await p.waitForSelector('[data-testid="help-article-body"]'); await p.waitForTimeout(400)
await p.click('[data-testid="help-vote-yes"]'); await shot(p, 'article-1440', true)
console.log('article back:', await backX(p), await p.textContent('[data-testid="help-back"]'), 'meta:', await p.textContent('[data-testid="help-article-meta"]'))
await p.click('[data-testid="help-back"]'); await p.waitForSelector('[data-testid="help-subfolder-page"] h1'); console.log('back ok:', p.url())
await go(p, '/help', '[data-testid="help-search-input"]'); await p.fill('[data-testid="help-search-input"]', 'returns'); await p.keyboard.press('Enter')
await p.waitForSelector('[data-testid="help-results-count"]'); await p.waitForTimeout(300); await shot(p, 'search-1440', true)
console.log('search:', p.url(), await p.textContent('[data-testid="help-results-count"]'), 'quick:', await p.isVisible('[data-testid="help-quick-answer"]'))
await go(p, '/help/search?q=submarine', '[data-testid="help-no-results"]'); await shot(p, 'search-empty-1440'); console.log('empty ok')
await p.goto(`${BASE}/help/article/ga-08`); await p.waitForSelector('[data-testid="help-article-body"]'); console.log('legacy article →', p.url())
await p.goto(`${BASE}/help/topic/cleaning-care`); await p.waitForSelector('[data-testid="help-folder-page"] h1'); console.log('legacy topic →', p.url())

const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
await go(m, '/help', '[data-testid="help-folder-orders-shipping"]'); await shot(m, 'home-390'); await shot(m, 'home-390-full', true)
console.log('overflow 390 home:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await go(m, '/help/orders-shipping/tracking/track-your-order', '[data-testid="help-article-body"]'); await shot(m, 'article-390')
console.log('overflow 390 article:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'crumbs hidden:', !(await m.isVisible('[data-testid="help-breadcrumb"]')))
await b.close()
console.log('saved', OUT)
