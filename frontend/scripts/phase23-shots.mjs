// Phase 23 Help Center shots: node scripts/phase23-shots.mjs [baseUrl] → /app/memory/shots/phase23/
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const OUT = '/app/memory/shots/phase23'
mkdirSync(OUT, { recursive: true })
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const shot = (p, n, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full })
const ask = async (p, q) => { await p.click('[data-testid="help-search-input"]'); await p.fill('[data-testid="help-search-input"]', q); await p.waitForTimeout(250); await p.keyboard.press('Enter'); await p.waitForSelector('[data-testid="help-thinking"]', { state: 'detached' }).catch(() => {}); await p.waitForSelector('[data-testid="help-continue-chat"]', { state: 'visible' }); await p.waitForTimeout(1600) }

const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await p.goto(`${BASE}/help`); await p.waitForSelector('[data-testid="help-quick-0"]'); await p.waitForTimeout(800)
console.log('quick intents:', await p.evaluate(async () => { const out = []; for (const b of document.querySelectorAll('[data-testid^="help-quick-"]')) out.push(b.textContent); return out.length }))
await shot(p, 'home-1440'); await shot(p, 'home-1440-full', true)
await p.keyboard.press('/'); await p.keyboard.type('return', { delay: 20 }); await p.waitForTimeout(300); await shot(p, 'typeahead-1440')
console.log('suggestions:', await p.locator('[data-testid="help-search-suggestions"] li').count())
await p.keyboard.press('Escape'); await p.fill('[data-testid="help-search-input"]', '')
await ask(p, 'how long do returns take')
await p.evaluate(() => document.querySelector('[data-testid="help-answer"]').scrollIntoView({ block: 'start' })); await p.evaluate(() => scrollBy(0, -120)); await p.waitForTimeout(300)
await shot(p, 'answer-1440')
console.log('sources:', await p.locator('[data-testid^="help-source-"][data-testid$="1"], [data-testid="help-source-2"]').count(), 'related:', await p.locator('[data-testid="help-related"] a').count(), 'radius:', await p.evaluate(() => getComputedStyle(document.querySelector('[data-testid="help-answer"] article')).borderRadius))
await p.click('[data-testid="help-continue-chat"]'); await p.waitForTimeout(900); await shot(p, 'chat-carry-1440')
await p.goto(`${BASE}/help`); await p.waitForSelector('[data-testid="help-quick-0"]')
await p.click('[data-testid="help-quick-0"]'); await p.waitForSelector('[data-testid="track-email"]', { state: 'visible' }); await p.waitForTimeout(1500)
await p.fill('[data-testid="track-email"]', 'margaret.okonkwo@example.com'); await p.fill('[data-testid="track-order"]', 'GB20398'); await p.click('[data-testid="track-submit"]')
await p.waitForSelector('[data-testid="track-result"]'); await p.waitForTimeout(400)
await p.evaluate(() => document.querySelector('[data-testid="help-answer"]').scrollIntoView({ block: 'start' })); await p.evaluate(() => scrollBy(0, -120)); await p.waitForTimeout(300)
await shot(p, 'action-track-1440')
await ask(p, 'what size am I'); await p.fill('[data-testid="size-cm"]', '57'); await p.click('[data-testid="size-submit"]'); console.log('size:', await p.textContent('[data-testid="size-result"]'))
await ask(p, 'do you sell submarines'); console.log('fallback:', await p.isVisible('[data-testid="help-fallback"]'))
await p.goto(`${BASE}/help/topic/returns-exchanges`); await p.waitForSelector('[data-testid^="topic-article-"]'); await p.waitForTimeout(600); await shot(p, 'topic-1440')
await p.goto(`${BASE}/help/article/ga-01`); await p.waitForSelector('[data-testid="help-article-body"]'); await p.waitForTimeout(500)
await p.fill('[data-testid="ask-article-input"]', 'does this apply to truckers?'); await p.click('[data-testid="ask-article-submit"]'); await p.waitForSelector('[data-testid="ask-article-answer"]'); await p.waitForTimeout(300)
await shot(p, 'article-1440')

const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
await m.goto(`${BASE}/help`); await m.waitForSelector('[data-testid="help-quick-0"]'); await m.waitForTimeout(800); await shot(m, 'home-390'); await shot(m, 'home-390-full', true)
console.log('overflow 390:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await m.click('[data-testid="help-search-input"]'); await m.keyboard.type('where is my order'); await m.keyboard.press('Enter')
await m.waitForSelector('[data-testid="help-continue-chat"]', { state: 'visible' }); await m.waitForTimeout(1500)
await m.evaluate(() => document.querySelector('[data-testid="help-answer"]').scrollIntoView({ block: 'start' })); await m.evaluate(() => scrollBy(0, -90)); await m.waitForTimeout(300)
await shot(m, 'answer-390'); console.log('overflow 390 answer:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await b.close()
console.log('saved', OUT)
