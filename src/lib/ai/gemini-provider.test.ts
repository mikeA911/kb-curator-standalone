import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateContentMock = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: (...args: unknown[]) => generateContentMock(...args) }
    constructor() {}
  },
}))

const { GeminiProvider } = await import('./gemini-provider')

beforeEach(() => {
  generateContentMock.mockReset()
})

describe('GeminiProvider.generateChat', () => {
  it('returns a plain text reply with no tool calls', async () => {
    generateContentMock.mockResolvedValue({
      text: 'Hello there.',
      functionCalls: undefined,
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4 },
    })
    const provider = new GeminiProvider('test-key')

    const result = await provider.generateChat({ messages: [{ role: 'user', content: 'Hi' }] })

    expect(result.message).toEqual({ role: 'assistant', content: 'Hello there.' })
    const call = generateContentMock.mock.calls[0][0]
    expect(call.contents).toEqual([{ role: 'user', parts: [{ text: 'Hi' }] }])
  })

  it('maps functionCalls into ToolCall[]', async () => {
    generateContentMock.mockResolvedValue({
      text: '',
      functionCalls: [{ id: 'call-1', name: 'search_wiki', args: { query: 'RAG' } }],
      usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 6 },
    })
    const provider = new GeminiProvider('test-key')

    const result = await provider.generateChat({
      messages: [{ role: 'user', content: 'What is RAG?' }],
      tools: [{ name: 'search_wiki', description: 'Search the wiki', parameters: { type: 'object', properties: {} } }],
    })

    expect(result.message.toolCalls).toEqual([{ id: 'call-1', name: 'search_wiki', arguments: { query: 'RAG' } }])
    const call = generateContentMock.mock.calls[0][0]
    expect(call.config.tools).toEqual([
      { functionDeclarations: [{ name: 'search_wiki', description: 'Search the wiki', parametersJsonSchema: { type: 'object', properties: {} } }] },
    ])
  })

  it('sends a tool result back as a user-role functionResponse part', async () => {
    generateContentMock.mockResolvedValue({
      text: 'The answer is 4.',
      functionCalls: undefined,
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
    })
    const provider = new GeminiProvider('test-key')

    await provider.generateChat({
      messages: [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '', toolCalls: [{ id: 'call-1', name: 'calc', arguments: {} }] },
        { role: 'tool', content: '4', toolCallId: 'call-1', toolName: 'calc' },
      ],
    })

    const call = generateContentMock.mock.calls[0][0]
    expect(call.contents[2]).toEqual({
      role: 'user',
      parts: [{ functionResponse: { id: 'call-1', name: 'calc', response: { result: '4' } } }],
    })
  })

  it('includes the underlying SDK error in the thrown message, not just a generic string', async () => {
    generateContentMock.mockRejectedValue(Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 }))
    const provider = new GeminiProvider('test-key')

    await expect(provider.generateChat({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toMatchObject({
      message: expect.stringContaining('429 RESOURCE_EXHAUSTED'),
      errorCode: 'rate_limit',
    })
  })
})
