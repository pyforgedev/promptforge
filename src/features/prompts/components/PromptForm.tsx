import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  promptFormSchema,
  type PromptFormData,
} from '@/features/prompts/utils/promptValidators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Prompt } from '@/types'

interface PromptFormProps {
  initialData?: Prompt
  onSubmit: (data: PromptFormData) => Promise<void>
  onCancel: () => void
}

export function PromptForm({ initialData, onSubmit, onCancel }: PromptFormProps) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PromptFormData>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          content: initialData.content,
          category: initialData.category,
          tags: initialData.tags,
        }
      : { name: '', content: '', category: 'general', tags: [] },
  })

  const [tagsInput, setTagsInput] = useState(
    initialData?.tags?.join(', ') ?? '',
  )

  const handleTagsBlur = () => {
    const parsed = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    setValue('tags', parsed, { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          {t('prompts.name')}
        </label>
        <Input
          id="name"
          {...register('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium">
          {t('prompts.category')}
        </label>
        <Input
          id="category"
          {...register('category')}
          aria-invalid={!!errors.category}
          aria-describedby={errors.category ? 'category-error' : undefined}
        />
        {errors.category && (
          <p id="category-error" className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="content" className="text-sm font-medium">
          {t('prompts.content')}
        </label>
        <textarea
          id="content"
          rows={8}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...register('content')}
          aria-invalid={!!errors.content}
          aria-describedby={errors.content ? 'content-error' : undefined}
        />
        {errors.content && (
          <p id="content-error" className="text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tags" className="text-sm font-medium">
          {t('prompts.tags')}
        </label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          onBlur={handleTagsBlur}
          placeholder="tag1, tag2, tag3"
        />
        {errors.tags && (
          <p className="text-xs text-destructive">{errors.tags.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}
