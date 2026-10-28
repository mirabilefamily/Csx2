import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, X } from 'lucide-react'
import type { CsatQuestion, CsatQuestionType } from '@/types'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

export interface QuestionErrors { label?: string; options?: string }

interface Props {
  q: CsatQuestion
  index: number
  total: number
  errors?: QuestionErrors
  onChange: (q: CsatQuestion) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
}

export const TYPE_LABELS: Record<CsatQuestionType, string> = { rating: 'Rating (1–5)', text: 'Text', choice: 'Choice' }

function OptionsEditor({ q, error, onChange }: { q: CsatQuestion; error?: string; onChange: (q: CsatQuestion) => void }) {
  const options = q.options ?? []
  const set = (next: string[]) => onChange({ ...q, options: next })
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-medium text-ink-muted">Options</legend>
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={o} aria-label={`Option ${i + 1}`} placeholder={`Option ${i + 1}`} onChange={(e) => set(options.map((x, j) => (j === i ? e.target.value : x)))} className="h-9" data-testid={`question-${q.id}-option-${i}`} />
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove option ${i + 1}`} onClick={() => set(options.filter((_, j) => j !== i))}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      <Button type="button" variant="link" size="sm" onClick={() => set([...options, ''])} data-testid={`question-${q.id}-add-option`}>
        <Plus aria-hidden /> Add option
      </Button>
      <FieldError>{error}</FieldError>
    </fieldset>
  )
}

export function QuestionItem({ q, index, total, errors, onChange, onMove, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: q.id })
  const labelId = `q-label-${q.id}`
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid={`question-item-${index}`}
      data-question-id={q.id}
      className={cn('rounded-lg border bg-surface p-4', isDragging ? 'relative z-10 border-brass-500 shadow-popover' : 'border-border', (errors?.label || errors?.options) && 'border-red-400')}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder question ${index + 1}`}
          data-testid={`question-drag-handle-${index}`}
          className="inline-flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <span className="text-sm font-medium text-ink">Question {index + 1}</span>
        <div className="ml-auto flex items-center gap-1">
          <Select
            value={q.type}
            onValueChange={(v) => {
              const type = v as CsatQuestionType
              onChange({ ...q, type, options: type === 'choice' ? (q.options?.length ? q.options : ['']) : undefined })
            }}
          >
            <SelectTrigger className="h-8 w-[136px] text-xs" aria-label={`Question ${index + 1} type`} data-testid={`question-type-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as CsatQuestionType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move question ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)} data-testid={`question-move-up-${index}`}>
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move question ${index + 1} down`} disabled={index === total - 1} onClick={() => onMove(1)} data-testid={`question-move-down-${index}`}>
            <ArrowDown aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete question ${index + 1}`} disabled={total === 1} title={total === 1 ? 'A survey needs at least one question' : undefined} onClick={onDelete} data-testid={`question-delete-${index}`}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        <div>
          <Label htmlFor={labelId} className="sr-only">Question {index + 1} text</Label>
          <Input
            id={labelId}
            value={q.label}
            placeholder="Write your question"
            aria-invalid={!!errors?.label}
            aria-describedby={errors?.label ? `${labelId}-err` : undefined}
            onChange={(e) => onChange({ ...q, label: e.target.value })}
            data-testid={`question-label-${index}`}
          />
          <FieldError id={`${labelId}-err`}>{errors?.label}</FieldError>
        </div>
        {q.type === 'choice' && <OptionsEditor q={q} error={errors?.options} onChange={onChange} />}
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <Switch checked={q.required} onCheckedChange={(v) => onChange({ ...q, required: v })} aria-label={`Question ${index + 1} required`} />
          Required
        </label>
      </div>
    </li>
  )
}
