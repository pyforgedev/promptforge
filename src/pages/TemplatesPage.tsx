import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Download, Upload, RotateCcw } from 'lucide-react'
import { usePrompts } from '@/features/prompts/hooks/usePrompts'
import { PromptList } from '@/features/prompts/components/PromptList'
import { PromptForm } from '@/features/prompts/components/PromptForm'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
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
import { exportPromptsToTxt, downloadAsTxt, parsePromptsFromTxt } from '@/services/export/txtExport'
import { defaultTemplate, getDefaultTemplateContent } from '@/features/templates/defaultTemplate'

export default function TemplatesPage() {
  const { t } = useTranslation()
  const { prompts, loading, error, create, update, remove, refresh } = usePrompts()

  const [createOpen, setCreateOpen] = useState(false)
  const [editPrompt, setEditPrompt] = useState<Prompt | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
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
    }
    input.click()
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('templates.pageTitle')}
        description={t('templates.pageDescription')}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleImport}>
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

      <PromptList
        prompts={prompts}
        loading={loading}
        error={error}
        onEdit={setEditPrompt}
        onDelete={setDeleteId}
      />

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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
