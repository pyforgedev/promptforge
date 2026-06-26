import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table2 } from 'lucide-react'

interface CsvColumnPickerProps {
  columns: string[]
  previewRows: string[][]
  selectedColumn: string | null
  onSelectColumn: (col: string) => void
  onConfirm: () => void
}

export function CsvColumnPicker({
  columns,
  previewRows,
  selectedColumn,
  onSelectColumn,
  onConfirm,
}: CsvColumnPickerProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-label-ui font-medium text-primary">
            {t('formatter.csvColumnPicker')}
          </label>
          <Select
            value={selectedColumn || ''}
            onValueChange={onSelectColumn}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="default"
          className="btn-press"
          onClick={onConfirm}
          disabled={!selectedColumn}
        >
          {t('formatter.confirmColumn')}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Table2 className="h-3.5 w-3.5 text-muted" />
          <h4 className="text-caption-ui font-medium text-primary">
            {t('formatter.csvPreviewTitle')}
          </h4>
        </div>
        <div className="w-full overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full min-w-[500px] border-collapse text-left text-body-ui">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-hover">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-caption-ui font-semibold text-muted"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b border-border-subtle last:border-0 transition-colors hover:bg-brand-primary/[0.02]"
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-primary">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
