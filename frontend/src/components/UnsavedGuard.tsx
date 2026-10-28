import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface Guard {
  setDirty: (key: string, dirty: boolean) => void
  confirmLeave: (proceed: () => void) => void
}

const Ctx = createContext<Guard | null>(null)
const DirtyCount = createContext(0)

export const useDirtyCount = () => useContext(DirtyCount)

// App-wide "Discard unsaved changes?" guard for editors and settings forms.
export function UnsavedGuardProvider({ children }: { children: ReactNode }) {
  const dirty = useRef(new Set<string>())
  const navigate = useNavigate()
  const [pending, setPending] = useState<(() => void) | null>(null)
  const [count, setCount] = useState(0)
  const setDirty = useCallback((key: string, d: boolean) => {
    if (d) dirty.current.add(key)
    else dirty.current.delete(key)
    setCount(dirty.current.size)
  }, [])
  const confirmLeave = useCallback((proceed: () => void) => {
    if (dirty.current.size) setPending(() => proceed)
    else proceed()
  }, [])

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  // Any in-app link click while dirty goes through the dialog (back links, tab bars, nav).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirty.current.size || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.origin !== location.origin) return
      if (a.pathname + a.search === location.pathname + location.search) return
      e.preventDefault()
      e.stopPropagation()
      const to = a.pathname + a.search + a.hash
      setPending(() => () => navigate(to))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [navigate])

  // Browser back/forward while dirty: undo the pop, ask, then go back for real on Discard.
  // Registered in a layout effect so it runs before the router's own popstate listener.
  useLayoutEffect(() => {
    let ignoreNext = false
    const onPop = (e: PopStateEvent) => {
      if (ignoreNext) {
        ignoreNext = false
        e.stopImmediatePropagation()
        return
      }
      if (!dirty.current.size) return
      e.stopImmediatePropagation()
      ignoreNext = true
      history.go(1)
      setPending(() => () => history.back())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const value = useMemo(() => ({ setDirty, confirmLeave }), [setDirty, confirmLeave])
  return (
    <Ctx.Provider value={value}>
      <DirtyCount.Provider value={count}>{children}</DirtyCount.Provider>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent data-testid="unsaved-dialog">
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>Your edits haven't been saved.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="unsaved-keep-editing">Keep editing</AlertDialogCancel>
            <AlertDialogAction
              data-testid="unsaved-discard"
              onClick={() => {
                dirty.current.clear()
                setCount(0)
                pending?.()
                setPending(null)
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  )
}

export function useUnsavedGuard(key?: string, isDirty?: boolean) {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUnsavedGuard must be used inside UnsavedGuardProvider')
  const { setDirty } = ctx
  useEffect(() => {
    if (!key) return
    setDirty(key, !!isDirty)
    return () => setDirty(key, false)
  }, [key, isDirty, setDirty])
  return ctx
}
