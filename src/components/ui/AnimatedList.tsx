import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { MouseEventHandler, ReactNode, UIEvent } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

const DEFAULT_ITEMS = [
  'Item 1',
  'Item 2',
  'Item 3',
  'Item 4',
  'Item 5',
  'Item 6',
  'Item 7',
  'Item 8',
  'Item 9',
  'Item 10',
  'Item 11',
  'Item 12',
  'Item 13',
  'Item 14',
  'Item 15',
]

interface AnimatedItemProps {
  children: ReactNode
  delay?: number
  index: number
  itemId: string
  selected: boolean
  onMouseEnter?: MouseEventHandler<HTMLDivElement>
  onClick?: MouseEventHandler<HTMLDivElement>
}

function AnimatedItem({
  children,
  delay = 0,
  index,
  itemId,
  selected,
  onMouseEnter,
  onClick,
}: AnimatedItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5, once: false })

  return (
    <motion.div
      ref={ref}
      id={itemId}
      data-index={index}
      role="option"
      aria-selected={selected}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay }}
      className="mb-4 cursor-pointer"
    >
      {children}
    </motion.div>
  )
}

export interface AnimatedListRenderState {
  index: number
  selected: boolean
}

export interface AnimatedListProps {
  items?: string[]
  onItemSelect?: (item: string, index: number) => void
  showGradients?: boolean
  enableArrowNavigation?: boolean
  className?: string
  itemClassName?: string
  displayScrollbar?: boolean
  initialSelectedIndex?: number
  /** Controlled selected index — highlight follows external state (e.g. the queue's active item). */
  selectedIndex?: number
  /** Fired when arrow keys move the selection (highlight-only, no confirm). */
  onNavigate?: (index: number) => void
  /** Custom item content (e.g. status badges); overrides the built-in card. */
  renderItem?: (item: string, state: AnimatedListRenderState) => ReactNode
  /** Accessible name for the listbox. */
  ariaLabel?: string
  /** Additional classes for the inner scroll container. */
  scrollClassName?: string
}

const SCROLLBAR_CLASSES =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-strong [&::-webkit-scrollbar-thumb:hover]:bg-secondary'
const NO_SCROLLBAR_CLASSES = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export function AnimatedList({
  items = DEFAULT_ITEMS,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  itemClassName = '',
  displayScrollbar = true,
  initialSelectedIndex = -1,
  selectedIndex: controlledSelectedIndex,
  onNavigate,
  renderItem,
  ariaLabel,
  scrollClassName = '',
}: AnimatedListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const scrollOnIndexChangeRef = useRef(false)
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(initialSelectedIndex)
  const [topGradientOpacity, setTopGradientOpacity] = useState(0)
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(0)

  const isControlled = controlledSelectedIndex !== undefined
  const selectedIndex = isControlled ? controlledSelectedIndex : internalSelectedIndex

  // Latest-value refs keep the scroll/keyboard effects stable — QueueView
  // passes inline callbacks, so rebinding on every parent render would
  // otherwise churn the keydown listener and re-run scroll logic.
  const latestRef = useRef({ items, isControlled, onItemSelect, onNavigate })
  useEffect(() => {
    latestRef.current = { items, isControlled, onItemSelect, onNavigate }
  })

  const updateGradients = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setTopGradientOpacity(Math.min(scrollTop / 50, 1))
    const bottomDistance = scrollHeight - (scrollTop + clientHeight)
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1),
    )
  }, [])

  useEffect(() => {
    updateGradients()
  }, [updateGradients, items])

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target as HTMLDivElement
    setTopGradientOpacity(Math.min(scrollTop / 50, 1))
    const bottomDistance = scrollHeight - (scrollTop + clientHeight)
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1),
    )
  }

  // Scroll the active item into view. Policy:
  // - Controlled mode: whenever the active index changes (queue prev/next/copy
  //   buttons, arrow navigation, item click).
  // - Uncontrolled mode: only after arrow navigation (flag set in the keydown
  //   handler) — mouse hovering moves the highlight but never jumps the viewport.
  useEffect(() => {
    if (selectedIndex < 0) return
    if (!isControlled && !scrollOnIndexChangeRef.current) return
    // Consume the keyboard-nav flag up front so it can never leak into a
    // later hover-triggered index change (hover must not jump the viewport).
    scrollOnIndexChangeRef.current = false

    const container = listRef.current
    if (!container) return
    const selectedItem = container.querySelector(
      `[data-index="${selectedIndex}"]`,
    ) as HTMLElement | null
    if (!selectedItem) return
    const extraMargin = 50
    const containerScrollTop = container.scrollTop
    const containerHeight = container.clientHeight
    const itemTop = selectedItem.offsetTop
    const itemBottom = itemTop + selectedItem.offsetHeight
    let top: number | null = null
    if (itemTop < containerScrollTop + extraMargin) {
      top = itemTop - extraMargin
    } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
      top = itemBottom - containerHeight + extraMargin
    }
    if (top === null) return
    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top, behavior: 'smooth' })
    } else {
      container.scrollTop = top
    }
  }, [isControlled, selectedIndex])

  useEffect(() => {
    if (!enableArrowNavigation) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target?.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
        )
      ) {
        return
      }

      // Scope keyboard navigation to the listbox itself so it never hijacks
      // page-wide arrow keys while unfocused. Deliberately no Tab handling:
      // Tab must exit the list like a regular listbox, not trap the focus.
      const container = listRef.current
      const activeEl = document.activeElement
      if (!container || !container.contains(activeEl)) return

      const { items: latestItems, isControlled: latestControlled } = latestRef.current
      const itemsLength = latestItems.length
      if (itemsLength === 0) return

      const move = (delta: number) => {
        const next = Math.min(Math.max(selectedIndex + delta, 0), itemsLength - 1)
        if (next === selectedIndex) return
        if (latestControlled) {
          latestRef.current.onNavigate?.(next)
        } else {
          scrollOnIndexChangeRef.current = true
          setInternalSelectedIndex(next)
        }
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        move(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        move(-1)
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < itemsLength) {
          e.preventDefault()
          latestRef.current.onItemSelect?.(latestItems[selectedIndex], selectedIndex)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableArrowNavigation, selectedIndex])

  const handleItemMouseEnter = useCallback((index: number) => {
    if (!isControlled) {
      setInternalSelectedIndex(index)
    }
  }, [isControlled])

  const handleItemClick = useCallback(
    (item: string, index: number) => {
      if (!isControlled) {
        setInternalSelectedIndex(index)
      }
      onItemSelect?.(item, index)
    },
    [isControlled, onItemSelect],
  )

  return (
    <div className={cn('relative w-full', className)}>
      <div
        ref={listRef}
        id={`${listId}-listbox`}
        role="listbox"
        aria-orientation="vertical"
        aria-label={ariaLabel}
        aria-activedescendant={
          selectedIndex >= 0 && selectedIndex < items.length
            ? `${listId}-option-${selectedIndex}`
            : undefined
        }
        tabIndex={0}
        onScroll={handleScroll}
        className={cn(
          'max-h-[400px] overflow-y-auto p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app',
          displayScrollbar ? SCROLLBAR_CLASSES : NO_SCROLLBAR_CLASSES,
          scrollClassName,
        )}
        style={{
          scrollbarWidth: displayScrollbar ? 'thin' : 'none',
          scrollbarColor: 'var(--color-border-strong) transparent',
        }}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={`${item}-${index}`}
            delay={0.1}
            index={index}
            itemId={`${listId}-option-${index}`}
            selected={index === selectedIndex}
            onMouseEnter={() => handleItemMouseEnter(index)}
            onClick={() => handleItemClick(item, index)}
          >
            {renderItem ? (
              renderItem(item, { index, selected: index === selectedIndex })
            ) : (
              <div
                className={cn(
                  'rounded-lg bg-surface-hover p-4 transition-colors duration-150',
                  index === selectedIndex && 'bg-brand-primary/10 ring-1 ring-brand-primary/30',
                  itemClassName,
                )}
              >
                <p className="m-0 text-primary">{item}</p>
              </div>
            )}
          </AnimatedItem>
        ))}
      </div>

      {showGradients && (
        <>
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 h-[50px] bg-gradient-to-b from-surface to-transparent transition-opacity duration-300 ease-out"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-surface to-transparent transition-opacity duration-300 ease-out"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      )}
    </div>
  )
}