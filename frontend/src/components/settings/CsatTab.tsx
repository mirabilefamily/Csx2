import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CsatSurvey } from '@/types'
import { csatApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/States'
import { QuestionList } from '@/components/csat/QuestionList'
import { SurveyPreview } from '@/components/csat/SurveyPreview'
import { PreviewPane } from '@/components/PreviewPane'
import type { QuestionErrors } from '@/components/csat/QuestionItem'
import { Delivery, validate } from '@/components/csat/CsatSettingsDrawer'
import { SaveBar } from './SaveBar'

// Settings → CSAT: the CSAT settings drawer content as a full tab.
export function CsatTab() {
  const { data, loading, error, reload } = useApi(() => csatApi.getCsatSurvey(), [])
  const [saved, setSaved] = useState<CsatSurvey | null>(null)
  const [draft, setDraft] = useState<CsatSurvey | null>(null)
  const [errors, setErrors] = useState<Record<string, QuestionErrors>>({})
  const [saving, setSaving] = useState(false)
  useEffect(() => { setSaved(data ?? null); setDraft(data ?? null); setErrors({}) }, [data])
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved)
  useUnsavedGuard('csat-settings', dirty)
  if (loading) return <div className="space-y-4" data-testid="csat-tab-loading">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
  if (error || !draft) return <ErrorState title="CSAT settings didn't load" onRetry={reload} testId="csat-drawer-error" />
  const update = (s: CsatSurvey) => { setDraft(s); if (Object.keys(errors).length) setErrors(validate(s)) }
  const hasErrors = Object.keys(errors).length > 0
  const save = async () => {
    const errs = validate(draft)
    setErrors(errs)
    if (Object.keys(errs).length || !Number.isFinite(draft.sendDelay.value) || draft.sendDelay.value < 0) return
    setSaving(true)
    try { await csatApi.updateCsatSurvey(draft); setSaved(draft); toast.success('CSAT settings saved') } catch { toast.error("Couldn't save CSAT settings. Try again.") }
    setSaving(false)
  }
  return (
    <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]" data-testid="csat-settings-tab">
      <div className="min-w-0 space-y-8 rounded-2xl bg-surface p-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4">
        <QuestionList questions={draft.questions} errors={errors} onChange={(questions) => update({ ...draft, questions })} />
        <Delivery draft={draft} set={update} />
      </div>
      <PreviewPane label="Survey preview" testId="csat-preview-pane" className="lg:top-20"><SurveyPreview survey={draft} /></PreviewPane>
      {dirty && (
        <SaveBar note={hasErrors && <span className="text-xs font-medium text-red-700" role="alert" data-testid="csat-save-blocked">Fix the highlighted questions to save.</span>}>
          <Button variant="ghost" size="sm" onClick={() => { setDraft(saved); setErrors({}) }} data-testid="csat-cancel">Discard</Button>
          <Button size="sm" onClick={save} loading={saving} data-testid="csat-save">Save</Button>
        </SaveBar>
      )}
    </div>
  )
}
