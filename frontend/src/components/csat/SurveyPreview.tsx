import type { CsatSurvey } from '@/types'

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

function delayText(s: CsatSurvey) {
  const { value, unit } = s.sendDelay
  const u = value === 1 ? unit.slice(0, -1) : unit
  return `${value} ${u}`
}

export function SurveyPreview({ survey }: { survey: CsatSurvey }) {
  const channels = [survey.channels.email && 'Email', survey.channels.inlineChat && 'Inline chat'].filter(Boolean).join(' & ')
  return (
    <div className="space-y-3" data-testid="survey-preview">
      <p className="text-[15px] font-semibold text-ink max-lg:hidden">Preview</p>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <div className="bg-tobacco-700 px-5 py-4">
          <p className="text-sm font-semibold text-brass-100">Goorin Bros.</p>
          <p className="text-xs text-tobacco-100">Hat makers since 1895</p>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="text-base font-semibold text-ink">How did we do, Margaret?</p>
            <p className="mt-1 text-xs text-ink-muted">About your recent request: “Fedora arrived crushed”</p>
          </div>
          <ol className="space-y-5">
            {survey.questions.map((q, i) => (
              <li key={q.id} data-testid={`preview-question-${i}`} className="space-y-2">
                <p className="text-sm font-medium text-ink">
                  {i + 1}. {q.label || <span className="italic text-ink-subtle">Untitled question</span>}
                  {q.required && <span className="ml-1 text-red-600" aria-label="required">*</span>}
                </p>
                {q.type === 'rating' && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {RATING_LABELS.map((l, n) => (
                      <span key={l} className="flex flex-col items-center gap-1 rounded-md border border-border py-1.5 text-xs text-ink-muted">
                        <span className="text-sm font-semibold text-ink">{n + 1}</span>
                        <span className="text-[10px]">{l}</span>
                      </span>
                    ))}
                  </div>
                )}
                {q.type === 'text' && <div className="h-16 rounded-md border border-border bg-surface-sunken" aria-hidden />}
                {q.type === 'choice' && (
                  <ul className="space-y-1.5">
                    {(q.options ?? []).map((o, n) => (
                      <li key={n} className="flex items-center gap-2 text-sm text-ink">
                        <span className="h-4 w-4 rounded-full border border-border-strong" aria-hidden />
                        {o || <span className="italic text-ink-subtle">Option {n + 1}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
          <span className="inline-flex h-10 items-center rounded-lg bg-tobacco-600 px-4 text-sm font-medium text-white" aria-hidden>
            Send feedback
          </span>
        </div>
      </div>
      <p className="text-xs text-ink-muted" data-testid="survey-preview-meta">
        {channels ? `Sent ${delayText(survey)} after a ticket is resolved, via ${channels}.` : 'Surveys are paused on all channels.'}
      </p>
    </div>
  )
}
