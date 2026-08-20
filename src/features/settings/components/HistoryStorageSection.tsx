import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Database, HardDrive, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { SectionDivider, SectionGroup } from './Section'
import { useToast } from '@/hooks/useToast'
import {
  getHistoryStorageStats,
  previewRetentionPrune,
  runRetentionPrune,
  saveRetentionPolicy,
  RETENTION_TTL_OPTIONS,
  type HistoryStorageStats,
  type RetentionTtl,
} from '@/services/storage/indexeddb'

function formatCount(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function formatLastPruned(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
}

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-label-ui text-primary">{label}</span>
        {hint ? <span className="text-caption-ui text-muted">{hint}</span> : null}
      </div>
      <span className="shrink-0 text-label-ui font-semibold text-brand-primary tabular-nums">{value}</span>
    </div>
  )
}

export function HistoryStorageSection() {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [stats, setStats] = useState<HistoryStorageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  // Pending TTL change awaiting confirmation (destructive policy application).
  const [pendingTtl, setPendingTtl] = useState<RetentionTtl | null>(null)
  const [ttlPreview, setTtlPreview] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const next = await getHistoryStorageStats()
      setStats(next)
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStorage] stats refresh failed:', err)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async stats load on mount
    void refresh()
  }, [refresh])

  const handleTtlChange = useCallback(
    async (value: string) => {
      if (!stats || !RETENTION_TTL_OPTIONS.includes(value as RetentionTtl)) return
      const next = value as RetentionTtl
      if (next === stats.policy.ttl) return
      try {
        const preview = await previewRetentionPrune({ version: 1, cap: stats.policy.cap, ttl: next })
        setPendingTtl(next)
        setTtlPreview(preview)
      } catch {
        showToast('error', t('settings.historyStorage.policyFailed'))
      }
    },
    [stats, showToast, t],
  )

  const confirmTtlChange = useCallback(async () => {
    if (!stats || pendingTtl === null) return
    setApplying(true)
    try {
      await saveRetentionPolicy({ version: 1, cap: stats.policy.cap, ttl: pendingTtl })
      const deleted = await runRetentionPrune({ force: true })
      await refresh()
      setPendingTtl(null)
      showToast(
        'success',
        deleted > 0
          ? t('settings.historyStorage.pruned', { count: deleted })
          : t('settings.historyStorage.policySaved'),
      )
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStorage] applying TTL failed:', err)
      showToast('error', t('settings.historyStorage.policyFailed'))
    } finally {
      setApplying(false)
    }
  }, [stats, pendingTtl, refresh, showToast, t])

  const confirmPruneNow = useCallback(async () => {
    setApplying(true)
    try {
      const deleted = await runRetentionPrune({ force: true })
      await refresh()
      showToast(
        'success',
        deleted > 0
          ? t('settings.historyStorage.pruned', { count: deleted })
          : t('settings.historyStorage.nothingToClean'),
      )
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[HistoryStorage] prune failed:', err)
      showToast('error', t('settings.historyStorage.pruneFailed'))
    } finally {
      setApplying(false)
    }
  }, [refresh, showToast, t])

  if (loading) {
    return (
      <Card className="card-spotlight">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
            <Database className="h-4 w-4 text-brand-primary" />
          </div>
          <CardTitle className="text-heading">{t('settings.historyStorage.title')}</CardTitle>
        </CardHeader>
        <CardContent role="status" aria-live="polite" className="flex flex-col gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  const hasCandidates = (stats?.prunePreview ?? 0) > 0

  return (
    <Card className="card-spotlight">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/10">
          <Database className="h-4 w-4 text-brand-primary" />
        </div>
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-heading">{t('settings.historyStorage.title')}</CardTitle>
          <span className="text-caption-ui text-secondary">{t('settings.historyStorage.description')}</span>
        </div>
      </CardHeader>

      {stats === null ? (
        <CardContent>
          <p className="text-body-ui text-muted">{t('settings.historyStorage.unavailable')}</p>
        </CardContent>
      ) : (
        <CardContent className="flex flex-col gap-6">
          <SectionGroup icon={HardDrive} title={t('settings.historyStorage.usage')}>
            <StatRow label={t('settings.historyStorage.totalPrompts')} value={formatCount(stats.total)} />
            <StatRow label={t('settings.historyStorage.favorites')} value={formatCount(stats.favorites)} />
            <StatRow label={t('settings.historyStorage.legacy')} value={formatCount(stats.legacy)} />
            <StatRow
              label={t('settings.historyStorage.spaceUsed')}
              value={
                stats.origin.usage !== null && stats.origin.quota !== null
                  ? `${formatBytes(stats.origin.usage)} / ${formatBytes(stats.origin.quota)}`
                  : t('settings.historyStorage.originUnavailable')
              }
              hint={t('settings.historyStorage.originScope')}
            />
          </SectionGroup>

          <SectionDivider />

          <SectionGroup icon={ShieldCheck} title={t('settings.historyStorage.retention')}>
            <StatRow
              label={t('settings.historyStorage.retentionCap')}
              value={formatCount(stats.policy.cap)}
              hint={t('settings.historyStorage.retentionCapHint')}
            />

            <div className="flex items-center justify-between gap-4">
              <label htmlFor="history-retention-ttl" className="shrink-0 text-label-ui text-primary">
                {t('settings.historyStorage.ttl')}
              </label>
              <div className="w-full max-w-sm">
                <Select value={stats.policy.ttl} onValueChange={handleTtlChange}>
                  <SelectTrigger id="history-retention-ttl" className="w-full" aria-label={t('settings.historyStorage.ttl')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">{t('settings.historyStorage.ttlOff')}</SelectItem>
                    <SelectItem value="90">{t('settings.historyStorage.ttl90')}</SelectItem>
                    <SelectItem value="180">{t('settings.historyStorage.ttl180')}</SelectItem>
                    <SelectItem value="365">{t('settings.historyStorage.ttl365')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <StatRow
              label={t('settings.historyStorage.lastPruned')}
              value={stats.lastPruned === null ? t('settings.historyStorage.neverPruned') : formatLastPruned(stats.lastPruned)}
            />

            <div className="flex items-center gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!hasCandidates || applying}
                    aria-disabled={!hasCandidates || applying}
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {hasCandidates
                      ? t('settings.historyStorage.pruneNow')
                      : t('settings.historyStorage.pruneNowDisabled')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.historyStorage.pruneNowTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('settings.historyStorage.pruneNowDescription', { count: stats.prunePreview })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={applying}>{t('settings.historyStorage.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={applying}
                      onClick={confirmPruneNow}
                      className="bg-brand-danger text-white hover:bg-brand-danger/90"
                    >
                      {t('settings.historyStorage.apply')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {hasCandidates && (
                <span className="text-caption-ui text-muted">
                  {t('settings.historyStorage.prunePreviewCount', { count: stats.prunePreview })}
                </span>
              )}
            </div>
          </SectionGroup>
        </CardContent>
      )}

      {/* TTL change confirmation — destructive policy application requires it */}
      <AlertDialog open={pendingTtl !== null} onOpenChange={(open) => { if (!open) setPendingTtl(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.historyStorage.ttlChangeTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {ttlPreview > 0
                ? t('settings.historyStorage.ttlChangeDescription', { count: ttlPreview })
                : t('settings.historyStorage.ttlChangeNoOp')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>{t('settings.historyStorage.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={applying}
              onClick={confirmTtlChange}
              className="bg-brand-danger text-white hover:bg-brand-danger/90"
            >
              {t('settings.historyStorage.apply')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}