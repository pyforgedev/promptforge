import { useState } from 'react'
import { FileText, Settings2, Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { useTemplates } from '@/features/templates/hooks/useTemplates'
import { hasGeneratorSettings } from '@/features/templates/types'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'

export function TemplatePicker() {
  const { t } = useTranslation()
  const { templates, loading, loadError } = useTemplates()
  const applyTemplateSettings = usePromptGeneratorStore((state) => state.applyTemplateSettings)
  const setTemplateReference = usePromptGeneratorStore((state) => state.setTemplateReference)
  const clearTemplateReference = usePromptGeneratorStore((state) => state.clearTemplateReference)
  const activeTemplateReference = usePromptGeneratorStore((state) => state.activeTemplateReference)
  const [selectedId, setSelectedId] = useState(() => activeTemplateReference?.id ?? '')
  const selected = templates.find((template) => template.id === selectedId)

  const options: ComboboxOption[] = templates.map((template) => ({
    value: template.id,
    label: template.name,
    searchText: `${template.name} ${template.tags.join(' ')}`,
    icon: <FileText className="h-3.5 w-3.5" />,
    badge: t(hasGeneratorSettings(template) ? 'templates.fullMetadataBadge' : 'templates.textOnlyBadge'),
  }))

  const loadSettings = () => {
    if (!selected?.generatorSettings) return
    applyTemplateSettings(selected.id, selected.name, selected.generatorSettings)
    toast.success(t('generator.form.templates.loadedSettings'))
  }

  const useAsReference = () => {
    if (!selected) return
    setTemplateReference(selected.id, selected.name, selected.content)
    toast.success(t(selected.content.length > 2_000
      ? 'templates.referenceTruncatedToast'
      : 'templates.referenceToast'))
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-hover/30 p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="generator-template-picker">{t('generator.form.templates.label')}</Label>
        <Combobox
          id="generator-template-picker"
          options={options}
          value={selectedId}
          onValueChange={setSelectedId}
          placeholder={loadError ? t('generator.form.templates.loadFailed') : t('generator.form.templates.placeholder')}
          disabled={loading || !!loadError}
        />
      </div>

      {selected && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={loadSettings} disabled={!selected.generatorSettings}>
            <Settings2 className="mr-2 h-4 w-4" />
            {t('generator.form.templates.loadSettings')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={useAsReference}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t('generator.form.templates.useAsReference')}
          </Button>
        </div>
      )}

      {activeTemplateReference && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-brand-primary/20 bg-brand-primary/5 px-3 py-2">
          <p className="min-w-0 truncate text-caption-ui text-secondary">
            {t(
              activeTemplateReference.mode === 'reference'
                ? 'generator.form.templates.activeReference'
                : 'generator.form.templates.activeSettings',
              { name: activeTemplateReference.name },
            )}
          </p>
          <Button type="button" variant="ghost" size="icon" onClick={clearTemplateReference} aria-label={t('generator.form.templates.clearReference')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
