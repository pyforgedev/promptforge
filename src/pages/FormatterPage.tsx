import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { FormatterSkeleton } from '@/components/ui/skeleton'
import { InputSection } from '@/features/formatter/components/InputSection'
import { ProcessSummary } from '@/features/formatter/components/ProcessSummary'
import { QueueView } from '@/features/formatter/components/QueueView'
import { DownloadSection } from '@/features/formatter/components/DownloadSection'
import { ReplaceConfirmDialog } from '@/features/formatter/components/ReplaceConfirmDialog'
import { ResetProgressDialog } from '@/features/formatter/components/ResetProgressDialog'
import { ClearQueueDialog } from '@/features/formatter/components/ClearQueueDialog'
import {
  getActiveBatch,
  createFormatterBatch,
  markCopiedAndAdvance,
  setCurrentIndex,
  resetAllProgress,
  clearQueue,
  exportBatch,
  parseRawText,
  parseCsvPreview,
  parseCsvWithColumn,
  detectDuplicates,
  getUniqueAspectRatios,
  applyQueueView,
  detectPromptType,
} from '@/services/formatter/formatterService'
import { Sparkles } from 'lucide-react'
import type {
  InputMode,
  DownloadFormat,
  DownloadScope,
  PromptType,
  QueueSort,
  CsvPreviewResult,
} from '@/features/formatter/types'
import { useToast } from '@/hooks/useToast'

let writeQueue: Promise<void> = Promise.resolve()

function enqueueWrite<T>(write: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(write)
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

export default function FormatterPage() {
  const { t } = useTranslation()
  const { showCopySuccess, showToast } = useToast()

  const [inputMode, setInputMode] = useState<InputMode>('paste')
  const [pasteText, setPasteText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null)
  const [csvPreview, setCsvPreview] = useState<CsvPreviewResult | null>(null)
  const [selectedCsvColumn, setSelectedCsvColumn] = useState<string | null>(null)
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('txt')
  const [queueScope, setQueueScope] = useState<DownloadScope>('all')
  const [queueAspectRatio, setQueueAspectRatio] = useState<string | null>(null)
  const [queueType, setQueueType] = useState<'all' | PromptType>('all')
  const [queueSort, setQueueSort] = useState<QueueSort>('order')
  const [lastBatchId, setLastBatchId] = useState<number | undefined>(undefined)
  const [showReplace, setShowReplace] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [showClearQueue, setShowClearQueue] = useState(false)
  const [pendingPrompts, setPendingPrompts] = useState<string[] | null>(null)
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const optimisticActionRef = useRef(0)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeBatch = useLiveQuery(() => getActiveBatch())
  const isLoading = activeBatch === undefined
  const batch = activeBatch?.batch ?? null
  const items = useMemo(() => activeBatch?.items ?? [], [activeBatch?.items])
  const currentIndex = batch?.currentIndex ?? 0
  const activeRawIndex = optimisticIndex ?? currentIndex

  const visibleItems = useMemo(
    () =>
      applyQueueView(items, {
        scope: queueScope,
        aspectRatio: queueAspectRatio,
        type: queueType,
        sort: queueSort,
      }),
    [items, queueScope, queueAspectRatio, queueType, queueSort],
  )

  const displayIndex = useMemo(() => {
    // Posisi item aktif di set terfilter. Jika item aktif tidak lolos filter,
    // tampilkan item visible pertama (tanpa menulis DB); currentIndex di DB
    // tetap mengikuti item aktif yang asli.
    const pos = visibleItems.findIndex((item) => item.order === activeRawIndex)
    return pos >= 0 ? pos : 0
  }, [visibleItems, activeRawIndex])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  const flashCopySuccess = () => {
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current)
    }
    setCopySuccess(true)
    copyTimerRef.current = setTimeout(() => setCopySuccess(false), 1500)
  }

  const detectedAspectRatios = useMemo(() => getUniqueAspectRatios(items), [items])
  const promptTypeCache = useMemo(() => {
    const cache = new Map<string, PromptType>()
    for (const item of items) {
      if (!cache.has(item.promptText)) {
        cache.set(item.promptText, detectPromptType(item.promptText))
      }
    }
    return cache
  }, [items])
  const hasVideoItems = useMemo(
    () => items.some((item) => promptTypeCache.get(item.promptText) === 'video'),
    [items, promptTypeCache],
  )

  if (batch?.id !== lastBatchId) {
    setLastBatchId(batch?.id)
    setQueueAspectRatio(null)
    setQueueScope('all')
    setQueueType('all')
    setQueueSort('order')
    setOptimisticIndex(null)
    setCopySuccess(false)
  }

  const hasBatch = batch !== null
  const copiedCount = items.filter((i) => i.status === 'copied').length

  const processSummary = useMemo(() => {
    if (!batch) return null

    const cleanCount = items.length
    const skippedBlanks = 0
    const duplicateCount = detectDuplicates(items.map(i => i.promptText)).length

    return { cleanCount, skippedBlanks, duplicateCount }
  }, [batch, items])

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

    try {
      await createFormatterBatch(prompts, sourceType, fileName)
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
    const currentVisible = visibleItems[displayIndex]
    const itemId = currentVisible?.id
    if (!itemId) return

    const nextPos = Math.min(displayIndex + 1, visibleItems.length - 1)
    const nextIndex = visibleItems[nextPos]?.order ?? currentVisible.order

    try {
      await navigator.clipboard.writeText(currentVisible.promptText)
    } catch {
      showToast('error', t('toast.copyFailed'))
      return
    }

    const action = ++optimisticActionRef.current
    setOptimisticIndex(nextIndex)
    flashCopySuccess()
    showCopySuccess()

    void enqueueWrite(() => markCopiedAndAdvance(itemId, nextIndex)).catch(() => {
      if (optimisticActionRef.current !== action) return
      setOptimisticIndex(null)
      setCopySuccess(false)
      showToast('error', t('toast.copyFailed'))
    })
  }

  const handlePrev = () => {
    if (displayIndex <= 0) return

    const prevIndex = visibleItems[displayIndex - 1]?.order ?? activeRawIndex
    const action = ++optimisticActionRef.current
    setOptimisticIndex(prevIndex)

    void enqueueWrite(() => setCurrentIndex(prevIndex)).catch(() => {
      if (optimisticActionRef.current !== action) return
      setOptimisticIndex(null)
      setCopySuccess(false)
      showToast('error', t('toast.progressFailed'))
    })
  }

  const handleNext = () => {
    if (displayIndex >= visibleItems.length - 1) return

    const nextIndex = visibleItems[displayIndex + 1]?.order ?? activeRawIndex
    const action = ++optimisticActionRef.current
    setOptimisticIndex(nextIndex)

    void enqueueWrite(() => setCurrentIndex(nextIndex)).catch(() => {
      if (optimisticActionRef.current !== action) return
      setOptimisticIndex(null)
      setCopySuccess(false)
      showToast('error', t('toast.progressFailed'))
    })
  }

  const handleJump = (index: number) => {
    if (index < 0 || index >= visibleItems.length) return

    const rawIndex = visibleItems[index]?.order ?? activeRawIndex
    const action = ++optimisticActionRef.current
    setOptimisticIndex(rawIndex)

    void enqueueWrite(() => setCurrentIndex(rawIndex)).catch(() => {
      if (optimisticActionRef.current !== action) return
      setOptimisticIndex(null)
      setCopySuccess(false)
      showToast('error', t('toast.progressFailed'))
    })
  }

  const handleClearQueue = async () => {
    await clearQueue()
    setShowClearQueue(false)
    showToast('success', t('toast.queueCleared'))
  }

  const handleResetConfirm = () => {
    resetAllProgress()
    setShowReset(false)
    showToast('success', t('toast.resetSuccess'))
  }

  const handleDownload = () => {
    const content = exportBatch(visibleItems, downloadFormat)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    const arSuffix = queueAspectRatio ? `-${queueAspectRatio.replace(/:/g, 'x')}` : ''
    a.download = `formatter-export-${queueScope}${arSuffix}.${downloadFormat}`
    
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

      {isLoading ? (
        <FormatterSkeleton />
      ) : !hasBatch ? (
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
      ) : null}

      {!isLoading && (
        <InputSection
          inputMode={inputMode}
          pasteText={pasteText}
          uploadedFileName={uploadedFileName}
          csvPreview={csvPreview}
          selectedCsvColumn={selectedCsvColumn}
          onInputModeChange={setInputMode}
          onPasteTextChange={setPasteText}
          onClear={() => setPasteText('')}
          onFileUpload={handleFileUpload}
          onSelectCsvColumn={setSelectedCsvColumn}
          onConfirmCsvColumn={() => {
            showToast('success', t('formatter.csvColumnSelected'))
          }}
          onProcess={handleProcess}
        />
      )}

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

      {hasBatch && !isLoading && (
        <>
          <QueueView
            items={visibleItems}
            totalItems={items.length}
            copiedCount={copiedCount}
            currentIndex={displayIndex}
            copySuccess={copySuccess}
            onCopy={handleCopy}
            onPrev={handlePrev}
            onNext={handleNext}
            onJump={handleJump}
            onResetPrompt={() => setShowReset(true)}
            onClearQueue={() => setShowClearQueue(true)}
            scope={queueScope}
            onScopeChange={setQueueScope}
            detectedAspectRatios={detectedAspectRatios}
            selectedAspectRatio={queueAspectRatio}
            onAspectRatioChange={setQueueAspectRatio}
            hasVideoItems={hasVideoItems}
            queueType={queueType}
            onTypeChange={setQueueType}
            queueSort={queueSort}
            onSortChange={setQueueSort}
          />

          <ResetProgressDialog
            open={showReset}
            onOpenChange={setShowReset}
            onConfirm={handleResetConfirm}
          />

          <ClearQueueDialog
            open={showClearQueue}
            onOpenChange={setShowClearQueue}
            onConfirm={handleClearQueue}
          />

          <DownloadSection
            format={downloadFormat}
            onFormatChange={setDownloadFormat}
            onDownload={handleDownload}
            disabled={visibleItems.length === 0}
          />
        </>
      )}
    </div>
  )
}
