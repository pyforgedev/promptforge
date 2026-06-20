import { useTranslation } from 'react-i18next'
import { GeneratorForm } from '@/features/prompt-generator/components/GeneratorForm'
import { PromptResultsDisplay } from '@/features/prompt-generator/components/PromptResultsDisplay'
import { PageHeader } from '@/components/common/PageHeader'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function GeneratorPage() {
  const { t } = useTranslation()
  const _hasHydrated = usePromptGeneratorStore((state) => state._hasHydrated)
  
  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title={t('generator.pageTitle_v2')}
        description={t('generator.pageDescription_v2')}
      />
      {!_hasHydrated ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <GeneratorForm />
          <PromptResultsDisplay />
        </>
      )}
    </div>
  )
}
