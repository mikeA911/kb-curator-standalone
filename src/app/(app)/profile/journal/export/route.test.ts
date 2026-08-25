import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireUserMock = vi.fn()
const renderJournalDocxMock = vi.fn()

vi.mock('next/navigation', () => ({ redirect: vi.fn((path: string) => { throw new Error(`redirect:${path}`) }) }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return { ...actual, requireUser: (...args: unknown[]) => requireUserMock(...args) }
})
vi.mock('@/lib/journal/docx', () => ({ renderJournalDocx: (...args: unknown[]) => renderJournalDocxMock(...args) }))

const { POST } = await import('./route')

const VALID_BODY = {
  content: { narrative: 'x', projectsAndThemes: [], decisionsAndMilestones: [], lessonsAndChangedAssumptions: [], openQuestions: [], itemsToRevisit: [] },
  conversations: [],
  relatedActivity: [],
  truncated: false,
  rangeLabel: 'last 30 days',
  providerDisplayName: 'Groq',
  modelDisplayName: 'GPT-OSS 120B',
}

beforeEach(() => {
  requireUserMock.mockReset()
  renderJournalDocxMock.mockReset()
  renderJournalDocxMock.mockResolvedValue(Buffer.from('PK-fake-docx'))
})

describe('POST /profile/journal/export', () => {
  it('rejects a malformed body with 400 without rendering anything', async () => {
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase: {} })

    const res = await POST(new Request('http://localhost/profile/journal/export', { method: 'POST', body: JSON.stringify({ not: 'valid' }) }))

    expect(res.status).toBe(400)
    expect(renderJournalDocxMock).not.toHaveBeenCalled()
  })

  it('renders and streams a valid, already-generated payload back with attachment headers', async () => {
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'consultant' }, supabase: {} })

    const res = await POST(new Request('http://localhost/profile/journal/export', { method: 'POST', body: JSON.stringify(VALID_BODY) }))

    expect(renderJournalDocxMock).toHaveBeenCalled()
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Type')).toContain('wordprocessingml')
  })

  it('redirects anonymous profiles instead of rendering', async () => {
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'anonymous' }, supabase: {} })

    await expect(POST(new Request('http://localhost/profile/journal/export', { method: 'POST', body: JSON.stringify(VALID_BODY) }))).rejects.toThrow(
      'redirect:/profile'
    )
    expect(renderJournalDocxMock).not.toHaveBeenCalled()
  })
})
