import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TEMPLATE_CATEGORIES, type PromptTemplate } from '@/features/templates/types'
import {
  templateFormSchema,
  type TemplateFormData,
} from '@/features/templates/utils/templateValidators'
import type { TemplateErrorCode } from '@/features/templates/services/templateService'

interface TemplateFormProps {
  initialData?: Partial<PromptTemplate>
  onSubmit: (data: TemplateFormData) => Promise<void>
  onCancel: () => void
  submitError?: TemplateErrorCode | null
  pending?: boolean
}

const ERROR_KEYS: Record<TemplateErrorCode, string> = {
  DUPLICATE_NAME: 'templates.errors.duplicateName',
  NOT_FOUND: 'templates.errors.notFound',
  INVALID_DATA: 'templates.errors.invalidData',
  BUILTIN_CONFLICT: 'templates.errors.builtinConflict',
  IMPORT_LIMIT: 'templates.errors.importLimit',
  STORAGE_FAILED: 'templates.errors.storageFailed',
}

export function TemplateForm({
  initialData,
  onSubmit,
  onCancel,
  submitError,
  pending = false,
}: TemplateFormProps) {
  const { t } = useTranslation()
  const initialCategory = initialData?.category ?? 'general'
  const legacyCategory = initialCategory
    && !TEMPLATE_CATEGORIES.some((category) => category === initialCategory)
    ? initialCategory
    : null
  const legacyCategoryLabel = legacyCategory
    ? t('templates.categories.legacyOption', { category: legacyCategory })
    : null
  const categoryOptions: ComboboxOption[] = [
    ...(legacyCategory && legacyCategoryLabel ? [{
      value: legacyCategory,
      label: legacyCategoryLabel,
      searchText: `${legacyCategory} ${legacyCategoryLabel}`,
    }] : []),
    ...TEMPLATE_CATEGORIES.map((category) => {
      const label = t(`templates.categories.${category}`)
      return { value: category, label, searchText: `${category} ${label}` }
    }),
  ]
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') ?? '')
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      content: initialData?.content ?? '',
      category: initialCategory,
      tags: initialData?.tags ?? [],
    },
  })

  const updateTags = (value: string) => {
    setTagsInput(value)
    setValue('tags', value.split(',').map((tag) => tag.trim()).filter(Boolean), {
      shouldValidate: true,
    })
  }

  const fieldError = (message?: string) => message ? t(message) : null
  const busy = pending || isSubmitting

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {submitError && (
        <div role="alert" className="overlay-glass flex items-start gap-2 rounded-r-lg border-l-[3px] border-l-brand-danger p-3 text-body-ui">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
          <span className="text-secondary">{t(ERROR_KEYS[submitError])}</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="template-name" className="text-label-ui">{t('templates.fields.name')}</label>
        <Input
          id="template-name"
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'template-name-error' : undefined}
        />
        {errors.name && <p id="template-name-error" className="flex items-center gap-1 text-caption-ui text-brand-danger"><AlertCircle className="h-3 w-3" />{fieldError(errors.name.message)}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="template-category" className="text-label-ui">{t('templates.fields.category')}</label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Combobox
              id="template-category"
              options={categoryOptions}
              value={field.value}
              onValueChange={field.onChange}
              portalled={false}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? 'template-category-error' : undefined}
            />
          )}
        />
        {errors.category && <p id="template-category-error" className="flex items-center gap-1 text-caption-ui text-brand-danger"><AlertCircle className="h-3 w-3" />{fieldError(errors.category.message)}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="template-content" className="text-label-ui">{t('templates.fields.content')}</label>
        <Textarea
          id="template-content"
          rows={8}
          className="min-h-40"
          {...register('content')}
          aria-invalid={!!errors.content}
          aria-describedby={errors.content ? 'template-content-error' : undefined}
        />
        {errors.content && <p id="template-content-error" className="flex items-center gap-1 text-caption-ui text-brand-danger"><AlertCircle className="h-3 w-3" />{fieldError(errors.content.message)}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="template-tags" className="text-label-ui">{t('templates.fields.tags')}</label>
        <Input
          id="template-tags"
          value={tagsInput}
          onChange={(event) => updateTags(event.target.value)}
          placeholder={t('templates.fields.tagsPlaceholder')}
          aria-invalid={!!errors.tags}
        />
        {errors.tags && <p className="flex items-center gap-1 text-caption-ui text-brand-danger"><AlertCircle className="h-3 w-3" />{fieldError(errors.tags.message)}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>{t('common.cancel')}</Button>
        <Button type="submit" disabled={busy}>{t('common.save')}</Button>
      </div>
    </form>
  )
}
