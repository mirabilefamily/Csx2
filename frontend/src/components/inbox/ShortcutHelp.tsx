import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const SHORTCUTS: [string, string][] = [
  ['j / k', 'Next / previous ticket'],
  ['→ / ←', 'Next / previous ticket'],
  ['r', 'Reply'],
  ['n', 'Internal note'],
  ['Shift+N', 'New ticket'],
  ['a', 'Approve & send the AI draft'],
  ['e', 'Resolve ticket or selection'],
  ['⌘A / Ctrl+A', 'Select all tickets in the list'],
  ['Esc', 'Clear selection'],
  ['u', 'Mark selection read / unread'],
  ['# / Delete', 'Delete selected tickets'],
  ['⌘G / Ctrl+G', 'Ask Goorin AI'],
  [']', 'Collapse or expand the details panel'],
  ['?', 'Show shortcuts'],
]

export function ShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="shortcut-help">
        <DialogTitle className="text-base font-semibold text-ink">Keyboard shortcuts</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-ink-muted">Shortcuts are paused while you type in a field or the composer.</DialogDescription>
        <dl className="mt-5 divide-y divide-border">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-ink">{label}</dt>
              <dd><kbd className="rounded-md border border-border-strong bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold text-ink">{key}</kbd></dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
