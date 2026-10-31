import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Embeddable wrapper: no store chrome or widget, height follows content, bone only on this element.
export function HelpShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  // Match the page behind short pages so no off-white strip shows below the wrapper.
  useEffect(() => { const el = document.documentElement; const prev = el.style.backgroundColor; el.style.backgroundColor = '#D9D4C7'; return () => { el.style.backgroundColor = prev } }, [])
  return (
    <div className="help-root w-full bg-[#D9D4C7] px-6 pb-12 pt-10 text-[#141414] sm:px-8 lg:px-12 max-sm:pt-6" data-testid="help-root">
      {children}
    </div>
  )
}
