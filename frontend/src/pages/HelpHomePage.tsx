import { Link } from 'react-router-dom'
import { Brush, CreditCard, Info, Package, RotateCcw, Ruler, Store, Zap, type LucideIcon } from 'lucide-react'
import { helpApi } from '@/api'
import type { KbIcon } from '@/api/help'
import { useApi } from '@/hooks/useApi'
import { HelpShell } from '@/components/help/HelpShell'
import { HeroSearch } from '@/components/help/kb'
import { Skeleton } from '@/components/ui/skeleton'

export const FOLDER_ICON: Record<KbIcon, LucideIcon> = { package: Package, rotate: RotateCcw, ruler: Ruler, brush: Brush, card: CreditCard, zap: Zap, store: Store, info: Info }

export function FolderGrid() {
  const { data } = useApi(() => helpApi.listFolders(), [])
  return (
    <ul className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-3" data-testid="help-folders">
      {!data && Array.from({ length: 8 }, (_, i) => <li key={i}><Skeleton className="h-[168px]" /></li>)}
      {data?.map((f) => { const I = FOLDER_ICON[f.icon]; return (
        <li key={f.slug}>
          <Link to={`/help/${f.slug}`} className="hc-card flex h-full flex-col bg-white p-6 max-sm:p-5" data-testid={`help-folder-${f.slug}`}>
            <I className="h-5 w-5 text-[#141414]" strokeWidth={1.75} aria-hidden />
            <span className="mt-4 text-[17px] font-semibold text-[#141414]">{f.title}</span>
            <span className="mt-1 text-[14px] leading-snug text-black/60">{f.description}</span>
            <span className="mt-4 text-[13px] text-black/50 max-sm:mt-3">{f.count} articles</span>
          </Link>
        </li>
      ) })}
    </ul>
  )
}

export default function HelpHomePage() {
  return (
    <HelpShell>
      <div className="mx-auto max-w-[1200px]" data-testid="help-home">
        <section className="hc-halftone flex h-[320px] items-center justify-center px-6 max-sm:h-[240px] max-sm:px-4" data-testid="help-hero">
          <img src="/images/help/hero-desert.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative z-10 w-full max-w-[680px] text-center">
            <h1 className="hc-display text-[clamp(28px,3.4vw,48px)] leading-none text-white [text-shadow:0_2px_24px_rgb(0_0_0/.45)] max-sm:text-[28px]" data-testid="help-title">How can we help?</h1>
            <div className="mt-6 max-sm:mt-5"><HeroSearch /></div>
          </div>
        </section>
        <div className="mt-12 max-sm:mt-8"><FolderGrid /></div>
      </div>
    </HelpShell>
  )
}
