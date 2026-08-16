import { describe, it, expect, vi, afterEach } from 'vitest'
import { downloadFile } from './download'

describe('downloadFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('builds a blob with content and mime type and triggers the anchor click', () => {
    const createSpy = vi.fn<(blob: Blob) => string>(() => 'blob:mock-url')
    const revokeSpy = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: createSpy, revokeObjectURL: revokeSpy })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadFile('hello', 'file.txt', 'text/plain')

    const blob = createSpy.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(blob.size).toBe(5)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('sets the download attribute and href on the created anchor', () => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:mock-url', revokeObjectURL: () => {} })
    const createdAnchors: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') createdAnchors.push(el as HTMLAnchorElement)
      return el
    })

    downloadFile('content', 'prompts-abc123.csv', 'text/csv')

    expect(createdAnchors).toHaveLength(1)
    expect(createdAnchors[0]?.download).toBe('prompts-abc123.csv')
    expect(createdAnchors[0]?.href).toBe('blob:mock-url')
  })
})