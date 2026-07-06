import { useEffect, useRef } from 'react'

export function useSpotlightBorder() {
  const cardRectsRef = useRef<Map<HTMLElement, DOMRect>>(new Map())

  useEffect(() => {
    let rafId: number | null = null
    const cards = document.querySelectorAll<HTMLElement>('.card-spotlight')

    const updateRects = () => {
      cardRectsRef.current.clear()
      cards.forEach((card) => {
        cardRectsRef.current.set(card, card.getBoundingClientRect())
      })
    }
    updateRects()

    const ro = new ResizeObserver(updateRects)
    cards.forEach((card) => ro.observe(card))
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
      ro.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])
}
