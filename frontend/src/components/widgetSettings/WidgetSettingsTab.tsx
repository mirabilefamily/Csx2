import { useMemo, useState } from 'react'
import { CircleDot, Filter, Home, MessageSquareText, Palette, Star, type LucideIcon } from 'lucide-react'
import { ConversationSection, HomeSection } from './HomeSection'
import { PreviewPane } from '@/components/PreviewPane'
import { ChannelStatus } from '@/components/channels/StatusStrip'
import { useIsPhone } from '@/hooks/useIsPhone'
import { toast } from 'sonner'
import { csatApi, widgetApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import type { ThemeEmbedSettings, WidgetSettings } from '@/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/States'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { SaveBar } from '@/components/settings/SaveBar'
import { mergeEffective } from '@/lib/widgetRules'
import { Section } from './fields'
import { sectionSummary } from './summaries'
import { BrandingSection } from './BrandingSection'
import { LauncherSection } from './LauncherSection'
import { MessagingSection } from './MessagingSection'
import { CsatInChatSection, DisplaySection } from './DisplaySection'
import { InstallSection } from './InstallSection'
import { WidgetPreview, type PreviewOptions } from './WidgetPreview'
import { sanitizeForPreview, validateWidget, type WidgetErrors } from './validate'

const SECTIONS: [string, string, string, LucideIcon][] = [
  ['branding', 'Look', 'Colours, panel style and logo', Palette],
  ['launcher', 'Launcher', 'Icon, corner and spacing', CircleDot],
  ['home', 'Home screen', 'Greeting, top buttons and conversation starters', Home],
  ['conversation', 'Conversation', 'Chatbot name, feedback, email and offline message', MessageSquareText],
  ['display', 'Display rules', 'Where the widget shows and what the AI can see', Filter],
  ['csat', 'CSAT in chat', 'Inline survey style and questions', Star],
]

const GROUPS = { appearance: ['branding', 'launcher', 'home', 'conversation'], preferences: ['display', 'csat'] } as const

function Loaded({ saved: initial, theme, view, group }: { saved: WidgetSettings; theme: ThemeEmbedSettings; view: 'editor' | 'install'; group?: keyof typeof GROUPS }) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [uploadErrors, setUploadErrors] = useState<WidgetErrors>({})
  const isPhone = useIsPhone()
  const [open, setOpen] = useState<Set<string>>(() => new Set(['branding']))
  const [opts, setOpts] = useState<PreviewOptions>({ page: 'product', device: 'desktop', state: 'home', outsideHours: false })
  const [saving, setSaving] = useState(false)
  const questions = useApi(() => csatApi.getCsatSurvey(), [])
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])
  const errors = useMemo(() => validateWidget(draft, uploadErrors), [draft, uploadErrors])
  const invalid = Object.keys(errors).length > 0
  useUnsavedGuard('widget-settings', dirty)
  const preview = useMemo(() => mergeEffective(sanitizeForPreview(draft, saved), theme), [draft, saved, theme])

  const update = (fn: (d: WidgetSettings) => void) =>
    setDraft((d) => {
      const n = structuredClone(d)
      fn(n)
      return n
    })
  const setUploadError = (k: string, e?: string) => setUploadErrors(({ [k]: _, ...rest }) => (e ? { ...rest, [k]: e } : rest))
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const save = async () => {
    if (invalid) {
      const el = document.querySelector<HTMLElement>('[data-testid="widget-settings-form"] [aria-invalid="true"], [data-testid="widget-settings-form"] [role="alert"]')
      el?.scrollIntoView({ block: 'center' })
      el?.focus?.()
      return
    }
    setSaving(true)
    try {
      const s = await widgetApi.saveWidgetSettings(draft)
      setSaved(s)
      setDraft(s)
      toast.success('Widget settings saved')
    } catch {
      toast.error("Couldn't save widget settings. Try again.")
    }
    setSaving(false)
  }

  const saveBar = dirty && (
    <SaveBar note={invalid && <span className="hidden text-xs text-red-600 sm:inline" data-testid="ws-invalid-note">Fix the highlighted fields</span>}>
      <Button variant="ghost" size="sm" onClick={() => { setDraft(saved); setUploadErrors({}) }} data-testid="ws-discard">Discard</Button>
      <Button size="sm" onClick={save} loading={saving} aria-disabled={invalid} className={invalid ? 'opacity-50' : ''} data-testid="ws-save">Save</Button>
    </SaveBar>
  )

  if (view === 'install')
    return (
      <div className="pb-24" data-testid="widget-install">
        <div id="install" className="space-y-6" data-testid="widget-settings-form">
          <InstallSection draft={draft} theme={theme} update={update} />
        </div>
        {saveBar}
      </div>
    )

  return (
    <div className="grid gap-7 pb-24 lg:grid-cols-[minmax(0,1fr)_clamp(400px,30vw,560px)]" data-testid="widget-settings">
      <div className="min-w-0 space-y-3" data-testid="widget-settings-form">
        {/* Chat's status strip sits over the settings column so the preview can start higher and fit the viewport. */}
        <div className="pb-3"><ChannelStatus tab="chat" /></div>
        {SECTIONS.filter(([id]) => !group || (GROUPS[group] as readonly string[]).includes(id)).map(([id, title, desc, Icon]) => (
          <Section key={id} id={id} title={title} description={desc} Icon={Icon} summary={sectionSummary(id, draft, theme)} open={open.has(id)} onToggle={() => toggle(id)}>
            {id === 'branding' && <BrandingSection draft={draft} update={update} uploadErrors={uploadErrors} setUploadError={setUploadError} />}
            {id === 'launcher' && <LauncherSection draft={draft} update={update} errors={errors} setUploadError={setUploadError} />}
            {id === 'home' && <HomeSection draft={draft} update={update} />}
            {id === 'conversation' && <ConversationSection draft={draft} update={update} />}
            {id === 'display' && <DisplaySection draft={draft} update={update} />}
            {id === 'csat' && <CsatInChatSection draft={draft} update={update} questions={questions.data?.questions} />}
          </Section>
        ))}
      </div>
      <PreviewPane label="Live preview" testId="channels-preview" toggleTestId="widget-preview-open" className="lg:static lg:self-stretch">
        <WidgetPreview settings={preview} opts={isPhone ? { ...opts, device: 'mobile' } : opts} onChange={setOpts} title="Preview" />
      </PreviewPane>
      {saveBar}
    </div>
  )
}

// Channels → Chat (editor + live preview, split into Appearance / Preferences) and Channels → Installation.
export function WidgetSettingsTab({ view = 'editor', group }: { view?: 'editor' | 'install'; group?: keyof typeof GROUPS }) {
  const settings = useApi(() => widgetApi.getWidgetSettings(), [])
  const theme = useApi(() => widgetApi.getThemeEmbed(), [])
  if (settings.error || theme.error) return <ErrorState title="Widget settings didn't load" onRetry={() => { settings.reload(); theme.reload() }} />
  if (!settings.data || !theme.data)
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_500px]" data-testid="widget-settings-loading">
        <div className="space-y-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}</div>
        <Skeleton className="h-[640px] w-full rounded-2xl" />
      </div>
    )
  return <Loaded saved={settings.data} theme={theme.data} view={view} group={group} />
}
