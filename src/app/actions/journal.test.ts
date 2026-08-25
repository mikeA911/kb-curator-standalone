import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireUserMock = vi.fn()
const generateJournalMock = vi.fn()
const getDefaultStructuredOutputModelMock = vi.fn()
const getActiveStructuredOutputProviderMock = vi.fn()

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return { ...actual, requireUser: (...args: unknown[]) => requireUserMock(...args) }
})
vi.mock('@/lib/ai', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai')>('@/lib/ai')
  return {
    ...actual,
    getDefaultStructuredOutputModel: (...args: unknown[]) => getDefaultStructuredOutputModelMock(...args),
    getActiveStructuredOutputProvider: (...args: unknown[]) => getActiveStructuredOutputProviderMock(...args),
  }
})
vi.mock('@/lib/journal/generate', async () => {
  const actual = await vi.importActual<typeof import('@/lib/journal/generate')>('@/lib/journal/generate')
  return { ...actual, generateJournal: (...args: unknown[]) => generateJournalMock(...args) }
})

const { previewJournalAction } = await import('./journal')

beforeEach(() => {
  requireUserMock.mockReset()
  generateJournalMock.mockReset()
  getDefaultStructuredOutputModelMock.mockReset()
  getActiveStructuredOutputProviderMock.mockReset()
  getDefaultStructuredOutputModelMock.mockResolvedValue({ provider: { display_name: 'Groq' }, model: { display_name: 'GPT-OSS 120B' } })
  getActiveStructuredOutputProviderMock.mockResolvedValue({ name: 'groq' })
  generateJournalMock.mockResolvedValue({
    content: { narrative: 'x', projectsAndThemes: [], decisionsAndMilestones: [], lessonsAndChangedAssumptions: [], openQuestions: [], itemsToRevisit: [] },
    conversations: [],
    relatedActivity: [],
    projects: [],
    truncated: false,
    rangeLabel: 'last 30 days',
  })
})

describe('previewJournalAction', () => {
  it('rejects an anonymous profile before generating anything', async () => {
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'anonymous' }, supabase: {} })

    await expect(
      previewJournalAction({ range: 'last_30_days', includeRelatedActivity: true, detail: 'standard', style: 'reflective' })
    ).rejects.toThrow()
    expect(generateJournalMock).not.toHaveBeenCalled()
  })

  it('validates and normalizes options before calling generateJournal, defaulting exclusion lists to empty', async () => {
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase: {} })

    const result = await previewJournalAction({ range: 'last_6_months', includeRelatedActivity: false, detail: 'brief', style: 'factual' })

    expect(generateJournalMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ range: 'last_6_months', excludedConversationIds: [], excludedProjectIds: [] })
    )
    expect(result.providerDisplayName).toBe('Groq')
    expect(result.modelDisplayName).toBe('GPT-OSS 120B')
  })

  it('rejects an invalid range value', async () => {
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase: {} })

    await expect(
      previewJournalAction({ range: 'last_5_years', includeRelatedActivity: true, detail: 'standard', style: 'reflective' })
    ).rejects.toThrow()
    expect(generateJournalMock).not.toHaveBeenCalled()
  })
})
