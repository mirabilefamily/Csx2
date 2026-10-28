import { useHideBottomTabBar } from '@/components/shell/BottomTabBar'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Bold, Heading2, Italic, Link2, List, ListOrdered, X } from 'lucide-react'
import { toast } from 'sonner'
import type { GuidanceArticle } from '@/types'
import { guidanceApi } from '@/api'
import { useAuth } from '@/components/auth/AuthContext'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/overlay'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SaveBar } from '@/components/settings/SaveBar'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'

export const markdownStyles = '[&>*]:max-w-[75ch] [&_a]:text-tobacco-700 [&_a]:underline [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_table]:my-2 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_ul]:list-disc [&_ul]:pl-5'
const NEW_CAT = '__new'
type View = 'write' | 'split' | 'preview'
const useWide = () => { const [w, setW] = useState(() => window.innerWidth >= 1280); useEffect(() => { const f = () => setW(window.innerWidth >= 1280); addEventListener('resize', f); return () => removeEventListener('resize', f) }, []); return w }

interface Props {
  article: GuidanceArticle | null
  categories: string[]
  onClose: () => void
  onSaved: (a: GuidanceArticle) => void
}

// Markdown toolbar: wraps the selection or inserts a line prefix at the cursor.
const TOOLS: [string, typeof Bold, (sel: string) => string][] = [
  ['Bold', Bold, (s) => `**${s || 'bold text'}**`],
  ['Italic', Italic, (s) => `_${s || 'italic text'}_`],
  ['Heading', Heading2, (s) => `\n## ${s || 'Heading'}\n`],
  ['Bulleted list', List, (s) => `\n- ${s || 'List item'}`],
  ['Numbered list', ListOrdered, (s) => `\n1. ${s || 'List item'}`],
  ['Link', Link2, (s) => `[${s || 'link text'}](https://)`],
]

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [text, setText] = useState('')
  const add = () => { const t = text.trim().replace(/,$/, ''); if (t && !tags.includes(t)) onChange([...tags, t]); setText('') }
  return (
    <div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Tags">{tags.map((t) => <li key={t} className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-0.5 pl-2.5 pr-1 text-xs text-ink" data-testid={`article-tag-${t}`}>{t}<button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:h-8 max-sm:w-8" aria-label={`Remove ${t}`}><X className="h-3 w-3" aria-hidden /></button></li>)}</ul>
      <Input id="article-tags" className="mt-2" placeholder="Add a tag and press Enter" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }} onBlur={add} data-testid="article-tags" />
    </div>
  )
}

export function ArticleEditor({ article, categories, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const wide = useWide()
  const initial = { title: article?.title ?? '', category: article?.category ?? categories[0] ?? 'General', tags: article?.tags ?? [], body: article?.body ?? '', active: article?.active ?? true }
  const [form, setForm] = useState(initial)
  const [newCat, setNewCat] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({})
  const [view, setView] = useState<View>(wide ? 'split' : 'write')
  const [saving, setSaving] = useState(false)
  const body = useRef<HTMLTextAreaElement>(null)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const { confirmLeave } = useUnsavedGuard('article-editor', dirty)
  useHideBottomTabBar(true)
  useEffect(() => { if (!wide && view === 'split') setView('write') }, [wide, view])
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))
  const views: View[] = wide ? ['write', 'split', 'preview'] : ['write', 'preview']

  const tool = (fn: (s: string) => string) => {
    const el = body.current
    if (!el) return
    const [a, b] = [el.selectionStart, el.selectionEnd]
    const ins = fn(form.body.slice(a, b))
    set({ body: form.body.slice(0, a) + ins + form.body.slice(b) })
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + ins.length, a + ins.length) })
  }
  const save = async () => {
    const errs = { title: form.title.trim() ? undefined : 'Title is required.', body: form.body.trim() ? undefined : 'Article body is required.' }
    setErrors(errs)
    if (errs.title || errs.body || !user) return
    setSaving(true)
    try {
      const saved = await guidanceApi.saveArticle({ id: article?.id, title: form.title, category: form.category.trim() || 'General', tags: form.tags, body: form.body, active: form.active }, user)
      toast.success('Article saved')
      onSaved(saved)
    } catch (e) {
      toast.error((e as Error).message)
      setSaving(false)
    }
  }

  const writing = (
    <div className={cn(view === 'preview' && 'hidden')}>
      <Label htmlFor="article-body" className="sr-only">Article body (Markdown)</Label>
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-b-0 border-border bg-surface-sunken px-1.5 py-1" role="toolbar" aria-label="Formatting" data-testid="article-toolbar">
        {TOOLS.map(([l, I, fn]) => <Button key={l} type="button" size="icon-sm" variant="ghost" aria-label={l} title={l} onClick={() => tool(fn)} className="max-sm:h-11 max-sm:w-11" data-testid={`md-${l.toLowerCase().replace(/ /g, '-')}`}><I aria-hidden /></Button>)}
      </div>
      <Textarea id="article-body" ref={body} className="min-h-[440px] rounded-t-none font-mono text-[13px] leading-relaxed" value={form.body} onChange={(e) => set({ body: e.target.value })} aria-invalid={!!errors.body} data-testid="article-body" />
      <FieldError>{errors.body}</FieldError>
    </div>
  )
  const preview = (
    <div className={cn(view === 'write' && 'hidden')}>
      <div className={cn('min-h-[480px] rounded-xl border border-border bg-surface p-5 text-sm text-ink', markdownStyles)} data-testid="article-preview">
        {form.body.trim() ? <ReactMarkdown>{form.body}</ReactMarkdown> : <p className="text-ink-subtle">Start writing to see the preview.</p>}
      </div>
    </div>
  )
  const settings = (
    <aside className="space-y-5 self-start rounded-2xl bg-surface p-5 shadow-card ring-1 ring-black/[0.04] xl:sticky xl:top-6" aria-label="Article settings" data-testid="article-settings">
      <div>
        <p className="text-sm font-medium text-ink">Status</p>
        <label className="mt-2 flex min-h-11 items-center gap-3 text-sm text-ink"><Switch checked={form.active} onCheckedChange={(v) => set({ active: v })} aria-label="Active" data-testid="article-status" /><span data-testid="article-status-label">{form.active ? 'The AI uses this article' : 'The AI ignores this article'}</span></label>
      </div>
      <div>
        <Label htmlFor="article-category">Category</Label>
        {newCat ? (
          <Input id="article-category" className="mt-1.5" autoFocus placeholder="New category name" value={form.category} onChange={(e) => set({ category: e.target.value })} data-testid="article-category-new" />
        ) : (
          <Select value={form.category} onValueChange={(v) => { if (v === NEW_CAT) { setNewCat(true); set({ category: '' }) } else set({ category: v }) }}>
            <SelectTrigger id="article-category" className="mt-1.5" data-testid="article-category"><SelectValue /></SelectTrigger>
            <SelectContent>{[...new Set([...categories, form.category])].filter(Boolean).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}<SelectItem value={NEW_CAT} data-testid="article-category-new-option">New category…</SelectItem></SelectContent>
          </Select>
        )}
      </div>
      <div><Label htmlFor="article-tags">Tags</Label><div className="mt-1.5"><TagInput tags={form.tags} onChange={(tags) => set({ tags })} /></div></div>
      {article && (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-border pt-4 text-[13px]" data-testid="article-details">
            <dt className="text-ink-muted">Version</dt><dd className="text-ink" data-testid="article-version">v{article.version}</dd>
            <dt className="text-ink-muted">Updated</dt><dd className="text-ink">{timeAgo(article.updatedAt)} by {article.updatedBy}</dd>
            <dt className="text-ink-muted">AI uses</dt><dd className="text-ink">{article.active ? `${article.aiUses30d} replies · 30 days` : 'Not used by the AI'}</dd>
          </dl>
          <section data-testid="article-history">
            <h3 className="text-[13px] font-medium text-ink">Version history</h3>
            <ol className="mt-1.5 space-y-1">{article.history.map((h) => <li key={h.version} className="flex items-center gap-3 text-xs" data-testid={`article-history-v${h.version}`}><span className="w-7 font-semibold tabular-nums text-ink">v{h.version}</span><span className="truncate text-ink">{h.editor}</span><span className="ml-auto shrink-0 text-ink-muted">{timeAgo(h.at)}</span></li>)}</ol>
          </section>
        </>
      )}
    </aside>
  )

  return (
    <div className="space-y-5" data-testid="article-editor">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => confirmLeave(onClose)} data-testid="article-back"><ArrowLeft aria-hidden /> All articles</Button>
        <p className="text-sm text-ink-muted">{article ? `Editing · v${article.version}` : 'New article'}</p>
        <div role="radiogroup" aria-label="Editor view" className="ml-auto inline-flex rounded-lg bg-surface-muted p-1">
          {views.map((v) => <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className={cn('h-8 rounded-md px-3 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:h-11', view === v ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-muted hover:text-ink')} data-testid={`editor-tab-${v}`}>{v}</button>)}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div>
            <Label htmlFor="article-title" className="sr-only">Title</Label>
            <input id="article-title" placeholder="Article title" className="w-full border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight text-ink placeholder:text-ink-subtle focus:outline-none focus-visible:ring-0 max-sm:text-xl" value={form.title} onChange={(e) => set({ title: e.target.value })} aria-invalid={!!errors.title} data-testid="article-title" />
            <FieldError>{errors.title}</FieldError>
          </div>
          <div className={cn('grid gap-4', view === 'split' && 'grid-cols-2')}>{writing}{preview}</div>
        </div>
        {settings}
      </div>
      {dirty && (
        <SaveBar>
          <Button variant="ghost" size="sm" onClick={() => confirmLeave(onClose)} data-testid="article-discard">Discard</Button>
          <Button size="sm" onClick={save} loading={saving} data-testid="article-save">Save article</Button>
        </SaveBar>
      )}
    </div>
  )
}
