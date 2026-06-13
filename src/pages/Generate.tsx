import { useTranslation } from 'react-i18next'
import { PromptGenerator } from '@/features/prompt-generation/components/PromptGenerator'
import { PageHeader } from '@/components/common/PageHeader'

export default function Generate() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('promptGeneration.pageTitle')}
        description={t('promptGeneration.pageDescription')}
      />
      <PromptGenerator />
    </div>
  )
}
