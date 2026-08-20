import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireUserMock = vi.fn()
const runAssistantTurnMock = vi.fn()
const listChatCapableModelsMock = vi.fn()
const getLatestActivityLabelMock = vi.fn()

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return { ...actual, requireUser: (...args: unknown[]) => requireUserMock(...args) }
})
vi.mock('@/lib/chat/loop', () => ({ runAssistantTurn: (...args: unknown[]) => runAssistantTurnMock(...args) }))
vi.mock('@/lib/chat/conversations', () => ({ getLatestActivityLabel: (...args: unknown[]) => getLatestActivityLabelMock(...args) }))
vi.mock('@/lib/ai', () => ({ listChatCapableModels: (...args: unknown[]) => listChatCapableModelsMock(...args) }))

const { sendChatMessageAction, listChatModelsAction, getChatActivityAction } = await import('./chat')

const ctx = { user: { id: 'user-1' }, profile: { role: 'curator' }, supabase: {} }

beforeEach(() => {
  requireUserMock.mockReset()
  runAssistantTurnMock.mockReset()
  listChatCapableModelsMock.mockReset()
  getLatestActivityLabelMock.mockReset()
  requireUserMock.mockResolvedValue(ctx)
})

describe('sendChatMessageAction', () => {
  it('resolves the caller via requireUser and delegates straight to runAssistantTurn, including an optional model selection', async () => {
    runAssistantTurnMock.mockResolvedValue({ conversationId: 'conv-1', reply: 'Hi there.' })

    const result = await sendChatMessageAction(null, 'Hello', { providerName: 'groq', modelId: 'openai/gpt-oss-20b' })

    expect(requireUserMock).toHaveBeenCalled()
    expect(runAssistantTurnMock).toHaveBeenCalledWith(ctx, null, 'Hello', { providerName: 'groq', modelId: 'openai/gpt-oss-20b' })
    expect(result).toEqual({ conversationId: 'conv-1', reply: 'Hi there.' })
  })
})

describe('listChatModelsAction', () => {
  it('resolves the caller then delegates to listChatCapableModels', async () => {
    listChatCapableModelsMock.mockResolvedValue([{ providerName: 'groq', providerDisplayName: 'Groq', modelId: 'm1', modelDisplayName: 'M1', isDefault: true }])

    const result = await listChatModelsAction()

    expect(listChatCapableModelsMock).toHaveBeenCalledWith(ctx.supabase)
    expect(result).toHaveLength(1)
  })
})

describe('getChatActivityAction', () => {
  it('resolves the caller then delegates to getLatestActivityLabel', async () => {
    getLatestActivityLabelMock.mockResolvedValue('Searching the Workbench Handbook & Wiki…')

    const result = await getChatActivityAction('conv-1')

    expect(getLatestActivityLabelMock).toHaveBeenCalledWith(ctx.supabase, 'conv-1')
    expect(result).toBe('Searching the Workbench Handbook & Wiki…')
  })
})
