import { describe, it, expect } from 'vitest'
import { renderJournalDocx } from './docx'
import type { JournalContent } from './generate'

const EMPTY_CONTENT: JournalContent = {
  narrative: 'Nothing happened.',
  projectsAndThemes: [],
  decisionsAndMilestones: [],
  lessonsAndChangedAssumptions: [],
  openQuestions: [],
  itemsToRevisit: [],
}

describe('renderJournalDocx', () => {
  it('produces a non-empty DOCX buffer without throwing, for minimal empty-state content', async () => {
    const buffer = await renderJournalDocx({
      title: 'My Journal',
      rangeLabel: 'last 30 days',
      content: EMPTY_CONTENT,
      conversations: [],
      truncated: false,
      providerDisplayName: 'Groq',
      modelDisplayName: 'GPT-OSS 120B',
    })

    expect(buffer.length).toBeGreaterThan(0)
    // .docx files are zip archives -- the PK magic bytes confirm real packing happened, not just an empty buffer.
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
  })

  it('renders real content, a source appendix, and a truncation note without throwing', async () => {
    const buffer = await renderJournalDocx({
      title: 'My Journal',
      rangeLabel: 'last 30 days',
      content: {
        ...EMPTY_CONTENT,
        projectsAndThemes: ['CareCall API work'],
        decisionsAndMilestones: ['Chose Document-First Engineering'],
      },
      conversations: [{ id: 'conv-1', title: 'Refactoring plan', date: '2026-08-01T00:00:00Z' }],
      truncated: true,
      providerDisplayName: 'Groq',
      modelDisplayName: 'GPT-OSS 120B',
    })

    expect(buffer.length).toBeGreaterThan(0)
  })
})
