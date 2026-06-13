import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
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

export default function Dashboard() {
  const { t } = useTranslation()
  const { prompts, loading, error, create, update, remove } = usePrompts()

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.subtitle')}
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.createPrompt')}
          </Button>
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
            <DialogTitle>{t('prompts.createTitle')}</DialogTitle>
            <DialogDescription />
          </DialogHeader>
          <PromptForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPrompt} onOpenChange={(open) => { if (!open) setEditPrompt(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('prompts.editTitle')}</DialogTitle>
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
            <AlertDialogTitle>{t('prompts.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('prompts.deleteConfirmation')}
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
