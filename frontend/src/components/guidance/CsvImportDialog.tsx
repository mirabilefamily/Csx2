import { useHideBottomTabBar } from '@/components/shell/BottomTabBar'
import { useState } from 'react'
import Papa from 'papaparse'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { ImportRow } from '@/types'
import { guidanceApi } from '@/api'
import { useAuth } from '@/components/auth/AuthContext'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FieldError, Label } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const FIELDS = ['title', 'body', 'category', 'tags', 'active'] as const
type Field = (typeof FIELDS)[number]
const NONE = '__none'

export function downloadCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

export const TEMPLATE = 'title,body,category,tags,active\n"Sizing guide: kids","Little Goorin hats fit 19–21 in.",Sizing & Fit,sizing;kids,true\n'
const STEPS = ['Upload', 'Map columns', 'Review & import'] as const
const LABEL: Record<Field, string> = { title: 'Title', body: 'Body', category: 'Category', tags: 'Tags', active: 'Active' }

export function CsvImportDialog({ open, onOpenChange, onImported, inline = false }: { open: boolean; onOpenChange: (o: boolean) => void; onImported: () => void; inline?: boolean }) {
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [csv, setCsv] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null)
  const [map, setMap] = useState<Record<Field, string>>({ title: NONE, body: NONE, category: NONE, tags: NONE, active: NONE })
  const [busy, setBusy] = useState(false)
  const [review, setReview] = useState(false)
  useHideBottomTabBar(open && !inline)

  const reset = () => { setCsv(null); setError(null); setReview(false) }
  const accept = (file?: File) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) return setError('Only .csv files are supported.')
    setError(null)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? []
        setCsv({ headers, rows: res.data })
        setMap(Object.fromEntries(FIELDS.map((f) => [f, headers.find((h) => h.trim().toLowerCase() === f) ?? NONE])) as Record<Field, string>)
      },
    })
  }
  const rows: ImportRow[] = (csv?.rows ?? []).map((r) => Object.fromEntries(FIELDS.map((f) => [f, map[f] === NONE ? undefined : r[map[f]]])))
  const doImport = async () => {
    if (!user) return
    setBusy(true)
    try {
      const { imported, skipped } = await guidanceApi.importArticles(rows, user)
      toast.success(`Imported ${imported} articles`)
      if (skipped) toast(`${skipped} ${skipped === 1 ? 'row' : 'rows'} skipped (missing title)`)
      onImported()
      onOpenChange(false)
      reset()
    } catch {
      toast.error("Couldn't import articles. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const Title = inline ? 'h2' : DialogTitle
  const Desc = inline ? 'p' : DialogDescription
  const step = !csv ? 0 : review ? 2 : 1
  const valid = rows.filter((r) => r.title?.trim()).length
  const content = (
    <>
        <Title className="text-base font-semibold text-ink">Import articles from CSV</Title>
        <Desc className="mt-1 text-sm text-ink-muted">Map your columns to article fields. Rows without a title are skipped.</Desc>
        <ol className="mt-4 flex flex-wrap items-center gap-2 text-xs" aria-label="Import steps" data-testid="csv-steps">
          {STEPS.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined} className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium', i === step ? 'bg-ink text-white' : i < step ? 'bg-surface-muted text-ink' : 'text-ink-muted ring-1 ring-border')} data-testid={`csv-step-${i}`}><span className="tabular-nums">{i + 1}</span>{s}</li>)}
        </ol>
        {!csv ? (
          <div className="mt-5 space-y-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files[0]) }}
              className={cn('flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center', drag ? 'border-brass-500 bg-brass-50' : 'border-border-strong')}
              data-testid="csv-dropzone"
            >
              <Upload className="h-6 w-6 text-tobacco-500" aria-hidden />
              <p className="text-sm text-ink">Drag a .csv file here, or</p>
              <label className={cn('inline-flex h-9 cursor-pointer items-center rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium focus-within:ring-2 focus-within:ring-ring')}>
                Browse files
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => accept(e.target.files?.[0])} data-testid="csv-file-input" />
              </label>
            </div>
            <FieldError>{error}</FieldError>
            <Button variant="link" size="sm" onClick={() => downloadCsv('guidance-template.csv', TEMPLATE)} data-testid="csv-template"><Download aria-hidden /> Download sample template</Button>
          </div>
        ) : (
          <div className="mt-5 space-y-4" data-testid="csv-mapping">
            {!review && (
              <ul className="divide-y divide-border/70 rounded-xl ring-1 ring-border">
                {FIELDS.map((f) => (
                  <li key={f} className="flex items-center gap-4 px-4 py-2.5">
                    <Label htmlFor={`map-${f}`} className="w-24 shrink-0 text-sm text-ink">{LABEL[f]}{f === 'title' && <span className="text-red-700"> *</span>}</Label>
                    <Select value={map[f]} onValueChange={(v) => setMap({ ...map, [f]: v })}>
                      <SelectTrigger id={`map-${f}`} className="h-9 w-full max-w-[280px] text-sm" data-testid={`map-${f}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Not mapped</SelectItem>
                        {csv.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            )}
            {review && <p className="rounded-xl bg-surface-sunken px-4 py-3 text-sm text-ink" data-testid="csv-review-summary">{valid} of {csv.rows.length} rows will import{csv.rows.length - valid ? `; ${csv.rows.length - valid} without a title will be skipped` : ''}.</p>}
            <div className="max-h-56 overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader><TableRow>{FIELDS.map((f) => <TableHead key={f}>{LABEL[f]}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((r, i) => <TableRow key={i}>{FIELDS.map((f) => <TableCell key={f} className="max-w-[160px] truncate text-xs">{r[f] ?? '—'}</TableCell>)}</TableRow>)}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-ink-muted">{csv.rows.length} rows found · showing the first 5</p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {map.title === NONE && <p className="mr-auto text-sm font-medium text-red-700" role="alert" data-testid="csv-map-title-error">Map a column to Title.</p>}
              <Button variant="ghost" onClick={() => (review ? setReview(false) : reset())} data-testid="csv-back">{review ? 'Back' : 'Choose another file'}</Button>
              {review
                ? <Button onClick={doImport} loading={busy} data-testid="csv-import-confirm">Import {valid} articles</Button>
                : <Button onClick={() => setReview(true)} disabled={map.title === NONE} data-testid="csv-next">Review</Button>}
            </div>
          </div>
        )}
    </>
  )
  if (inline) return <div className="max-w-4xl rounded-2xl bg-surface p-6 shadow-card ring-1 ring-black/[0.04] max-sm:px-4" data-testid="csv-import-dialog">{content}</div>
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="max-w-3xl max-sm:h-dvh max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-none" data-testid="csv-import-dialog">{content}</DialogContent>
    </Dialog>
  )
}
