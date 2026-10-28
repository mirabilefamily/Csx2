import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, ChevronDown, Italic, Link2, Paperclip } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Button, buttonVariants, focusRing } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay'
import { Input } from '@/components/ui/input'
import { demoToolsEnabled } from '@/components/DemoStateSwitcher'
import { richText } from './MessageItem'
import { cn } from '@/lib/utils'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const textToHtml = (body: string) => body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')

export type ComposerMode = 'reply' | 'note'
export interface ComposerHandle {
  focus: (mode: ComposerMode) => void
  loadDraft: (body: string, draftId: string) => void
  insertText: (text: string) => void
}

interface Props {
  onSend: (html: string, isInternal: boolean, draftId?: string) => Promise<boolean>
  onResolve?: () => void
  onHandBack?: (html: string, draftId?: string) => Promise<boolean>
  extra?: React.ReactNode
  to: string
  onDraftChange: (draftId: string | null) => void
  inline?: boolean
}

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} aria-pressed={active} title={label} onClick={onClick} data-testid={`composer-${label.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink', active && 'bg-surface-muted text-ink', focusRing)}>
      {children}
    </button>
  )
}

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const apply = () => {
    if (url.trim()) editor.chain().focus().extendMarkRange('link').setLink({ href: /^https?:\/\//.test(url) ? url : `https://${url}` }).run()
    else editor.chain().focus().unsetLink().run()
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setUrl(editor.getAttributes('link').href ?? '') }}>
      <PopoverTrigger aria-label="Link" title="Link" data-testid="composer-link" className={cn('inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted', editor.isActive('link') && 'bg-surface-muted text-ink', focusRing)}>
        <Link2 className="h-4 w-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="flex w-72 gap-2 p-3">
        <Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://goorin.com" aria-label="Link URL" className="h-9" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), apply())} data-testid="composer-link-input" />
        <Button size="sm" onClick={apply}>Apply</Button>
      </PopoverContent>
    </Popover>
  )
}

export const Composer = forwardRef<ComposerHandle, Props>(({ onSend, onResolve, onHandBack, extra, onDraftChange, to, inline }, ref) => {
  const [mode, setMode] = useState<ComposerMode>('reply')
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [sending, setSending] = useState(false)
  const draftId = useRef<string | null>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false, code: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: () => (modeRef.current === 'note' ? 'Add an internal note for the team…' : 'Write a reply, or press r.') }),
    ],
    editorProps: {
      attributes: { class: cn('min-h-[88px] max-sm:min-h-[56px] max-h-56 overflow-y-auto px-3 py-2 text-sm text-ink focus:outline-none', richText), role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Message composer', 'data-testid': 'composer-editor' },
      handleKeyDown: (_view, e) => {
        if (e.key === 'Escape') {
          ;(e.target as HTMLElement).blur()
          return true
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          document.querySelector<HTMLButtonElement>('[data-testid="composer-send"]')?.click()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: ed }) => {
      clearTimeout(saveTimer.current)
      if (!ed.getText().trim()) return setSaved('idle')
      setSaved('saving')
      saveTimer.current = setTimeout(() => setSaved('saved'), 700)
    },
  })

  useImperativeHandle(ref, () => ({
    focus: (m) => {
      setMode(m)
      setTimeout(() => editor?.commands.focus('end'), 0)
    },
    loadDraft: (body, id) => {
      setMode('reply')
      draftId.current = id
      onDraftChange(id)
      editor?.commands.setContent(textToHtml(body))
      setTimeout(() => editor?.commands.focus('end'), 0)
    },
    insertText: (text) => {
      setMode('reply')
      editor?.commands.setContent(textToHtml(text))
      setTimeout(() => editor?.commands.focus('end'), 0)
    },
  }), [editor, onDraftChange])

  useEffect(() => {
    editor?.view.dispatch(editor.state.tr)
  }, [mode, editor])

  if (!editor) return null
  const send = async (then?: 'resolve' | 'handback') => {
    if (editor.isEmpty || !editor.getText().trim()) return
    setSending(true)
    const ok = then === 'handback' && onHandBack ? await onHandBack(editor.getHTML(), draftId.current ?? undefined) : await onSend(editor.getHTML(), mode === 'note', draftId.current ?? undefined)
    setSending(false)
    if (ok) {
      editor.commands.clearContent()
      setSaved('idle')
      draftId.current = null
      onDraftChange(null)
      if (then === 'resolve') onResolve?.()
    }
  }
  const empty = editor.isEmpty || !editor.getText().trim()
  const note = mode === 'note'

  return (
    <div className={inline ? 'pt-1' : cn('border-t border-border bg-white px-4 pt-3 md:px-6', demoToolsEnabled ? 'pb-16 max-sm:pb-[calc(12px+env(safe-area-inset-bottom))]' : 'pb-3')}>
      <div className={cn('relative rounded-lg border transition-colors', note ? 'border-amber-300 bg-amber-50/60' : 'border-border bg-white')} data-testid="composer" data-mode={mode}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-2 py-1.5">
          <div role="tablist" aria-label="Composer mode" className="inline-flex rounded-md border border-border p-0.5">
            {(['reply', 'note'] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} data-testid={`composer-mode-${m}`}
                className={cn('inline-flex h-7 items-center rounded px-2.5 text-[13px] font-medium transition-colors max-sm:h-11', mode === m ? 'bg-surface-muted text-ink' : 'text-ink-muted hover:text-ink', focusRing)}>
                {m === 'reply' ? 'Reply' : 'Note'}
              </button>
            ))}
          </div>
          <span className="min-w-0 truncate text-xs text-ink-muted" data-testid="composer-goes-to">{note ? 'Only your team sees this' : <>To: <span className="font-medium text-ink">{to}</span></>}</span>
          <span className="ml-auto text-xs text-ink-muted" role="status" data-testid="composer-draft-state">{saved === 'saving' ? 'Saving draft…' : saved === 'saved' ? 'Draft saved' : ''}</span>
        </div>
        <EditorContent editor={editor} />
        <div className="flex items-center gap-0.5 border-t border-border px-2 py-1">
          <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" aria-hidden /></ToolButton>
          <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" aria-hidden /></ToolButton>
          <LinkButton editor={editor} />
          <ToolButton label="Attach" onClick={() => toast("Attachments aren't available in this demo.")}><Paperclip className="h-4 w-4" aria-hidden /></ToolButton>
          {note && <span className="ml-auto pr-1 text-xs font-semibold text-amber-900">Internal note</span>}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {extra}
        <div className="ml-auto flex">
          <Button className={cn(!note && onResolve && 'rounded-r-none')} disabled={empty} loading={sending} onClick={() => send()} data-testid="composer-send">{note ? 'Add note' : 'Send'}</Button>
          {!note && onResolve && (
            <DropdownMenu>
              <DropdownMenuTrigger disabled={empty || sending} className={cn(buttonVariants({ variant: 'primary', size: 'icon' }), 'rounded-l-none border-l border-white/20')} aria-label="More send options" data-testid="composer-send-menu"><ChevronDown className="h-4 w-4" aria-hidden /></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => send('resolve')} data-testid="composer-send-resolve">Send &amp; resolve</DropdownMenuItem>
                {onHandBack && <DropdownMenuItem onSelect={() => send('handback')} data-testid="composer-send-handback">Send &amp; hand back to AI</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  )
})
Composer.displayName = 'Composer'
