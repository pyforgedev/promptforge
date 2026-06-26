import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { InputSection } from '@/features/formatter/components/InputSection'
import { ProcessSummary } from '@/features/formatter/components/ProcessSummary'
import { QueueView } from '@/features/formatter/components/QueueView'
import { DownloadSection } from '@/features/formatter/components/DownloadSection'
import { ReplaceConfirmDialog } from '@/features/formatter/components/ReplaceConfirmDialog'
import { ResetProgressDialog } from '@/features/formatter/components/ResetProgressDialog'
import {
  getActiveBatch,
  createFormatterBatch,
  markItemCopied,
  setCurrentIndex,
  resetAllProgress,
  exportBatch,
  parseRawText,
  parseCsvPreview,
  parseCsvWithColumn,
  detectDuplicates,
  getUniqueAspectRatios,
} from '@/services/formatter/formatterService'
import { Sparkles } from 'lucide-react'
import type { InputMode, DownloadFormat, DownloadScope, CsvPreviewResult } from '@/features/formatter/types'
import { useToast } from '@/hooks/useToast'

export default function FormatterPage() {
  const { t } = useTranslation()
  const { showCopySuccess, showToast } = useToast()

  const [inputMode, setInputMode] = useState<InputMode>('paste')
  const [pasteText, setPasteText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null)
  const [csvPreview, setCsvPreview] = useState<CsvPreviewResult | null>(null)
  const [selectedCsvColumn, setSelectedCsvColumn] = useState<string | null>(null)
  const [processSummary, setProcessSummary] = useState<{
    cleanCount: number
    skippedBlanks: number
    duplicateCount: number
  } | null>(null)
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('txt')
  const [downloadScope, setDownloadScope] = useState<DownloadScope>('all')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string | null>(null)
  const [lastBatchId, setLastBatchId] = useState<number | undefined>(undefined)
  const [showReplace, setShowReplace] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [pendingPrompts, setPendingPrompts] = useState<string[] | null>(null)

  const activeBatch = useLiveQuery(() => getActiveBatch())
  const batch = activeBatch?.batch ?? null
  const items = useMemo(() => activeBatch?.items ?? [], [activeBatch?.items])
  const currentIndex = batch?.currentIndex ?? 0

  const detectedAspectRatios = useMemo(() => getUniqueAspectRatios(items), [items])

  if (batch?.id !== lastBatchId) {
    setLastBatchId(batch?.id)
    setSelectedAspectRatio(null)
  }

  const hasBatch = batch !== null
  const copiedCount = items.filter((i) => i.status === 'copied').length

  const getPromptsFromInput = (): string[] => {
    if (inputMode === 'paste') {
      return parseRawText(pasteText)
    }

    if (!uploadedFileContent) return []

    if (csvPreview !== null) {
      const column = selectedCsvColumn ?? csvPreview.detectedColumn ?? null
      if (!column) return []
      return parseCsvWithColumn(uploadedFileContent, column)
    }

    return parseRawText(uploadedFileContent)
  }

  const executeCreateBatch = async (prompts: string[]) => {
    const sourceType = inputMode === 'paste' ? 'paste' : 'file'
    const fileName = inputMode === 'upload' ? uploadedFileName ?? undefined : undefined

    const duplicates = detectDuplicates(prompts)

    try {
      await createFormatterBatch(prompts, sourceType, fileName)

      setProcessSummary({
        cleanCount: prompts.length,
        skippedBlanks: 0,
        duplicateCount: duplicates.length,
      })

      showToast('success', t('formatter.batchCreated'))
    } catch (error) {
      showToast('error', t('formatter.batchError'), String(error))
    }
  }

  const handleFileUpload = (name: string, content: string) => {
    setUploadedFileName(name)
    setUploadedFileContent(content)
    setSelectedCsvColumn(null)

    if (name.toLowerCase().endsWith('.csv')) {
      const preview = parseCsvPreview(content)
      setCsvPreview(preview)

      if (preview.detectedColumn !== null) {
        setSelectedCsvColumn(preview.detectedColumn)
      }
    } else {
      setCsvPreview(null)
    }
  }

  const handleProcess = () => {
    const prompts = getPromptsFromInput()
    if (prompts.length === 0) return

    if (hasBatch && copiedCount > 0) {
      setPendingPrompts(prompts)
      setShowReplace(true)
    } else {
      executeCreateBatch(prompts)
    }
  }

  const handleConfirmReplace = () => {
    if (pendingPrompts) {
      executeCreateBatch(pendingPrompts)
    }
    setShowReplace(false)
    setPendingPrompts(null)
  }

  const handleCopy = async () => {
    const currentItem = items[currentIndex]
    if (!currentItem?.id) return

    try {
      await navigator.clipboard.writeText(currentItem.promptText)
      await markItemCopied(currentItem.id)
      const nextIndex = Math.min(currentIndex + 1, items.length - 1)
      await setCurrentIndex(nextIndex)
      showCopySuccess()
    } catch {
      showToast('error', t('toast.copyFailed'))
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleJump = (index: number) => {
    setCurrentIndex(index)
  }

  const handleResetConfirm = () => {
    resetAllProgress()
    setShowReset(false)
    showToast('success', t('toast.resetSuccess'))
  }

  const handleDownload = () => {
    const content = exportBatch(items, downloadFormat, downloadScope, selectedAspectRatio)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    const arSuffix = selectedAspectRatio ? `-${selectedAspectRatio.replace(/:/g, 'x')}` : ''
    a.download = `formatter-export-${downloadScope}${arSuffix}.${downloadFormat}`
    
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('success', t('toast.downloadSuccess'))
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <PageHeader
        title={t('formatter.pageTitle')}
        description={t('formatter.pageDescription')}
      />

      {!hasBatch && (
        <div className="animate-stagger-1">
          <EmptyState
            title={t('formatter.emptyTitle')}
            description={t('formatter.emptyDescription')}
            action={
              <Button
                variant="default"
                className="btn-press gap-2"
                onClick={() => setInputMode('paste')}
              >
                <Sparkles className="h-4 w-4" />
                {t('formatter.emptyAction')}
              </Button>
            }
          />
        </div>
      )}

      <InputSection
        inputMode={inputMode}
        pasteText={pasteText}
        uploadedFileName={uploadedFileName}
        csvPreview={csvPreview}
        selectedCsvColumn={selectedCsvColumn}
        onInputModeChange={setInputMode}
        onPasteTextChange={setPasteText}
        onFileUpload={handleFileUpload}
        onSelectCsvColumn={setSelectedCsvColumn}
        onConfirmCsvColumn={() => {
          showToast('success', t('formatter.csvColumnSelected'))
        }}
        onProcess={handleProcess}
      />

      <ReplaceConfirmDialog
        open={showReplace}
        onOpenChange={setShowReplace}
        copiedCount={copiedCount}
        totalCount={items.length}
        onConfirm={handleConfirmReplace}
      />

      {processSummary && (
        <ProcessSummary
          cleanCount={processSummary.cleanCount}
          skippedBlanks={processSummary.skippedBlanks}
          duplicateCount={processSummary.duplicateCount}
        />
      )}

      {hasBatch && (
        <>
          <QueueView
            items={items}
            currentIndex={currentIndex}
            onCopy={handleCopy}
            onPrev={handlePrev}
            onJump={handleJump}
            onResetPrompt={() => setShowReset(true)}
          />

          <ResetProgressDialog
            open={showReset}
            onOpenChange={setShowReset}
            onConfirm={handleResetConfirm}
          />

          <DownloadSection
            format={downloadFormat}
            scope={downloadScope}
            detectedAspectRatios={detectedAspectRatios}
            selectedAspectRatio={selectedAspectRatio}
            onFormatChange={setDownloadFormat}
            onScopeChange={setDownloadScope}
            onAspectRatioChange={setSelectedAspectRatio}
            onDownload={handleDownload}
            disabled={items.length === 0}
          />
        </>
      )}
    </div>
  )
}
