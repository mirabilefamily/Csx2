import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Inbox, LayoutDashboard, MessagesSquare, PanelLeftClose, PanelLeftOpen, Settings, Sparkles, type LucideIcon } from 'lucide-react'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/overlay'
import { Wordmark } from '@/components/Wordmark'
import { useAuth } from '@/components/auth/AuthContext'
import { useShellData } from './ShellData'
import { cn } from '@/lib/utils'

export interface NavItem { to: string; label: string; Icon: LucideIcon; id: string; admin?: boolean }
const MAIN: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, id: 'dashboard' },
  { to: '/inbox', label: 'Inbox', Icon: Inbox, id: 'inbox' },
]
const KNOWLEDGE: NavItem[] = [
  { to: '/ai', label: 'AI & Workflows', Icon: Sparkles, id: 'ai', admin: true },
  { to: '/guidance', label: 'Guidance', Icon: BookOpen, id: 'guidance' },
  { to: '/channels', label: 'Channels', Icon: MessagesSquare, id: 'channels', admin: true },
]
export const SETTINGS: NavItem = { to: '/settings', label: 'Settings', Icon: Settings, id: 'settings', admin: true }
export const NAV: NavItem[] = [...MAIN, ...KNOWLEDGE]

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D57] focus-visible:ring-offset-2 focus-visible:ring-offset-white'

export const navItemClass = (isActive: boolean, collapsed: boolean, hover = false) =>
  cn(
    'relative flex h-11 items-center rounded-[11px] text-sm font-medium transition-colors',
    FOCUS,
    collapsed ? 'mx-auto w-11 justify-center' : 'gap-3 px-3',
    isActive ? 'bg-[#F3EEE7] text-tobacco-800 shadow-[0_1px_2px_rgba(31,29,26,0.06),inset_0_0_0_1px_rgba(107,79,58,0.12)]' : hover ? 'bg-surface-muted text-ink' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
  )
export const NAV_BADGE_COLLAPSED = 'absolute -right-2.5 -top-2 h-4 min-w-4 px-1 text-[10px] leading-4 ring-2 ring-white'

function NeedsHumanBadge({ collapsed }: { collapsed: boolean }) {
  const { needsHuman, loading } = useShellData()
  if (loading || !needsHuman || needsHuman.length === 0) return null
  return (
    <span
      data-testid="inbox-needs-human-badge"
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-amber-400 font-semibold text-amber-950',
        collapsed ? NAV_BADGE_COLLAPSED : 'ml-auto min-w-[20px] px-1.5 text-[11px] leading-5',
      )}
    >
      {needsHuman.length}
      <span className="sr-only"> need a human</span>
    </span>
  )
}

function Item({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { confirmLeave } = useUnsavedGuard()
  const { to, label, Icon, id } = item
  // Plain string className: Radix Slot (TooltipTrigger asChild) can't merge NavLink's function className.
  const isActive = pathname === to || pathname.startsWith(`${to}/`)
  const link = (
    <NavLink
      to={to}
      onClick={(e) => { e.preventDefault(); confirmLeave(() => navigate(to)) }}
      data-testid={`nav-${id}`}
      data-active={isActive}
      aria-current={isActive ? 'page' : undefined}
      className={navItemClass(isActive, collapsed)}
    >
      {collapsed && <span className="sr-only">{label}</span>}
      {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#B08D57]" aria-hidden data-testid="nav-active-indicator" />}
      <span className="relative flex">
        <Icon className={cn('h-[19px] w-[19px]', isActive ? 'text-tobacco-600' : 'text-ink-muted')} aria-hidden />
        {collapsed && id === 'inbox' && <NeedsHumanBadge collapsed />}
      </span>
      {!collapsed && <span>{label}</span>}
      {!collapsed && id === 'inbox' && <NeedsHumanBadge collapsed={false} />}
    </NavLink>
  )
  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" data-testid={`nav-tooltip-${id}`}>{label}</TooltipContent>
    </Tooltip>
  ) : (
    link
  )
}

function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const btn = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={label}
      data-testid="sidebar-collapse-toggle"
      className={cn('flex shrink-0 items-center justify-center rounded-[11px] text-ink-muted transition-colors hover:bg-surface-muted hover:text-tobacco-600', FOCUS, collapsed ? 'h-11 w-11' : 'ml-auto h-9 w-9')}
    >
      {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden /> : <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  )
  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" data-testid="sidebar-collapse-tooltip">{label}</TooltipContent>
    </Tooltip>
  ) : (
    btn
  )
}

const Divider = ({ collapsed }: { collapsed: boolean }) => <div className={cn('my-3 h-px bg-border', collapsed ? 'mx-auto w-6' : 'mx-3')} aria-hidden />

const SIDEBAR_KEY = 'goorin.sidebar.collapsed'

export function Sidebar() {
  const { user } = useAuth()
  // The user's expanded/collapsed choice applies on every page, Inbox included.
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024 || localStorage.getItem(SIDEBAR_KEY) === '1')

  useEffect(() => {
    const onResize = () => window.innerWidth < 1024 && setCollapsed(true)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <aside
      data-testid="sidebar"
      data-collapsed={collapsed}
      className={cn('sticky top-0 z-40 flex h-screen shrink-0 max-sm:hidden flex-col border-r border-border bg-white transition-[width] duration-200', collapsed ? 'w-[72px]' : 'w-60')}
    >
      <div className={cn('flex h-16 shrink-0 items-center border-b border-border', collapsed ? 'justify-center' : 'justify-start px-4')} data-testid="sidebar-header">
        <Wordmark compact={collapsed} />
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col px-3 py-4">
        <div className="space-y-1.5">{MAIN.map((i) => <Item key={i.id} item={i} collapsed={collapsed} />)}</div>
        <Divider collapsed={collapsed} />
        <div className="space-y-1.5">{KNOWLEDGE.filter((i) => !i.admin || user?.role === 'admin').map((i) => <Item key={i.id} item={i} collapsed={collapsed} />)}</div>
        <div className={cn('-mx-3 mt-auto flex border-t border-border px-3 pt-3', collapsed ? 'flex-col items-center gap-1.5' : 'items-center gap-2')} data-testid="sidebar-bottom">
          {user?.role === 'admin' && (
            <div className={collapsed ? 'w-full' : 'min-w-0 flex-1'}>
              <Item item={SETTINGS} collapsed={collapsed} />
            </div>
          )}
          <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed((c) => { localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1'); return !c })} />
        </div>
      </nav>
    </aside>
  )
}
