import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { CsatSurvey, DelayUnit } from '@/types'
import { csatApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { Sheet, SheetCloseButton, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/overlay'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/States'
import { QuestionList } from './QuestionList'
import { RecipientsInput } from './RecipientsInput'
import { SurveyPreview } from './SurveyPreview'
import type { QuestionErrors } from './QuestionItem'

export function validate(s: CsatSurvey) {
  const errors: Record<string, QuestionErrors> = {}
  s.questions.forEach((q) => {
    const e: QuestionErrors = {}
    if (!q.label.trim()) e.label = 'Add the question text.'
    if (q.type === 'choice' && (q.options ?? []).filter((o) => o.trim()).length < 2) e.options = 'Add at least 2 options.'
    if (e.label || e.options) errors[q.id] = e
  })
  return errors
}

export function Delivery({ draft, set }: { draft: CsatSurvey; set: (s: CsatSurvey) => void }) {
  const paused = !draft.channels.email && !draft.channels.inlineChat
  const delayInvalid = !Number.isFinite(draft.sendDelay.value) || draft.sendDelay.value < 0
  return (
    <section aria-labelledby="csat-delivery-heading" className="space-y-5">
      <h3 id="csat-delivery-heading" className="text-sm font-semibold text-ink">Delivery</h3>
      <div>
        <Label htmlFor="send-delay">Send delay after resolution</Label>
        <div className="mt-2 flex gap-2">
          <Input id="send-delay" type="number" min={0} className="w-28" value={Number.isFinite(draft.sendDelay.value) ? draft.sendDelay.value : ''} aria-invalid={delayInvalid}
            onChange={(e) => set({ ...draft, sendDelay: { ...draft.sendDelay, value: e.target.value === '' ? NaN : Number(e.target.value) } })} data-testid="send-delay-input" />
          <Select value={draft.sendDelay.unit} onValueChange={(v) => set({ ...draft, sendDelay: { ...draft.sendDelay, unit: v as DelayUnit } })}>
            <SelectTrigger className="w-32" aria-label="Delay unit" data-testid="send-delay-unit"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FieldError>{delayInvalid ? 'Enter a delay of 0 or more.' : null}</FieldError>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">Channels</legend>
        {([['email', 'Email', 'Sent to the customer’s inbox'], ['inlineChat', 'Inline chat', 'Shown at the end of a chat']] as const).map(([key, label, hint]) => (
          <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-ink">{label}</span>
              <span className="block text-xs text-ink-muted">{hint}</span>
            </span>
            <Switch checked={draft.channels[key]} onCheckedChange={(v) => set({ ...draft, channels: { ...draft.channels, [key]: v } })} aria-label={label} data-testid={`channel-toggle-${key}`} />
          </label>
        ))}
        {paused && (
          <p role="status" className="flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900" data-testid="surveys-paused-warning">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden /> Surveys are paused on all channels.
          </p>
        )}
      </fieldset>
      <RecipientsInput value={draft.lowScoreRecipients} onChange={(v) => set({ ...draft, lowScoreRecipients: v })} />
    </section>
  )
}

export function CsatSettingsDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, loading, error, reload } = useApi(() => csatApi.getCsatSurvey(), [open], open)
  const [draft, setDraft] = useState<CsatSurvey | null>(null)
  const [errors, setErrors] = useState<Record<string, QuestionErrors>>({})
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(data ?? null)
    setErrors({})
  }, [data])

  const dirty = !!draft && !!data && JSON.stringify(draft) !== JSON.stringify(data)
  const requestClose = (next: boolean) => (next ? onOpenChange(true) : dirty ? setConfirm(true) : onOpenChange(false))
  const update = (s: CsatSurvey) => {
    setDraft(s)
    if (Object.keys(errors).length) setErrors(validate(s))
  }

  const save = async () => {
    if (!draft) return
    const errs = validate(draft)
    setErrors(errs)
    if (Object.keys(errs).length || !Number.isFinite(draft.sendDelay.value) || draft.sendDelay.value < 0) return
    setSaving(true)
    try {
      await csatApi.updateCsatSurvey(draft)
      toast.success('CSAT settings saved')
      onOpenChange(false)
    } catch {
      toast.error("Couldn't save CSAT settings. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const hasErrors = Object.keys(errors).length > 0
  return (
    <Sheet open={open} onOpenChange={requestClose}>
      <SheetContent className="sm:max-w-[1040px]" data-testid="csat-settings-drawer" aria-describedby="csat-drawer-desc">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <SheetTitle className="text-lg font-semibold text-ink">CSAT settings</SheetTitle>
            <SheetDescription id="csat-drawer-desc" className="mt-1 text-sm text-ink-muted">Shape the survey customers receive after a ticket is resolved.</SheetDescription>
          </div>
          <SheetCloseButton label="Close CSAT settings" data-testid="csat-drawer-close" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-4 p-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : error ? (
            <ErrorState title="CSAT settings didn't load" onRetry={reload} testId="csat-drawer-error" />
          ) : draft ? (
            <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-8">
                <QuestionList questions={draft.questions} errors={errors} onChange={(questions) => update({ ...draft, questions })} />
                <Delivery draft={draft} set={update} />
              </div>
              <div className="lg:sticky lg:top-0 lg:self-start">
                <SurveyPreview survey={draft} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-surface px-6 py-4">
          {hasErrors && <p className="mr-auto text-sm font-medium text-red-700" role="alert" data-testid="csat-save-blocked">Fix the highlighted questions to save.</p>}
          {dirty && !hasErrors && <p className="mr-auto text-xs text-ink-muted">Unsaved changes</p>}
          <Button variant="ghost" onClick={() => requestClose(false)} data-testid="csat-cancel">Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!draft} data-testid="csat-save">Save</Button>
        </div>
        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent data-testid="discard-dialog">
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>Your edits to the CSAT survey haven't been saved.</AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="discard-keep-editing">Keep editing</AlertDialogCancel>
              <AlertDialogAction
                data-testid="discard-confirm"
                onClick={() => {
                  setDraft(data ?? null)
                  setErrors({})
                  onOpenChange(false)
                }}
              >
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}
