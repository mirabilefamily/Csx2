import { useLayoutEffect, useRef, type ReactNode } from 'react'

function scroller(el: HTMLElement | null) {
  for (let e = el?.parentElement; e; e = e.parentElement) if (/(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight) return e
  return document.documentElement
}

// One unsaved-changes bar for /ai/*, Channels and Settings: sticky to the bottom of the content column, content width.
// While visible it reserves its height as scroll padding and keeps the focused field clear of it (REQ-910).
export function SaveBar({ note, children }: { note?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const bar = ref.current
    if (!bar) return
    const sc = scroller(bar)
    const h = bar.offsetHeight + 16
    sc.style.scrollPaddingBottom = `${h}px`
    const a = document.activeElement as HTMLElement | null
    if (a && a !== document.body && !bar.contains(a)) {
      const over = a.getBoundingClientRect().bottom - (window.innerHeight - h)
      if (over > 0) sc.scrollBy({ top: over })
    }
    return () => { sc.style.scrollPaddingBottom = '' }
  }, [])
  return (
    <div
      ref={ref}
      className="sticky bottom-0 z-30 mt-6 flex flex-wrap items-center gap-3 border-t border-border/80 bg-background/85 px-1 py-3 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in max-sm:bottom-[calc(4rem+env(safe-area-inset-bottom))]"
      role="region"
      aria-label="Unsaved changes"
      data-testid="unsaved-bar"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
      <p className="mr-auto text-sm font-medium text-ink">Unsaved changes</p>
      {note}
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

// Label + help on the left (~1/3), controls on the right (~2/3); stacks below 1024px.
export function FormSection({ title, description, children, testId }: { title: string; description?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <section className="grid gap-4 py-8 first:pt-2 last:pb-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10 2xl:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]" data-testid={testId}>
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-muted">{description}</p>}
      </div>
      <div className="min-w-0 max-w-[880px] space-y-4">{children}</div>
    </section>
  )
}
