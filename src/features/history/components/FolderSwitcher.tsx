import { useTranslation } from 'react-i18next'
import { Plus, Folder as FolderIcon, Inbox } from 'lucide-react'
import { useHistoryStore } from '@/store/useHistoryStore'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/useToast'
import { MAX_FOLDERS, FolderLimitError } from '@/features/history/types'

export const ALL_FOLDERS_VALUE = '__all__'

interface FolderSwitcherProps {
  className?: string
}

export const FolderSwitcher = ({ className }: FolderSwitcherProps) => {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const {
    folders,
    folderCounts,
    totalPromptCount,
    currentFolderId,
    setCurrentFolder,
    createFolder,
  } = useHistoryStore()

  const options: ComboboxOption[] = [
    {
      value: ALL_FOLDERS_VALUE,
      label: t('history.allPrompts'),
      icon: <Inbox className="h-4 w-4" />,
      badge: totalPromptCount,
    },
    ...folders.map((folder) => ({
      value: folder.id,
      label: folder.name,
      icon: <FolderIcon className="h-4 w-4" />,
      badge: folderCounts[folder.id] ?? 0,
    })),
  ]

  const handleChange = (value: string) => {
    setCurrentFolder(value === ALL_FOLDERS_VALUE ? null : value)
  }

  const handleCreate = async () => {
    try {
      const id = await createFolder(t('history.newFolder'))
      setCurrentFolder(id)
      showToast('success', t('toast.folderCreated'))
    } catch (err) {
      if (err instanceof FolderLimitError) {
        showToast('warning', t('toast.folderLimitReached', { max: MAX_FOLDERS }))
      } else {
        showToast('error', t('toast.error'))
      }
    }
  }

  return (
    <Combobox
      options={options}
      value={currentFolderId ?? ALL_FOLDERS_VALUE}
      onValueChange={handleChange}
      className={className}
      footer={
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-full justify-start gap-2 rounded-md px-2 text-label-ui cursor-pointer sm:h-8"
          onClick={handleCreate}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('history.newFolder')}
        </Button>
      }
    />
  )
}