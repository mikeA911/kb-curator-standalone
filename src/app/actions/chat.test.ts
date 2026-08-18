import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireUserMock = vi.fn()
const runAssistantTurnMock = vi.fn()

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return { ...actual, requireUser: (...args: unknown[]) => requireUserMock(...args) }
})
vi.mock('@/lib/chat/loop', () => ({ runAssistantTurn: (...args: unknown[]) => runAssistantTurnMock(...args) }))

const { sendChatMessageAction } = await import('./chat')

beforeEach(() => {
  requireUserMock.mockReset()
  runAssistantTurnMock.mockReset()
})

describe('sendChatMessageAction', () => {
  it('resolves the caller via requireUser and delegates straight to runAssistantTurn', async () => {
    const ctx = { user: { id: 'user-1' }, profile: { role: 'curator' }, supabase: {} }
    requireUserMock.mockResolvedValue(ctx)
    runAssistantTurnMock.mockResolvedValue({ conversationId: 'conv-1', reply: 'Hi there.' })

    const result = await sendChatMessageAction(null, 'Hello')

    expect(requireUserMock).toHaveBeenCalled()
    expect(runAssistantTurnMock).toHaveBeenCalledWith(ctx, null, 'Hello')
    expect(result).toEqual({ conversationId: 'conv-1', reply: 'Hi there.' })
  })
})
