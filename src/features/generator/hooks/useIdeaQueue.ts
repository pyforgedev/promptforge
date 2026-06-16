import { useReducer, useEffect, useRef, useCallback } from 'react'
import { fetchNicheIdeas } from '../services/generatorService'
import { getIdeaCache, saveIdeaCache, clearExpiredIdeaCache } from '@/services/storage/indexeddb'
import type { StylePresetKey } from '../types'
import type { AIConfig } from '@/features/settings/types'

const REFILL_THRESHOLD = 2
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000

interface QueueState {
  queue: string[]
  used: string[]
  isHydrating: boolean
  isFetchingInitial: boolean
  isRefilling: boolean
  isInitialized: boolean
}

type QueueAction =
  | { type: 'SET_INITIAL'; payload: { queue: string[]; used: string[] } }
  | { type: 'SET_HYDRATING'; payload: boolean }
  | { type: 'SET_FETCHING_INITIAL'; payload: boolean }
  | { type: 'SET_REFILLING'; payload: boolean }
  | { type: 'APPEND'; payload: string[] }
  | { type: 'SHIFT'; payload: string }

function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'SET_INITIAL':
      return {
        ...state,
        queue: action.payload.queue,
        used: action.payload.used,
        isHydrating: false,
        isInitialized: true,
      }
    case 'SET_HYDRATING':
      return { ...state, isHydrating: action.payload }
    case 'SET_FETCHING_INITIAL':
      return { ...state, isFetchingInitial: action.payload }
    case 'SET_REFILLING':
      return { ...state, isRefilling: action.payload }
    case 'APPEND':
      return {
        ...state,
        queue: [...state.queue, ...action.payload],
        isRefilling: false,
        isFetchingInitial: false,
      }
    case 'SHIFT':
      return {
        ...state,
        queue: state.queue.slice(1),
        used: [...state.used, action.payload].slice(-100),
      }
    default:
      return state
  }
}

interface UseIdeaQueueReturn {
  getNextIdea: () => string | null
  isHydrating: boolean
  isFetchingInitial: boolean
  isRefilling: boolean
  isInitialized: boolean
  isQueueEmpty: boolean
}

export function useIdeaQueue(
  stylePreset: StylePresetKey,
  customStyle: string,
  config: AIConfig | null,
  isConfigValid: boolean
): UseIdeaQueueReturn {
  const [{ queue, used, isHydrating, isFetchingInitial, isRefilling, isInitialized }, dispatch] =
    useReducer(queueReducer, {
      queue: [],
      used: [],
      isHydrating: true,
      isFetchingInitial: false,
      isRefilling: false,
      isInitialized: false,
    })

  const internalRefillingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)

  const cacheKey = `${stylePreset.toLowerCase().trim() || 'none'}|${customStyle.toLowerCase().trim() || ''}`

  const persistToDB = useCallback(async (key: string, q: string[], u: string[]) => {
    try {
      await saveIdeaCache({ cacheKey: key, queue: q, used: u, lastUpdated: Date.now() })
    } catch (err) {
      console.error('Failed to persist idea cache:', err)
    }
  }, [])

  const fillQueue = useCallback(
    async (
      key: string,
      preset: StylePresetKey,
      style: string,
      cfg: AIConfig,
      generation: number,
      currentUsed: string[],
      currentQueue: string[],
      isInitialFetch: boolean
    ) => {
      if (internalRefillingRef.current) return
      internalRefillingRef.current = true

      if (isInitialFetch) {
        dispatch({ type: 'SET_FETCHING_INITIAL', payload: true })
      } else {
        dispatch({ type: 'SET_REFILLING', payload: true })
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const newIdeas = await fetchNicheIdeas(preset, style, cfg, currentUsed, controller.signal)

        if (!controller.signal.aborted && generation === generationRef.current) {
          const filtered = newIdeas.filter(
            (idea) =>
              !currentUsed.some((u) => u.toLowerCase().trim() === idea.toLowerCase().trim()) &&
              !currentQueue.some((q) => q.toLowerCase().trim() === idea.toLowerCase().trim())
          )

          const finalIdeas = filtered.length > 0 ? filtered : newIdeas

          dispatch({ type: 'APPEND', payload: finalIdeas })
          await persistToDB(key, [...currentQueue, ...finalIdeas], currentUsed)
        }
      } catch (err) {
        const e = err as Error
        if (e.name === 'AbortError' || e.name === 'CanceledError') return
        if (!controller.signal.aborted && generation === generationRef.current) {
          dispatch({ type: 'SET_REFILLING', payload: false })
          dispatch({ type: 'SET_FETCHING_INITIAL', payload: false })
        }
      } finally {
        internalRefillingRef.current = false
      }
    },
    [persistToDB]
  )

  useEffect(() => {
    clearExpiredIdeaCache(CACHE_TTL).catch(console.error)
  }, [])

  useEffect(() => {
    abortControllerRef.current?.abort()
    internalRefillingRef.current = false
    generationRef.current += 1
    const currentGeneration = generationRef.current

    dispatch({ type: 'SET_HYDRATING', payload: true })

    async function init() {
      const cached = await getIdeaCache(cacheKey)

      if (currentGeneration !== generationRef.current) return

      if (cached && cached.queue.length > 0) {
        dispatch({ type: 'SET_INITIAL', payload: { queue: cached.queue, used: cached.used } })

        if (cached.queue.length <= REFILL_THRESHOLD && isConfigValid && config) {
          fillQueue(
            cacheKey,
            stylePreset,
            customStyle,
            config,
            currentGeneration,
            cached.used,
            cached.queue,
            false
          )
        }
      } else {
        const initialUsed = cached?.used || []
        dispatch({ type: 'SET_INITIAL', payload: { queue: [], used: initialUsed } })

        if (isConfigValid && config) {
          fillQueue(
            cacheKey,
            stylePreset,
            customStyle,
            config,
            currentGeneration,
            initialUsed,
            [],
            true
          )
        }
      }
    }

    init()

    return () => {
      abortControllerRef.current?.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, isConfigValid])

  const getNextIdea = useCallback((): string | null => {
    if (!isInitialized || queue.length === 0) return null

    const next = queue[0]
    dispatch({ type: 'SHIFT', payload: next })

    const newQueue = queue.slice(1)
    const newUsed = [...used, next].slice(-100)

    persistToDB(cacheKey, newQueue, newUsed)

    if (newQueue.length <= REFILL_THRESHOLD && !internalRefillingRef.current && isConfigValid && config) {
      fillQueue(cacheKey, stylePreset, customStyle, config, generationRef.current, newUsed, newQueue, false)
    }

    return next
  }, [isInitialized, queue, used, cacheKey, persistToDB, isConfigValid, config, fillQueue, stylePreset, customStyle])

  return {
    getNextIdea,
    isHydrating,
    isFetchingInitial,
    isRefilling,
    isInitialized,
    isQueueEmpty: queue.length === 0,
  }
}
