import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center" data-testid="not-found-page">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brass-50 text-brass-700">
        <Compass className="h-7 w-7" aria-hidden />
      </div>
      <p className="mt-6 text-xs font-semibold text-brass-700">Error 404</p>
      <h1 className="mt-2 font-display text-[32px] text-ink">This page wandered off</h1>
      <p className="mt-3 max-w-md text-sm text-ink-muted">Like a good hat on a windy day. The link may be old, or the page hasn't been built yet.</p>
      <Link to="/dashboard" className={buttonVariants({ className: 'mt-8' })} data-testid="not-found-back-dashboard">Back to Dashboard</Link>
    </div>
  )
}
