import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireUserMock = vi.fn()
const requireRoleMock = vi.fn()
const createAgentFromTemplateMock = vi.fn()
const answerQuestionMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireUser: (...args: unknown[]) => requireUserMock(...args),
    requireRole: (...args: unknown[]) => requireRoleMock(...args),
  }
})
vi.mock('@/lib/agent/create', () => ({
  createAgentFromTemplate: (...args: unknown[]) => createAgentFromTemplateMock(...args),
}))
vi.mock('@/lib/agent/rag-answer-agent', () => ({
  answerQuestion: (...args: unknown[]) => answerQuestionMock(...args),
}))

const { activateAgentVersionAction, createAgentFromTemplateAction, askRagAnswerAgentAction } = await import('./agents')

beforeEach(() => {
  requireUserMock.mockReset()
  requireRoleMock.mockReset()
  createAgentFromTemplateMock.mockReset()
  answerQuestionMock.mockReset()
})

describe('activateAgentVersionAction', () => {
  it('rejects an anonymous session', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(activateAgentVersionAction('agent-1', 'version-2')).rejects.toThrow('Create an account')
  })

  it('updates active_version_id through the RLS-scoped client -- RLS is the real gate', async () => {
    const supabase = createFakeSupabase({ agents: [{ data: [{ id: 'agent-1' }], error: null }] })
    requireUserMock.mockResolvedValue({ profile: { role: 'curator' }, supabase })

    await activateAgentVersionAction('agent-1', 'version-2')

    const update = supabase._calls.find((c) => c.table === 'agents' && c.method === 'update')
    expect(update?.args).toEqual({ active_version_id: 'version-2' })
  })

  it('throws a clear error when RLS silently rejects the update (zero rows matched)', async () => {
    const supabase = createFakeSupabase({ agents: [{ data: [], error: null }] })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant' }, supabase })

    await expect(activateAgentVersionAction('agent-1', 'version-2')).rejects.toThrow('permission')
  })
})

describe('createAgentFromTemplateAction', () => {
  it('rejects an anonymous session', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(
      createAgentFromTemplateAction({ templateId: 't-1', name: 'X', slug: 'x' })
    ).rejects.toThrow('Create an account')
  })

  it('delegates to createAgentFromTemplate with the caller as createdBy', async () => {
    const supabase = {}
    requireUserMock.mockResolvedValue({ user: { id: 'user-1' }, profile: { role: 'curator' }, supabase })
    createAgentFromTemplateMock.mockResolvedValue({ agentId: 'agent-1', versionId: 'version-1' })

    const result = await createAgentFromTemplateAction({ templateId: 't-1', name: 'X', slug: 'x' })

    expect(createAgentFromTemplateMock).toHaveBeenCalledWith(supabase, { templateId: 't-1', name: 'X', slug: 'x', createdBy: 'user-1' })
    expect(result).toEqual({ agentId: 'agent-1', versionId: 'version-1' })
  })
})

describe('askRagAnswerAgentAction', () => {
  it('requires at least consultant role (excludes anonymous)', async () => {
    requireRoleMock.mockRejectedValue(new Error('Requires consultant role'))
    await expect(askRagAnswerAgentAction({ question: 'What is RAG?' })).rejects.toThrow('Requires consultant role')
    expect(requireRoleMock).toHaveBeenCalledWith('consultant')
  })

  it('delegates to answerQuestion with the caller as requestedBy and attaches the trace', async () => {
    const supabase = createFakeSupabase({ graph_steps: [{ data: [{ id: 'step-1' }], error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'user-1' }, supabase })
    answerQuestionMock.mockResolvedValue({ answer: 'The answer.', evidence: [], evaluation: null, graphRunId: 'run-1', terminationReason: 'success' })

    const result = await askRagAnswerAgentAction({ question: 'What is RAG?' })

    expect(answerQuestionMock).toHaveBeenCalledWith(supabase, { question: 'What is RAG?', requestedBy: 'user-1' })
    expect(result.steps).toEqual([{ id: 'step-1' }])
  })
})
