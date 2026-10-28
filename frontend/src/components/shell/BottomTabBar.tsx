import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { BookOpen, Inbox, LayoutDashboard, MoreHorizontal } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthContext'
import { Sheet, SheetCloseButton, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { NAV, SETTINGS } from './Sidebar'
import { useShellData } from './ShellData'

let hiders = 0
const subs = new Set<() => void>()
const notify = () => subs.forEach((l) => l())

// Full-screen phone editors (article editor, CSV import) hide the tab bar while open.
export function useHideBottomTabBar(active: boolean) {
  useEffect(() => {
    if (!active) return
    hiders++
    notify()
    return () => { hiders--; notify() }
  }, [active])
}

const TABS = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, id: 'dashboard' },
  { to: '/inbox', label: 'Inbox', Icon: Inbox, id: 'inbox' },
  { to: '/guidance', label: 'Guidance', Icon: BookOpen, id: 'guidance' },
]
const MORE = [...NAV.filter((n) => n.admin), SETTINGS]
const TAB_CLS = 'relative flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

// Phone-only bottom navigation (<640px): Dashboard / Inbox / Guidance / More. Hidden in conversations and full-screen editors.
export function BottomTabBar() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { needsHuman } = useShellData()
  const [more, setMore] = useState(false)
  const hidden = useSyncExternalStore((l) => { subs.add(l); return () => { subs.delete(l) } }, () => hiders > 0)
  useEffect(() => setMore(false), [pathname])
  if (hidden || /^\/inbox\/.+/.test(pathname)) return null
  const admin = user?.role === 'admin'
  const count = needsHuman?.length ?? 0
  const moreActive = MORE.some((m) => pathname.startsWith(m.to))
  const indicator = <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-[#B08D57]" aria-hidden data-testid="bottom-tab-active-indicator" />
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden" data-testid="bottom-tab-bar">
      <ul className="flex">
        {TABS.map(({ to, label, Icon, id }) => {
          const active = pathname.startsWith(to)
          return (
            <li key={to} className="flex-1">
              <Link to={to} aria-current={active ? 'page' : undefined} className={cn(TAB_CLS, active ? 'text-tobacco-700' : 'text-ink-muted')} data-testid={`bottom-tab-${id}`}>
                {active && indicator}
                <span className="relative">
                  <Icon className={cn('h-[22px] w-[22px]', active ? 'text-tobacco-600' : 'text-ink-muted')} aria-hidden />
                  {id === 'inbox' && count > 0 && (
                    <span className="absolute -right-3 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-semibold leading-4 text-amber-950 ring-2 ring-white" data-testid="bottom-tab-inbox-badge">
                      {count}<span className="sr-only"> need a human</span>
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          )
        })}
        {admin && (
          <li className="flex-1">
            <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" aria-expanded={more} className={cn(TAB_CLS, moreActive ? 'text-tobacco-700' : 'text-ink-muted')} data-testid="bottom-tab-more">
              {moreActive && indicator}
              <MoreHorizontal className={cn('h-[22px] w-[22px]', moreActive ? 'text-tobacco-600' : 'text-ink-muted')} aria-hidden />
              More
            </button>
          </li>
        )}
      </ul>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent aria-describedby={undefined} data-testid="bottom-more-sheet">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <SheetTitle className="text-base font-semibold text-ink">More</SheetTitle>
            <SheetCloseButton label="Close menu" />
          </div>
          <ul className="space-y-1 px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {MORE.map(({ to, label, Icon, id }) => (
              <li key={id}>
                <Link to={to} className={cn('flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', pathname.startsWith(to) ? 'bg-[#F3EEE7] text-tobacco-800' : 'text-ink')} data-testid={`bottom-more-${id}`}>
                  <Icon className="h-5 w-5 text-tobacco-600" aria-hidden /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
