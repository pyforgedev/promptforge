import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FileJson, Save, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { useMasterPromptStore } from '@/store/useMasterPromptStore'
import { DEFAULT_SYSTEM_PROMPT } from '@/features/prompt-generator/engine/MetaPromptBuilder'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function MasterPromptSection() {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const {
    customPrompt: savedCustomPrompt,
    load: loadMasterPrompt,
    setCustomPrompt: saveMasterPrompt,
    resetToDefault: resetMasterPrompt,
  } = useMasterPromptStore()

  const [masterPromptText, setMasterPromptText] = useState('')
  const [masterPromptLoaded, setMasterPromptLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        await loadMasterPrompt()
        const store = useMasterPromptStore.getState()
        const promptValue = store.customPrompt ?? DEFAULT_SYSTEM_PROMPT
        setMasterPromptText(typeof promptValue === 'string' ? promptValue : String(promptValue))
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[Settings] Failed to load master prompt:', err)
        setMasterPromptText(DEFAULT_SYSTEM_PROMPT)
      } finally {
        setMasterPromptLoaded(true)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveMasterPrompt = async () => {
    const trimmed = String(masterPromptText ?? '').trim()
    if (!trimmed || trimmed === DEFAULT_SYSTEM_PROMPT) {
      await resetMasterPrompt()
      showToast('success', t('settings.masterPromptReset', { defaultValue: 'Master prompt reset to default' }))
      return
    }
    await saveMasterPrompt(trimmed)
    showToast('success', t('settings.masterPromptSaved', { defaultValue: 'Master prompt saved' }))
  }

  const handleResetMasterPrompt = async () => {
    await resetMasterPrompt()
    setMasterPromptText(DEFAULT_SYSTEM_PROMPT)
    showToast('success', t('settings.masterPromptReset', { defaultValue: 'Master prompt reset to default' }))
  }

  return (
    <Card className="card-spotlight">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
          <FileJson className="h-4 w-4 text-brand-primary" />
        </div>
        <div>
          <CardTitle className="text-heading">
            {t('settings.masterPrompt', { defaultValue: 'Advanced — Master Prompt' })}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border border-brand-warning/20 bg-brand-warning/10 px-4 py-3 text-body-ui text-secondary">
          {t('settings.masterPromptWarning', { defaultValue: 'Editing this affects every generation going forward. Use Reset if results get worse.' })}
        </div>
        {masterPromptLoaded ? (
          <Textarea
            value={masterPromptText}
            onChange={(e) => setMasterPromptText(e.target.value)}
            placeholder={t('settings.masterPromptPlaceholder', { defaultValue: 'The default master prompt will appear here...' })}
            className="min-h-[300px] max-h-[480px] resize-y overflow-y-auto font-mono text-sm"
          />
        ) : (
          <Skeleton className="h-[300px] w-full rounded-lg" />
        )}
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveMasterPrompt} disabled={!String(masterPromptText ?? '').trim()}>
            <Save className="h-4 w-4" />
            {t('common.save')}
          </Button>
          <Button
            variant="outline"
            onClick={handleResetMasterPrompt}
            disabled={!savedCustomPrompt}
          >
            <RotateCcw className="h-4 w-4" />
            {t('settings.resetDefault')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
