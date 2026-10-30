import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Menu, Search, ShoppingBag, User } from 'lucide-react'
import { widgetApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { SupportWidget } from '@/components/widget/SupportWidget'

export const openChat = (q?: string, a?: string) => window.dispatchEvent(new CustomEvent('goorin:open-chat', { detail: { q, a } }))
const NAV = ['Shop', 'Truckers', 'USA Workshop', 'Drops', 'Last Chance']

function HelpHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-[#D9D4C7]/90 backdrop-blur-md" data-testid="help-header">
      <div className="hc-mono flex h-9 items-center justify-center gap-3 bg-[#141414] px-4 text-[11px] uppercase tracking-[0.14em] text-[#D9D4C7]" data-testid="help-announcement">
        <span>Free US shipping over $100</span><span className="text-[#35B54A]" aria-hidden>●</span><span className="max-sm:hidden">Friday Drop #346 lands 10.30</span>
      </div>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-6 max-sm:h-14 max-sm:px-4">
        <button type="button" className="hidden h-9 w-9 items-center justify-center max-lg:flex" aria-label="Menu" data-testid="help-menu"><Menu className="h-5 w-5" aria-hidden /></button>
        <Link to="/help" className="shrink-0" aria-label="Goorin Bros. Help Center" data-testid="help-logo"><img src="/images/brand/goorin-wordmark-black.svg" alt="Goorin Bros." className="h-6 w-auto max-sm:h-5" /></Link>
        <nav aria-label="Store" className="hc-mono flex items-center gap-6 text-[12px] font-semibold uppercase tracking-[0.08em] max-lg:hidden">
          {NAV.map((n) => <a key={n} href="#" onClick={(e) => e.preventDefault()} className="transition-opacity hover:opacity-60" data-testid={`help-nav-${n.toLowerCase().replace(/\s/g, '-')}`}>{n}</a>)}
        </nav>
        <div className="hc-mono ml-auto flex items-center gap-5 text-[12px] font-semibold uppercase tracking-[0.08em]">
          <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 hover:opacity-60 max-sm:hidden" data-testid="help-nav-search"><Search className="h-4 w-4" aria-hidden />Search</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 hover:opacity-60 max-md:hidden" data-testid="help-nav-login"><User className="h-4 w-4" aria-hidden />Login</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1.5 hover:opacity-60" data-testid="help-nav-cart"><ShoppingBag className="h-4 w-4" aria-hidden /><span className="max-sm:hidden">Cart</span> (0)</a>
        </div>
      </div>
    </header>
  )
}

const COLS: [string, string[]][] = [
  ['Sitemap', ['Shop all', 'Truckers', 'Fedoras', 'USA Workshop', 'Gift cards']],
  ['Support', ['Help center', 'Track my order', 'Returns', 'Size guide', 'Contact us']],
  ['Discover', ['Friday Drops', 'Our story', 'Hat shops', 'Wholesale', 'Careers']],
]

function HelpFooter() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  return (
    <footer className="bg-[#141414] text-[#D9D4C7]" data-testid="help-footer">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 pb-10 pt-20 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr] max-sm:px-5 max-sm:pt-14">
        {COLS.map(([h, links]) => (
          <div key={h}>
            <h3 className="hc-display text-[15px]">{h}</h3>
            <ul className="hc-mono mt-5 space-y-3 text-[12px] uppercase tracking-[0.08em]">
              {links.map((l) => <li key={l}><a href="#" onClick={(e) => e.preventDefault()} className="group inline-flex items-center gap-2 transition-colors hover:text-white" data-testid={`footer-link-${l.toLowerCase().replace(/\s/g, '-')}`}><ArrowRight className="h-3.5 w-3.5 text-[#35B54A] transition-transform group-hover:translate-x-0.5" aria-hidden />{l}</a></li>)}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="hc-display text-[15px]">Sign up for exclusive updates</h3>
          <p className="mt-4 text-sm text-[#D9D4C7]/70">Drop reminders, restocks and the occasional story from the workshop.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (email.includes('@')) setDone(true) }} className="mt-5 flex h-12 items-center rounded-full bg-[#262626] pl-5 pr-1.5 ring-1 ring-white/10 focus-within:ring-[#35B54A]" data-testid="footer-signup">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" aria-label="Email address" className="hc-mono min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-[#D9D4C7]/50 focus:outline-none" data-testid="footer-signup-email" />
            <button type="submit" aria-label="Sign up" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D9D4C7] text-[#141414] transition-transform hover:scale-105" data-testid="footer-signup-submit"><ArrowRight className="h-4 w-4" aria-hidden /></button>
          </form>
          {done && <p className="hc-mono mt-3 text-[12px] uppercase tracking-[0.08em] text-[#35B54A]" role="status" data-testid="footer-signup-done">You're on the list.</p>}
          <div className="hc-mono mt-8 flex gap-3 text-[12px] uppercase">
            <select aria-label="Language" className="h-10 rounded-full bg-[#262626] px-4 ring-1 ring-white/10" data-testid="footer-language"><option>English (US)</option><option>Español</option><option>Français</option></select>
            <select aria-label="Currency" className="h-10 rounded-full bg-[#262626] px-4 ring-1 ring-white/10" data-testid="footer-currency"><option>USD $</option><option>CAD $</option><option>GBP £</option><option>EUR €</option></select>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1440px] overflow-hidden px-4" aria-hidden>
        <p className="hc-display select-none whitespace-nowrap text-center text-[18.6vw] leading-[0.78] text-[#D9D4C7] min-[1440px]:text-[266px]" data-testid="footer-wordmark">GOORIN</p>
      </div>
      <p className="hc-mono mx-auto flex max-w-[1440px] justify-between px-6 py-6 text-[11px] uppercase tracking-[0.1em] text-[#D9D4C7]/50"><span>© 2026 Goorin Bros. Est. 1895</span><span>Privacy · Terms</span></p>
    </footer>
  )
}

export function HelpShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { data: settings } = useApi(() => widgetApi.getWidgetSettings(), [])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useEffect(() => { const t = document.title; document.title = 'Customer Support · Goorin Bros.'; return () => { document.title = t } }, [])
  return (
    <div className="help-root min-h-screen bg-[#D9D4C7] text-[#141414]" data-testid="help-root">
      <HelpHeader />
      <main>{children}</main>
      <HelpFooter />
      {settings && <SupportWidget settings={settings} pageType="other" pagePath={pathname} />}
    </div>
  )
}
