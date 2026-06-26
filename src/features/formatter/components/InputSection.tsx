import { useTranslation } from 'react-i18next'
import { Upload, FileText, Sparkles } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CsvColumnPicker } from './CsvColumnPicker'
import type { CsvPreviewResult, InputMode } from '../types'

interface InputSectionProps {
  inputMode: InputMode
  pasteText: string
  uploadedFileName: string | null
  csvPreview: CsvPreviewResult | null
  selectedCsvColumn: string | null
  onInputModeChange: (mode: InputMode) => void
  onPasteTextChange: (text: string) => void
  onFileUpload: (name: string, content: string) => void
  onSelectCsvColumn: (col: string) => void
  onConfirmCsvColumn: () => void
  onProcess: () => void
}

export function InputSection({
  inputMode,
  pasteText,
  uploadedFileName,
  csvPreview,
  selectedCsvColumn,
  onInputModeChange,
  onPasteTextChange,
  onFileUpload,
  onSelectCsvColumn,
  onConfirmCsvColumn,
  onProcess,
}: InputSectionProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onFileUpload(file.name, reader.result as string)
    }
    reader.readAsText(file)
  }

  const showCsvPicker =
    inputMode === 'upload' &&
    csvPreview !== null &&
    csvPreview.detectedColumn === null

  return (
    <div className="card-spotlight flex flex-col gap-5 rounded-xl border border-border-subtle bg-surface p-5 animate-stagger-1">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-surface-hover p-0.5">
          <button
            type="button"
            onClick={() => onInputModeChange('paste')}
            className={cn(
              'relative rounded-md px-4 py-1.5 text-label-ui font-medium transition-all duration-200',
              inputMode === 'paste'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-muted hover:text-primary'
            )}
          >
            {t('formatter.inputMode.paste')}
          </button>
          <button
            type="button"
            onClick={() => onInputModeChange('upload')}
            className={cn(
              'relative rounded-md px-4 py-1.5 text-label-ui font-medium transition-all duration-200',
              inputMode === 'upload'
                ? 'bg-surface text-primary shadow-xs'
                : 'text-muted hover:text-primary'
            )}
          >
            {t('formatter.inputMode.upload')}
          </button>
        </div>
      </div>

      {inputMode === 'paste' ? (
        <textarea
          value={pasteText}
          onChange={(e) => onPasteTextChange(e.target.value)}
          placeholder={t('formatter.pastePlaceholder')}
          className="w-full max-h-[280px] resize-none overflow-y-auto rounded-lg border border-border-subtle bg-surface-hover/50 px-4 py-3 font-mono text-sm leading-relaxed text-primary placeholder:text-muted transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary/50 focus:bg-surface"
          rows={8}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border-subtle bg-surface-hover/30 px-6 py-10 text-center transition-all duration-200 hover:border-brand-primary/40 hover:bg-brand-primary/[0.02]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary transition-transform duration-200 group-hover:scale-105">
              <Upload className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-ui font-medium text-primary">{t('formatter.uploadLabel')}</span>
              <span className="text-caption-ui text-muted">{t('formatter.uploadHint')}</span>
            </div>
            {uploadedFileName && (
              <div className="mt-1 flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-3 py-1 text-caption-ui font-medium text-brand-primary">
                <FileText className="h-3.5 w-3.5" />
                {uploadedFileName}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {showCsvPicker && csvPreview && (
        <CsvColumnPicker
          columns={csvPreview.columns}
          previewRows={csvPreview.previewRows}
          selectedColumn={selectedCsvColumn}
          onSelectColumn={onSelectCsvColumn}
          onConfirm={onConfirmCsvColumn}
        />
      )}

      <Button
        variant="default"
        className="btn-press w-full gap-2 sm:w-auto"
        onClick={onProcess}
      >
        <Sparkles className="h-4 w-4" />
        {t('formatter.process')}
      </Button>
    </div>
  )
}
