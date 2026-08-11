import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireUserMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireUser: (...args: unknown[]) => requireUserMock(...args),
  }
})

const { activateGraphVersionAction } = await import('./graphs')

beforeEach(() => {
  requireUserMock.mockReset()
})

describe('activateGraphVersionAction', () => {
  it('rejects an anonymous session', async () => {
    requireUserMock.mockResolvedValue({ profile: { role: 'anonymous' } })
    await expect(activateGraphVersionAction('graph-1', 'version-2')).rejects.toThrow('Create an account')
  })

  it('updates active_version_id through the RLS-scoped client -- RLS (graphs_manage_staff/graphs_manage_project_owner) is the real gate', async () => {
    const supabase = createFakeSupabase({ graphs: [{ data: [{ id: 'graph-1' }], error: null }] })
    requireUserMock.mockResolvedValue({ profile: { role: 'curator' }, supabase })

    await activateGraphVersionAction('graph-1', 'version-2')

    const update = supabase._calls.find((c) => c.table === 'graphs' && c.method === 'update')
    expect(update?.args).toEqual({ active_version_id: 'version-2' })
  })

  it('throws a clear error when RLS silently rejects the update (zero rows matched)', async () => {
    const supabase = createFakeSupabase({ graphs: [{ data: [], error: null }] })
    requireUserMock.mockResolvedValue({ profile: { role: 'consultant' }, supabase })

    await expect(activateGraphVersionAction('graph-1', 'version-2')).rejects.toThrow('permission')
  })
})
