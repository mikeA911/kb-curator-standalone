import { describe, it, expect, vi, beforeEach } from 'vitest'

const callToolMock = vi.fn()
const connectMock = vi.fn().mockResolvedValue(undefined)
const closeMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: connectMock,
    close: closeMock,
    callTool: (...args: unknown[]) => callToolMock(...args),
  })),
}))
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(() => ({})),
}))

const { connectAndCallTool } = await import('./client')

beforeEach(() => {
  callToolMock.mockReset()
  connectMock.mockClear()
  closeMock.mockClear()
})

describe('connectAndCallTool error extraction', () => {
  // Live-verified against the real OrderLunch MCP Showcase: a tool error's
  // `error` field can be nested as { code, message, details } rather than a
  // bare string -- extracting only the string case used to make
  // `new Error(message)` stringify the whole object, surfacing a useless
  // "[object Object]" wherever this error was shown (GatewayInvocationCard,
  // Ember's own turn).
  it('extracts the message from a nested { error: { message } } shape', async () => {
    callToolMock.mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Order was not found', details: {} } }) }],
    })

    await expect(connectAndCallTool('https://example.test/mcp', [], 'get_order_status', {})).rejects.toThrow('Order was not found')
  })

  it('still extracts a bare-string { error } shape', async () => {
    callToolMock.mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: JSON.stringify({ error: 'Something went wrong' }) }],
    })

    await expect(connectAndCallTool('https://example.test/mcp', [], 'get_order_status', {})).rejects.toThrow('Something went wrong')
  })

  it('falls back to a generic message when the error result has no usable error field', async () => {
    callToolMock.mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: JSON.stringify({ ok: false }) }],
    })

    await expect(connectAndCallTool('https://example.test/mcp', [], 'get_order_status', {})).rejects.toThrow('MCP tool call failed')
  })

  it('returns the parsed payload on success', async () => {
    callToolMock.mockResolvedValue({
      isError: false,
      content: [{ type: 'text', text: JSON.stringify({ id: 'order-1', state: 'placed' }) }],
    })

    await expect(connectAndCallTool('https://example.test/mcp', [], 'get_order_status', {})).resolves.toEqual({ id: 'order-1', state: 'placed' })
  })
})
