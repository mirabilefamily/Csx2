import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

// Hands off to the host store's widget (embedded: parent frame; same page: window event).
export const openChat = (question?: string, answer?: string) => {
  window.parent.postMessage({ type: 'goorin:open-chat', question, answer }, '*')
  window.dispatchEvent(new CustomEvent('goorin:open-chat', { detail: { q: question, a: answer } }))
  toast('Opening chat on the store…')
}

// Embeddable wrapper: no store chrome or widget, height follows content, bone only on this element.
export function HelpShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="help-root w-full bg-[#D9D4C7] px-6 py-10 text-[#141414] sm:px-8 lg:px-12 max-sm:py-6" data-testid="help-root">
      {children}
    </div>
  )
}
