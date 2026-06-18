import { useTranslation } from 'react-i18next'
import { GeneratorForm } from '@/features/prompt-generator/components/GeneratorForm'
import { PromptResultsDisplay } from '@/features/prompt-generator/components/PromptResultsDisplay'
import { PageHeader } from '@/components/common/PageHeader'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'
import { useEffect } from 'react'


export default function GeneratorPage() {
  const { t } = useTranslation()

  // Clean up batch data on component unmount to avoid showing stale results
  useEffect(() => {
    return () => {
      usePromptGeneratorStore.getState().clearBatch()
    }
  }, [])
  
  return (
    <div className="flex flex-col gap-8">
       <PageHeader
        title={t('generator.pageTitle_v2')}
        description={t('generator.pageDescription_v2')}
      />
      <GeneratorForm />
      <PromptResultsDisplay />
    </div>
  )
}
