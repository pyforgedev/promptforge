import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Download, Upload, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useTemplates } from '@/features/templates/hooks/useTemplates'
import { downloadFile } from '@/lib/download'
import { ROUTES } from '@/app/routePaths'
import { TemplateList } from '@/features/templates/components/TemplateList'
import { TemplateForm } from '@/features/templates/components/TemplateForm'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
import type { PromptTemplate, TemplateCategory } from '@/features/templates/types'
import { TEMPLATE_CATEGORIES } from '@/features/templates/types'
import type { TemplateFormData } from '@/features/templates/utils/templateValidators'
import { exportTemplatesToTxt, parseTemplatesFromTxt } from '@/services/export/txtExport'
import { TemplateError } from '@/features/templates/services/templateService'

export default function TemplatesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const importLabel = t('templates.import')
  const exportLabel = t('templates.export')
  const resetLabel = t('templates.resetDefault')
  const createLabel = t('templates.create')
  const {
    templates,
    loading,
    loadError,
    actionError,
    pendingAction,
    create,
    update,
    remove,
    importBatch,
    resetDefault,
    clearActionError,
  } = useTemplates()
  const setTemplateReference = usePromptGeneratorStore((state) => state.setTemplateReference)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<PromptTemplate | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const importFileRef = useRef<HTMLInputElement>(null)

  const legacyCategories = useMemo(
    () => [...new Set(templates.map((template) => template.category)
      .filter((category) => !(TEMPLATE_CATEGORIES as readonly string[]).includes(category)))],
    [templates],
  )
  const categoryOptions = useMemo<ComboboxOption[]>(() => [
    { value: 'all', label: t('common.all') },
    ...TEMPLATE_CATEGORIES.map((category) => {
      const label = t(`templates.categories.${category}`)
      return { value: category, label, searchText: `${category} ${label}` }
    }),
    ...legacyCategories.map((category) => {
      const label = t('templates.categories.legacyOption', { category })
      return { value: category, label, searchText: `${category} ${label}` }
    }),
  ], [legacyCategories, t])

  const filteredTemplates = useMemo(() => {
    let result = templates
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter)
    }
    return result
  }, [templates, searchQuery, categoryFilter])

  const errorMessage = (error: unknown) => {
    const code = error instanceof TemplateError ? error.code : 'STORAGE_FAILED'
    const key = code === 'DUPLICATE_NAME' ? 'duplicateName'
      : code === 'NOT_FOUND' ? 'notFound'
        : code === 'INVALID_DATA' ? 'invalidData'
          : code === 'BUILTIN_CONFLICT' ? 'builtinConflict'
            : code === 'IMPORT_LIMIT' ? 'importLimit'
              : 'storageFailed'
    return t(`templates.errors.${key}`)
  }

  const handleCreate = async (data: TemplateFormData) => {
    try {
      await create({ ...data, category: data.category as TemplateCategory })
      setCreateOpen(false)
      toast.success(t('templates.toast.created'))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const handleEdit = async (data: TemplateFormData) => {
    if (!editTemplate) return
    try {
      const category = data.category === editTemplate.category
        && !(TEMPLATE_CATEGORIES as readonly string[]).includes(data.category)
        ? undefined
        : data.category as TemplateCategory
      await update({ id: editTemplate.id, ...data, category })
      setEditTemplate(null)
      toast.success(t('templates.toast.updated'))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await remove(deleteId)
      setDeleteId(null)
      toast.success(t('templates.toast.deleted'))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const handleExport = () => {
    try {
      const txt = exportTemplatesToTxt(templates)
      downloadFile(txt, 'promptforge-templates.txt', 'text/plain')
      const legacyCount = templates.filter(
        (template) => !(TEMPLATE_CATEGORIES as readonly string[]).includes(template.category),
      ).length
      toast.success(legacyCount > 0
        ? t('templates.toast.exportedWithLegacyCategory', { count: legacyCount })
        : t('templates.toast.exported'))
    } catch {
      toast.error(t('templates.errors.exportFailed'))
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      if (file.size > 1_048_576) throw new TemplateError('IMPORT_LIMIT')
      const parsed = parseTemplatesFromTxt(await file.text())
      const summary = await importBatch(parsed)
      toast.success(t('templates.toast.importSummary', {
        imported: summary.imported,
        duplicates: summary.duplicatesExisting + summary.duplicatesInFile,
        invalid: summary.invalid,
      }))
    } catch (error) {
      toast.error(error instanceof TemplateError
        ? errorMessage(error)
        : t('templates.errors.importParseFailed'))
    } finally {
      if (importFileRef.current) importFileRef.current.value = ''
    }
  }

  const handleResetDefault = async () => {
    try {
      await resetDefault()
      toast.success(t('templates.toast.defaultReset'))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const handleUseAsReference = (template: PromptTemplate) => {
    setTemplateReference(template.id, template.name, template.content)
    navigate(ROUTES.generator)
    toast.success(t(template.content.length > 2_000
      ? 'templates.referenceTruncatedToast'
      : 'templates.referenceToast'))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('templates.pageTitle')}
        description={t('templates.pageDescription')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={importFileRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleImportFile}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:w-auto md:px-4"
                    onClick={() => importFileRef.current?.click()}
                    disabled={pendingAction === 'import'}
                    aria-label={importLabel}
                  >
                    <Upload data-icon="inline-start" aria-hidden="true" />
                    <span className="hidden md:inline">{importLabel}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="md:hidden">{importLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:w-auto lg:px-4"
                    onClick={handleExport}
                    disabled={templates.length === 0}
                    aria-label={exportLabel}
                  >
                    <Download data-icon="inline-start" aria-hidden="true" />
                    <span className="hidden lg:inline">{exportLabel}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="lg:hidden">{exportLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    size="icon"
                    className="xl:w-auto xl:px-4"
                    onClick={handleResetDefault}
                    disabled={pendingAction === 'reset'}
                    aria-label={resetLabel}
                  >
                    <RotateCcw data-icon="inline-start" aria-hidden="true" />
                    <span className="hidden xl:inline">{resetLabel}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="xl:hidden">{resetLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    size="icon"
                    className="sm:w-auto sm:px-4"
                    onClick={() => { clearActionError(); setCreateOpen(true) }}
                    aria-label={createLabel}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    <span className="hidden sm:inline">{createLabel}</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">{createLabel}</TooltipContent>
            </Tooltip>
          </div>
        }
      />

      {loading && templates.length === 0 ? (
        <div className="flex flex-col gap-6" role="status" aria-live="polite">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-full sm:w-[180px] rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : (
        <>
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
        <div className="w-full sm:w-[180px]">
          <label htmlFor="template-category-filter" className="sr-only">
            {t('templates.fields.category')}
          </label>
          <Combobox
            id="template-category-filter"
            options={categoryOptions}
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          />
        </div>
      </div>

      {templates.length > 0 && filteredTemplates.length === 0 && !loading ? (
        <EmptyState
          title={t('templates.noResultsTitle')}
          description={t('templates.noResultsDescription')}
          action={<Button variant="outline" onClick={() => { setSearchQuery(''); setCategoryFilter('all') }}>{t('templates.clearFilters')}</Button>}
        />
      ) : (
        <TemplateList
          templates={filteredTemplates}
          loading={loading}
          loadError={loadError}
          onEdit={(template) => { clearActionError(); setEditTemplate(template) }}
          onDelete={setDeleteId}
          onUseAsReference={handleUseAsReference}
          onCreate={() => { clearActionError(); setCreateOpen(true) }}
        />
      )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.createTitle')}</DialogTitle>
            <DialogDescription>{t('templates.createDescription')}</DialogDescription>
          </DialogHeader>
          <TemplateForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitError={actionError}
            pending={pendingAction === 'create'}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) setEditTemplate(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.editTitle')}</DialogTitle>
            <DialogDescription>{t('templates.editDescription')}</DialogDescription>
          </DialogHeader>
          <TemplateForm
            key={editTemplate?.id}
            initialData={editTemplate ?? undefined}
            onSubmit={handleEdit}
            onCancel={() => setEditTemplate(null)}
            submitError={actionError}
            pending={pendingAction === 'update'}
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
              disabled={pendingAction === 'delete'}
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
