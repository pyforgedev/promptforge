import { useTranslation } from 'react-i18next'
import { GeneratorForm } from '@/features/generator/components/GeneratorForm'
import { PageHeader } from '@/components/common/PageHeader'

export default function GeneratorPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('generator.pageTitle')}
        description={t('generator.pageDescription')}
      />
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <GeneratorForm />
      </div>
    </div>
  )
}
