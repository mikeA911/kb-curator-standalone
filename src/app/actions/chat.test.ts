import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireUserMock = vi.fn()
const runAssistantTurnMock = vi.fn()
const listChatCapableModelsMock = vi.fn()
const getLatestActivityLabelMock = vi.fn()
const listRecentConversationsMock = vi.fn()
const listMessagesMock = vi.fn()
const toDisplayMessagesMock = vi.fn()
const listProvidersMock = vi.fn()
const listModelsMock = vi.fn()

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return { ...actual, requireUser: (...args: unknown[]) => requireUserMock(...args) }
})
vi.mock('@/lib/chat/loop', () => ({ runAssistantTurn: (...args: unknown[]) => runAssistantTurnMock(...args) }))
vi.mock('@/lib/chat/conversations', () => ({
  getLatestActivityLabel: (...args: unknown[]) => getLatestActivityLabelMock(...args),
  listRecentConversations: (...args: unknown[]) => listRecentConversationsMock(...args),
  listMessages: (...args: unknown[]) => listMessagesMock(...args),
  toDisplayMessages: (...args: unknown[]) => toDisplayMessagesMock(...args),
}))
vi.mock('@/lib/ai', () => ({
  listChatCapableModels: (...args: unknown[]) => listChatCapableModelsMock(...args),
  listProviders: (...args: unknown[]) => listProvidersMock(...args),
  listModels: (...args: unknown[]) => listModelsMock(...args),
}))

const { sendChatMessageAction, listChatModelsAction, getChatActivityAction, listRecentConversationsAction, getConversationMessagesAction } =
  await import('./chat')

const ctx = { user: { id: 'user-1' }, profile: { role: 'curator' }, supabase: {} }

beforeEach(() => {
  requireUserMock.mockReset()
  runAssistantTurnMock.mockReset()
  listChatCapableModelsMock.mockReset()
  getLatestActivityLabelMock.mockReset()
  listRecentConversationsMock.mockReset()
  listMessagesMock.mockReset()
  toDisplayMessagesMock.mockReset()
  listProvidersMock.mockReset()
  listModelsMock.mockReset()
  requireUserMock.mockResolvedValue(ctx)
  listProvidersMock.mockResolvedValue([])
  listModelsMock.mockResolvedValue([])
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

describe('listRecentConversationsAction', () => {
  it('resolves the caller then delegates to listRecentConversations, scoped to that user', async () => {
    listRecentConversationsMock.mockResolvedValue([{ id: 'conv-1' }])

    const result = await listRecentConversationsAction()

    expect(listRecentConversationsMock).toHaveBeenCalledWith(ctx.supabase, 'user-1')
    expect(result).toEqual([{ id: 'conv-1' }])
  })
})

describe('getConversationMessagesAction', () => {
  it('builds a display-name lookup from providers/models and delegates to toDisplayMessages', async () => {
    listMessagesMock.mockResolvedValue([{ id: 'm1', role: 'user', content: 'hi' }])
    listProvidersMock.mockResolvedValue([{ id: 'p1', name: 'groq', display_name: 'Groq' }])
    listModelsMock.mockResolvedValue([{ id: 'md1', provider_id: 'p1', model_id: 'openai/gpt-oss-20b', display_name: 'GPT-OSS 20B' }])
    toDisplayMessagesMock.mockReturnValue([{ role: 'user', content: 'hi' }])

    const result = await getConversationMessagesAction('conv-1')

    expect(listMessagesMock).toHaveBeenCalledWith(ctx.supabase, 'conv-1')
    const [, lookup] = toDisplayMessagesMock.mock.calls[0]
    expect(lookup.get('groq::openai/gpt-oss-20b')).toEqual({ providerDisplayName: 'Groq', modelDisplayName: 'GPT-OSS 20B' })
    expect(result).toEqual([{ role: 'user', content: 'hi' }])
  })
})
