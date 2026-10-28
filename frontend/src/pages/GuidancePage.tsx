import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import Papa from 'papaparse'
import { ArrowUpRight, ChevronDown, Download, FilePlus2, FileSpreadsheet, Upload } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { useUnsavedGuard } from '@/components/UnsavedGuard'
import { useAuth } from '@/components/auth/AuthContext'
import { Button, buttonVariants } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ArticlesTab } from '@/components/guidance/ArticlesTab'
import { CsvImportDialog, downloadCsv, TEMPLATE } from '@/components/guidance/CsvImportDialog'
import { directoryApi } from '@/api'

// Guidance (Phase 17): one library, no section tabs. Import / export lives in a header menu.
export default function GuidancePage() {
  const [params, setParams] = useSearchParams()
  const { confirmLeave } = useUnsavedGuard()
  const { user } = useAuth()
  const [rev, setRev] = useState(0)
  const article = params.get('article')
  const tab = params.get('tab')
  if (tab && tab !== 'import') return <Navigate to="/guidance" replace />
  const importing = tab === 'import' && !article
  const go = (next: Record<string, string>) => setParams(next)
  const exportAll = async () => {
    const all = await directoryApi.listArticles()
    downloadCsv('guidance-articles.csv', Papa.unparse(all.map((a) => ({ title: a.title, body: a.body, category: a.category, tags: a.tags.join(';'), active: a.active, updatedAt: a.updatedAt }))))
  }

  return (
    <div className="space-y-6" data-testid="guidance-page">
      <PageHeader
        title="Guidance"
        description="What the AI knows and the policies it follows."
        actions={!article && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: 'outline' })} data-testid="guidance-io-menu"><FileSpreadsheet aria-hidden /> Import / export <ChevronDown className="h-4 w-4" aria-hidden /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onSelect={() => go({ tab: 'import' })} data-testid="guidance-import"><Upload className="h-4 w-4" aria-hidden /> Import CSV…</DropdownMenuItem>
                <DropdownMenuItem onSelect={exportAll} data-testid="export-csv"><Download className="h-4 w-4" aria-hidden /> Export all articles (CSV)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => downloadCsv('guidance-template.csv', TEMPLATE)} data-testid="csv-template-menu"><Download className="h-4 w-4" aria-hidden /> Download sample template</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => confirmLeave(() => go({ article: 'new' }))} data-testid="new-article"><FilePlus2 aria-hidden /> New article</Button>
          </>
        )}
      />
      <ArticlesTab key={rev} articleId={article} openArticle={(id) => go(id ? { article: id } : {})} />
      <CsvImportDialog open={importing} onOpenChange={(o) => !o && go({})} onImported={() => setRev((r) => r + 1)} />
    </div>
  )
}
