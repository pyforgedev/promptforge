import { useTranslation } from 'react-i18next'
import { GeneratorForm } from '@/features/prompt-generator/components/GeneratorForm'
import { PromptResultsDisplay } from '@/features/prompt-generator/components/PromptResultsDisplay'
import { PageHeader } from '@/components/common/PageHeader'
import { usePromptGeneratorStore } from '@/features/prompt-generator/store/promptGeneratorStore'
import { Skeleton } from '@/components/ui/skeleton'

export default function GeneratorPage() {
  const { t } = useTranslation()
  const _hasHydrated = usePromptGeneratorStore((state) => state._hasHydrated)
  
  return (
    <div className="flex flex-col gap-6 md:gap-8">
       <PageHeader
        title={t('generator.pageTitle_v2')}
        description={t('generator.pageDescription_v2')}
      />
      {!_hasHydrated ? (
        <div className="flex flex-col gap-4 py-2" role="status" aria-live="polite">
          <Skeleton className="h-[360px] w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
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
