import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Download, Upload, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { usePrompts } from '@/features/prompts/hooks/usePrompts'
import { PromptList } from '@/features/prompts/components/PromptList'
import { PromptForm } from '@/features/prompts/components/PromptForm'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Prompt } from '@/types'
import type { PromptFormData } from '@/features/prompts/utils/promptValidators'
import type { NicheCategory } from '@/features/prompt-generator/types'
import { exportPromptsToTxt, downloadAsTxt, parsePromptsFromTxt } from '@/services/export/txtExport'
import { defaultTemplate, getDefaultTemplateContent } from '@/features/templates/defaultTemplate'

export default function TemplatesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { prompts, loading, error, create, update, remove, refresh } = usePrompts()
  const storeSetInput = usePromptGeneratorStore((state) => state.setInput)
  const storeSetAdvancedOpen = usePromptGeneratorStore((state) => state.setAdvancedOptionsOpen)

  const [createOpen, setCreateOpen] = useState(false)
  const [editPrompt, setEditPrompt] = useState<Prompt | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const importFileRef = useRef<HTMLInputElement>(null)

  const nicheCategories: NicheCategory[] = ['technology', 'business', 'nature', 'lifestyle', 'healthcare', 'food', 'travel', 'education', 'abstract', 'people', 'architecture', 'other']

  const filteredPrompts = useMemo(() => {
    let result = prompts
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q),
      )
    }
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter)
    }
    return result
  }, [prompts, searchQuery, categoryFilter])

  const handleCreate = async (data: PromptFormData) => {
    await create(data)
    setCreateOpen(false)
  }

  const handleEdit = async (data: PromptFormData) => {
    if (!editPrompt) return
    await update({ id: editPrompt.id, ...data })
    setEditPrompt(null)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await remove(deleteId)
    setDeleteId(null)
  }

  const handleExport = () => {
    const txt = exportPromptsToTxt(prompts)
    downloadAsTxt(txt, 'promptforge-templates.txt')
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = parsePromptsFromTxt(text)
    for (const p of parsed) {
      if (p.name && p.content) {
        try {
          await create({
            name: p.name,
            category: p.category || 'general',
            tags: p.tags || [],
            content: p.content,
          })
        } catch {
          // skip duplicates
        }
      }
    }
    refresh()
    if (importFileRef.current) importFileRef.current.value = ''
  }

  const handleResetDefault = async () => {
    const existing = prompts.find(
      (p) => p.name.toLowerCase() === defaultTemplate.name.toLowerCase(),
    )
    if (existing) {
      await update({
        id: existing.id,
        content: getDefaultTemplateContent(),
        name: defaultTemplate.name,
        category: defaultTemplate.category,
        tags: defaultTemplate.tags,
      })
    } else {
      await create(defaultTemplate)
    }
    refresh()
  }

  const handleUseAsReference = (prompt: Prompt) => {
    storeSetInput({ basePromptReference: prompt.content })
    storeSetAdvancedOpen(true)
    navigate('/generator')
    toast.success(t('templates.referenceToast'))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('templates.pageTitle')}
        description={t('templates.pageDescription')}
        action={
          <div className="flex gap-2">
            <input
              ref={importFileRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button variant="outline" onClick={() => importFileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {t('templates.import')}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={prompts.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              {t('templates.export')}
            </Button>
            <Button variant="outline" onClick={handleResetDefault}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('templates.resetDefault')}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('templates.create')}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder={t('templates.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            {nicheCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(`generator.form.category.options.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredPrompts.length === 0 && !loading ? (
        <EmptyState
          title={t('templates.noResultsTitle')}
          description={t('templates.noResultsDescription')}
        />
      ) : (
        <PromptList
          prompts={filteredPrompts}
          loading={loading}
          error={error}
          onEdit={setEditPrompt}
          onDelete={setDeleteId}
          onUseAsReference={handleUseAsReference}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.createTitle')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <PromptForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPrompt} onOpenChange={(open) => { if (!open) setEditPrompt(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.editTitle')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <PromptForm
            key={editPrompt?.id}
            initialData={editPrompt ?? undefined}
            onSubmit={handleEdit}
            onCancel={() => setEditPrompt(null)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('templates.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('templates.deleteConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-brand-danger text-text-on-brand hover:bg-brand-danger/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
