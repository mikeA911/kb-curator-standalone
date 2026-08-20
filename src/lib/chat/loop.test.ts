import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

const resolveChatProviderMock = vi.fn()
const getDefaultModelMock = vi.fn()
const generateChatMock = vi.fn()
const callToolMock = vi.fn()
const getToolSpecsMock = vi.fn()
const createConversationMock = vi.fn()
const listMessagesMock = vi.fn()
const appendMessageMock = vi.fn()
const updateMock = vi.fn()

vi.mock('@/lib/ai', () => ({
  resolveChatProvider: (...args: unknown[]) => resolveChatProviderMock(...args),
  getDefaultModel: (...args: unknown[]) => getDefaultModelMock(...args),
}))
vi.mock('@/lib/mcp/tools', () => ({
  callTool: (...args: unknown[]) => callToolMock(...args),
  getToolSpecs: (...args: unknown[]) => getToolSpecsMock(...args),
}))
vi.mock('./conversations', () => ({
  createConversation: (...args: unknown[]) => createConversationMock(...args),
  listMessages: (...args: unknown[]) => listMessagesMock(...args),
  appendMessage: (...args: unknown[]) => appendMessageMock(...args),
}))

const { runAssistantTurn } = await import('./loop')

function fakeCtx(): WorkbenchCallerContext {
  return {
    user: { id: 'user-1' },
    profile: { id: 'user-1', role: 'curator' },
    supabase: { from: () => ({ update: (...args: unknown[]) => updateMock(...args), eq: () => ({}) }) },
  } as unknown as WorkbenchCallerContext
}

const CHAT_PROVIDER_INFO = {
  providerName: 'groq',
  providerDisplayName: 'Groq',
  modelId: 'openai/gpt-oss-20b',
  modelDisplayName: 'GPT-OSS 20B',
}

beforeEach(() => {
  resolveChatProviderMock.mockReset()
  getDefaultModelMock.mockReset()
  generateChatMock.mockReset()
  callToolMock.mockReset()
  getToolSpecsMock.mockReset()
  createConversationMock.mockReset()
  listMessagesMock.mockReset()
  appendMessageMock.mockReset()
  updateMock.mockReset()

  resolveChatProviderMock.mockResolvedValue({ provider: { generateChat: generateChatMock }, ...CHAT_PROVIDER_INFO })
  getDefaultModelMock.mockResolvedValue({ provider: { name: 'gemini' }, model: { display_name: 'Gemini Embedding' } })
  getToolSpecsMock.mockReturnValue([])
  createConversationMock.mockResolvedValue({ id: 'conv-1' })
  listMessagesMock.mockResolvedValue([])
  appendMessageMock.mockResolvedValue(undefined)
  updateMock.mockReturnValue({ eq: () => Promise.resolve({ error: null }) })
})

describe('runAssistantTurn', () => {
  it('returns a plain text reply with no tool call, in a single provider round-trip, carrying the active model identity', async () => {
    generateChatMock.mockResolvedValue({
      message: { role: 'assistant', content: 'KB Sandbox is a knowledge platform.' },
      model: 'test-model',
      usage: { inputTokens: 10, outputTokens: 8 },
    })

    const result = await runAssistantTurn(fakeCtx(), null, 'What is KB Sandbox?')

    expect(result).toEqual({ conversationId: 'conv-1', reply: 'KB Sandbox is a knowledge platform.', toolsUsed: [], ...CHAT_PROVIDER_INFO })
    expect(generateChatMock).toHaveBeenCalledTimes(1)
    expect(callToolMock).not.toHaveBeenCalled()
    expect(getDefaultModelMock).not.toHaveBeenCalled()
  })

  it('passes an explicit model selection straight through to resolveChatProvider', async () => {
    generateChatMock.mockResolvedValue({ message: { role: 'assistant', content: 'ok' }, model: 'test-model', usage: { inputTokens: 1, outputTokens: 1 } })

    await runAssistantTurn(fakeCtx(), null, 'hi', { providerName: 'gemini', modelId: 'gemini-2.5-flash' })

    expect(resolveChatProviderMock).toHaveBeenCalledWith(
      expect.anything(),
      { providerName: 'gemini', modelId: 'gemini-2.5-flash' },
      expect.anything()
    )
  })

  it('executes one tool-call round trip, stamps provenance on the created project, and reports the tool as used', async () => {
    generateChatMock
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: '', toolCalls: [{ id: 'call-1', name: 'create_project', arguments: { name: 'Test' } }] },
        model: 'test-model',
        usage: { inputTokens: 5, outputTokens: 5 },
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Created the project.' },
        model: 'test-model',
        usage: { inputTokens: 5, outputTokens: 3 },
      })
    callToolMock.mockResolvedValue({ projectId: 'proj-1' })

    const result = await runAssistantTurn(fakeCtx(), null, 'Create a project called Test')

    expect(result.reply).toBe('Created the project.')
    expect(result.toolsUsed).toEqual(['create_project'])
    expect(result.embeddingModelDisplayName).toBeUndefined()
    expect(callToolMock).toHaveBeenCalledWith(expect.anything(), 'create_project', { name: 'Test' })
    expect(generateChatMock).toHaveBeenCalledTimes(2)
    // Provenance stamp: a follow-up update on the projects table for the new row.
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ created_via: 'assistant', assistant_conversation_id: 'conv-1' })
    )
    // Each persisted assistant message is stamped with the model that produced it.
    expect(appendMessageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role: 'assistant', provider: 'groq', model: 'openai/gpt-oss-20b' })
    )
  })

  it('includes the current default embedding model in the response once search_wiki has been used', async () => {
    generateChatMock
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: '', toolCalls: [{ id: 'call-1', name: 'search_wiki', arguments: { query: 'chunking' } }] },
        model: 'test-model',
        usage: { inputTokens: 5, outputTokens: 5 },
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Found some articles.' },
        model: 'test-model',
        usage: { inputTokens: 5, outputTokens: 3 },
      })
    callToolMock.mockResolvedValue({ articles: [] })

    const result = await runAssistantTurn(fakeCtx(), null, 'What do we know about chunking?')

    expect(result.toolsUsed).toEqual(['search_wiki'])
    expect(result.embeddingModelDisplayName).toBe('Gemini Embedding')
    expect(getDefaultModelMock).toHaveBeenCalledWith(expect.anything(), 'embedding')
  })

  it('stops after the iteration cap and returns a fallback rather than looping forever', async () => {
    generateChatMock.mockResolvedValue({
      message: { role: 'assistant', content: '', toolCalls: [{ id: 'call-x', name: 'search_wiki', arguments: { query: 'x' } }] },
      model: 'test-model',
      usage: { inputTokens: 1, outputTokens: 1 },
    })
    callToolMock.mockResolvedValue({ articles: [] })

    const result = await runAssistantTurn(fakeCtx(), null, 'Loop forever')

    expect(result.reply).toMatch(/wasn't able to finish/i)
    expect(generateChatMock).toHaveBeenCalledTimes(8)
  })

  it('continues an existing conversation by loading its prior history first', async () => {
    listMessagesMock.mockResolvedValue([
      { role: 'user', content: 'earlier question', tool_calls: null, tool_call_id: null, tool_name: null },
      { role: 'assistant', content: 'earlier answer', tool_calls: null, tool_call_id: null, tool_name: null },
    ])
    let capturedMessages: unknown
    generateChatMock.mockImplementation(async (input: { messages: unknown }) => {
      // history is a single mutated array reused across the loop -- snapshot
      // it at call time, since inspecting mock.calls afterwards would see
      // the same reference post-mutation, not what was actually sent.
      capturedMessages = JSON.parse(JSON.stringify(input.messages))
      return { message: { role: 'assistant', content: 'follow-up answer' }, model: 'test-model', usage: { inputTokens: 1, outputTokens: 1 } }
    })

    const result = await runAssistantTurn(fakeCtx(), 'conv-1', 'follow-up question')

    expect(result.conversationId).toBe('conv-1')
    expect(createConversationMock).not.toHaveBeenCalled()
    expect(capturedMessages).toEqual([
      { role: 'user', content: 'earlier question', toolCalls: undefined, toolCallId: undefined, toolName: undefined },
      { role: 'assistant', content: 'earlier answer', toolCalls: undefined, toolCallId: undefined, toolName: undefined },
      { role: 'user', content: 'follow-up question' },
    ])
  })
})
