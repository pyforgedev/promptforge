import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SegmentsPanel } from './SegmentsPanel'
import { deriveSegmentSources, type SegmentSources } from '../utils/segmentSources'
import { generatorInputDefaults } from '../schemas/generatorInputSchema'
import type { PromptSegments } from '../types'

const segments: PromptSegments = {
  subject: 'a person at a desk',
  composition: 'rule of thirds',
  lighting: 'softbox studio lighting',
  mood: 'focused and productive',
  style: 'commercial photography',
  technical: '85mm lens',
  colorPalette: 'warm tones',
  environment: 'office interior',
}

const mixedSources: SegmentSources = {
  subject: 'user',
  composition: 'ai',
  lighting: 'ai',
  mood: 'user',
  style: 'ai',
  technical: 'ai',
  colorPalette: 'user',
  environment: 'ai',
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: 'Prompt Breakdown' }))
}

describe('SegmentsPanel — USER / AI source badges', () => {
  it('treats legacy user + none fallbacks as AI-generated sources', () => {
    const sources = deriveSegmentSources({
      ...generatorInputDefaults,
      mood: { mode: 'user', value: 'none' },
      colorPalette: { mode: 'user', value: 'warm_tones' },
    })
    expect(sources.mood).toBe('ai')
    expect(sources.colorPalette).toBe('user')
  })

  it('renders USER and AI badges that match the provided sources', () => {
    render(<SegmentsPanel segments={segments} sources={mixedSources} />)
    openPanel()
    // subject, mood, colorPalette are user-sourced
    expect(screen.getAllByText('USER')).toHaveLength(3)
    // composition, lighting, style, technical, environment are ai-sourced
    expect(screen.getAllByText('AI')).toHaveLength(5)
  })

  it('shows only USER badges when every source is user', () => {
    const allUser: SegmentSources = {
      subject: 'user', composition: 'user', lighting: 'user', mood: 'user',
      style: 'user', technical: 'user', colorPalette: 'user', environment: 'user',
    }
    render(<SegmentsPanel segments={segments} sources={allUser} />)
    openPanel()
    expect(screen.getAllByText('USER')).toHaveLength(8)
    expect(screen.queryByText('AI')).toBeNull()
  })

  it('shows only AI badges when every source is ai', () => {
    const allAi: SegmentSources = {
      subject: 'ai', composition: 'ai', lighting: 'ai', mood: 'ai',
      style: 'ai', technical: 'ai', colorPalette: 'ai', environment: 'ai',
    }
    render(<SegmentsPanel segments={segments} sources={allAi} />)
    openPanel()
    expect(screen.getAllByText('AI')).toHaveLength(8)
    expect(screen.queryByText('USER')).toBeNull()
  })

  it('renders each segment value once the panel is expanded', () => {
    render(<SegmentsPanel segments={segments} sources={mixedSources} />)
    openPanel()
    expect(screen.getByText('a person at a desk')).toBeInTheDocument()
    expect(screen.getByText('rule of thirds')).toBeInTheDocument()
    expect(screen.getByText('office interior')).toBeInTheDocument()
  })

  it('does not render segment rows or badges while collapsed', () => {
    render(<SegmentsPanel segments={segments} sources={mixedSources} />)
    expect(screen.queryByText('a person at a desk')).toBeNull()
    expect(screen.queryByText('USER')).toBeNull()
    expect(screen.queryByText('AI')).toBeNull()
  })

  it('shows the unavailable message and no badges when unavailable', () => {
    render(<SegmentsPanel segments={segments} sources={mixedSources} unavailable />)
    openPanel()
    expect(screen.getByText('Segments not available for legacy prompts.')).toBeInTheDocument()
    expect(screen.queryByText('USER')).toBeNull()
    expect(screen.queryByText('AI')).toBeNull()
  })
})
