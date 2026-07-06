import { useEffect, useRef } from 'react'

export function useSpotlightBorder() {
  const cardRectsRef = useRef<Map<HTMLElement, DOMRect>>(new Map())
  const roRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    let rafId: number | null = null

    const updateRects = () => {
      cardRectsRef.current.clear()
      const cards = document.querySelectorAll<HTMLElement>('.card-spotlight')
      cards.forEach((card) => {
        cardRectsRef.current.set(card, card.getBoundingClientRect())
      })
    }

    const observeCards = () => {
      if (roRef.current) {
        roRef.current.disconnect()
      }
      roRef.current = new ResizeObserver(updateRects)
      const cards = document.querySelectorAll<HTMLElement>('.card-spotlight')
      cards.forEach((card) => roRef.current!.observe(card))
      updateRects()
    }

    observeCards()

    const mutationObserver = new MutationObserver(() => {
      observeCards()
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    window.addEventListener('scroll', updateRects, { passive: true })

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        const rects = cardRectsRef.current
        rects.forEach((rect, card) => {
          card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
          card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
        })
        rafId = null
      })
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', updateRects)
      mutationObserver.disconnect()
      if (roRef.current) roRef.current.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])
}
