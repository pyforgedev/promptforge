import { render } from '@/test/utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import FadeContent from './FadeContent'

const mockTl = {
  to: vi.fn().mockReturnThis(),
  play: vi.fn(),
  kill: vi.fn(),
}

const mockSt = {
  kill: vi.fn(),
}

vi.mock('gsap', () => {
  return {
    gsap: {
      registerPlugin: vi.fn(),
      set: vi.fn(),
      timeline: vi.fn(() => mockTl),
      to: vi.fn(),
      killTweensOf: vi.fn(),
    },
  }
})

vi.mock('gsap/ScrollTrigger', () => {
  return {
    ScrollTrigger: {
      create: vi.fn(() => mockSt),
    },
  }
})

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

describe('FadeContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children', () => {
    const { getByText } = render(
      <FadeContent>
        <span>Test Content</span>
      </FadeContent>
    )
    expect(getByText('Test Content')).toBeInTheDocument()
  })

  it('initializes gsap timeline and scrolltrigger on mount', () => {
    render(
      <FadeContent duration={500} ease="power1.out">
        <div>Content</div>
      </FadeContent>
    )

    expect(gsap.set).toHaveBeenCalled()
    expect(gsap.timeline).toHaveBeenCalled()
    expect(ScrollTrigger.create).toHaveBeenCalled()
    expect(mockTl.to).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        duration: 0.5,
        ease: 'power1.out',
      })
    )
  })

  it('cleans up timeline, scrolltrigger, and tweens on unmount', () => {
    const { unmount, container } = render(
      <FadeContent>
        <div>Content</div>
      </FadeContent>
    )

    const el = container.firstChild

    unmount()

    expect(mockSt.kill).toHaveBeenCalled()
    expect(mockTl.kill).toHaveBeenCalled()
    expect(gsap.killTweensOf).toHaveBeenCalledWith(el)
  })

  it('reinitializes GSAP animation when relevant props change', () => {
    const { rerender, container } = render(
      <FadeContent duration={500}>
        <div>Content</div>
      </FadeContent>
    )

    expect(gsap.timeline).toHaveBeenCalledTimes(1)
    const el = container.firstChild

    rerender(
      <FadeContent duration={1200}>
        <div>Content</div>
      </FadeContent>
    )

    expect(mockSt.kill).toHaveBeenCalledTimes(1)
    expect(mockTl.kill).toHaveBeenCalledTimes(1)
    expect(gsap.killTweensOf).toHaveBeenCalledWith(el)
    expect(gsap.timeline).toHaveBeenCalledTimes(2)
  })
})
