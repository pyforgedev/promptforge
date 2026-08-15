import { render } from '@/test/utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import Aurora from './Aurora'

interface MockRendererInstance {
  gl: {
    clearColor: ReturnType<typeof vi.fn>
    enable: ReturnType<typeof vi.fn>
    blendFunc: ReturnType<typeof vi.fn>
    canvas: HTMLCanvasElement
    getExtension: ReturnType<typeof vi.fn>
  }
  setSize: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
}

interface MockProgramInstance {
  uniforms: {
    uTime: { value: number }
    uAmplitude: { value: number }
    uColorStops: { value: number[][] }
    uResolution: { value: number[] }
    uBlend: { value: number }
  }
}

const mockRendererInstances: MockRendererInstance[] = []
const mockProgramInstances: MockProgramInstance[] = []
const mockLoseContext = vi.fn()

vi.mock('ogl', () => {
  function MockRenderer() {
    const instance = {
      gl: {
        clearColor: vi.fn(),
        enable: vi.fn(),
        blendFunc: vi.fn(),
        canvas: document.createElement('canvas'),
        getExtension: vi.fn().mockReturnValue({ loseContext: mockLoseContext }),
      },
      setSize: vi.fn(),
      render: vi.fn(),
    }
    mockRendererInstances.push(instance)
    return instance
  }

  function MockProgram(_gl: MockRendererInstance['gl'], options: MockProgramInstance) {
    const instance = {
      uniforms: options.uniforms,
    }
    mockProgramInstances.push(instance)
    return instance
  }

  function MockMesh() {
    return {}
  }

  function MockTriangle() {
    return { attributes: {} }
  }

  function MockColor(hex: string) {
    if (hex === '#ff0000') return { r: 1, g: 0, b: 0 }
    return { r: 0.5, g: 0.5, b: 0.5 }
  }

  return {
    Renderer: vi.fn().mockImplementation(MockRenderer),
    Program: vi.fn().mockImplementation(MockProgram),
    Mesh: vi.fn().mockImplementation(MockMesh),
    Triangle: vi.fn().mockImplementation(MockTriangle),
    Color: vi.fn().mockImplementation(MockColor),
  }
})

describe('Aurora', () => {
  let rafCallback: FrameRequestCallback | null = null
  let rafId = 1
  const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame')

  beforeEach(() => {
    mockRendererInstances.length = 0
    mockProgramInstances.length = 0
    mockLoseContext.mockClear()
    cancelAnimationFrameSpy.mockClear()

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb
      return rafId++
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders container element', () => {
    const { container } = render(<Aurora />)
    expect(container.firstChild).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('w-full', 'h-full')
  })

  it('initializes Renderer and Program once on mount', () => {
    render(<Aurora amplitude={1.2} blend={0.6} />)
    expect(mockRendererInstances).toHaveLength(1)
    expect(mockProgramInstances).toHaveLength(1)
    expect(mockProgramInstances[0].uniforms.uAmplitude.value).toBe(1.2)
    expect(mockProgramInstances[0].uniforms.uBlend.value).toBe(0.6)
  })

  it('does not recreate Renderer on prop updates', () => {
    const { rerender } = render(<Aurora amplitude={1.0} blend={0.5} />)
    expect(mockRendererInstances).toHaveLength(1)

    rerender(<Aurora amplitude={2.5} blend={0.9} colorStops={['#ff0000', '#00ff00', '#0000ff']} />)
    expect(mockRendererInstances).toHaveLength(1)
  })

  it('updates live uniform values on animation frame when props change', () => {
    const { rerender } = render(<Aurora amplitude={1.0} blend={0.5} />)

    if (rafCallback) rafCallback(100)

    expect(mockProgramInstances[0].uniforms.uAmplitude.value).toBe(1.0)
    expect(mockProgramInstances[0].uniforms.uBlend.value).toBe(0.5)

    rerender(<Aurora amplitude={3.0} blend={0.8} colorStops={['#ff0000', '#00ff00', '#0000ff']} />)

    if (rafCallback) rafCallback(200)

    expect(mockProgramInstances[0].uniforms.uAmplitude.value).toBe(3.0)
    expect(mockProgramInstances[0].uniforms.uBlend.value).toBe(0.8)
    expect(mockProgramInstances[0].uniforms.uColorStops.value[0]).toEqual([1, 0, 0])
  })

  it('cleans up animation frame and loses WebGL context on unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const { unmount } = render(<Aurora />)
    expect(mockRendererInstances).toHaveLength(1)

    unmount()

    expect(cancelSpy).toHaveBeenCalled()
    expect(mockLoseContext).toHaveBeenCalled()
  })
})
