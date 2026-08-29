import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { registerExternalAgent, createExternalAgentVersion, updateCertificationStatus } from './registry'
import { ExternalAgentValidationError } from './errors'

function ctx(overrides: { role?: string; userId?: string } = {}) {
  return {
    user: { id: overrides.userId ?? 'user-1' },
    profile: { role: overrides.role ?? 'consultant' },
  }
}

describe('registerExternalAgent', () => {
  it('creates the agent and an initial experimental version, then activates it', async () => {
    const fakeSupabase = createFakeSupabase({
      external_agents: [
        { data: { id: 'agent-1' }, error: null }, // insert
        { data: [{ id: 'agent-1' }], error: null }, // activate update
      ],
      external_agent_versions: [{ data: { id: 'version-1' }, error: null }], // insert
    })

    const result = await registerExternalAgent({ ...ctx(), supabase: fakeSupabase as never } as never, {
      name: 'Lunch Agent',
      purpose: 'Order lunch for a team within a spending limit.',
      protocol: 'mcp',
      skills: [{ name: 'jollibee', description: 'Jollibee ordering skill' }],
      credentialsPolicy: { name: 'ref', storage_location: 'Sandz secret store' },
      spendingLimits: { perOrderMax: 2500, currency: 'PHP' },
      approvalPolicy: { requiresHumanConfirmation: true },
    })

    expect(result).toEqual({ agentId: 'agent-1', versionId: 'version-1' })

    const versionInsert = fakeSupabase._calls.find((c) => c.table === 'external_agent_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({
      external_agent_id: 'agent-1',
      version_number: 1,
      skills: [{ name: 'jollibee', description: 'Jollibee ordering skill' }],
    })

    const activateUpdate = fakeSupabase._calls.find((c) => c.table === 'external_agents' && c.method === 'update')
    expect(activateUpdate?.args).toEqual({ active_version_id: 'version-1' })
  })

  it('rejects anonymous callers', async () => {
    const fakeSupabase = createFakeSupabase({})

    await expect(
      registerExternalAgent({ ...ctx({ role: 'anonymous' }), supabase: fakeSupabase as never } as never, {
        name: 'Lunch Agent',
        purpose: 'Order lunch.',
        protocol: 'mcp',
        skills: [],
        credentialsPolicy: {},
        spendingLimits: {},
        approvalPolicy: {},
      })
    ).rejects.toThrow(ExternalAgentValidationError)
  })

  it('retries once with a suffixed slug on a unique-constraint collision', async () => {
    const fakeSupabase = createFakeSupabase({
      external_agents: [
        { data: null, error: Object.assign(new Error('duplicate key'), { code: '23505' }) }, // first insert collides
        { data: { id: 'agent-2' }, error: null }, // retried insert
        { data: [{ id: 'agent-2' }], error: null }, // activate update
      ],
      external_agent_versions: [{ data: { id: 'version-1' }, error: null }],
    })

    const result = await registerExternalAgent({ ...ctx(), supabase: fakeSupabase as never } as never, {
      name: 'Lunch Agent',
      purpose: 'Order lunch.',
      protocol: 'mcp',
      skills: [],
      credentialsPolicy: {},
      spendingLimits: {},
      approvalPolicy: {},
    })

    expect(result.agentId).toBe('agent-2')
    const inserts = fakeSupabase._calls.filter((c) => c.table === 'external_agents' && c.method === 'insert')
    expect(inserts).toHaveLength(2)
    expect((inserts[1].args as { slug: string }).slug).not.toBe((inserts[0].args as { slug: string }).slug)
  })
})

describe('createExternalAgentVersion', () => {
  it('creates a new version at the next version number and reactivates it', async () => {
    const fakeSupabase = createFakeSupabase({
      external_agents: [
        { data: { id: 'agent-1', created_by: 'user-1' }, error: null }, // ownership lookup
        { data: [{ id: 'agent-1' }], error: null }, // reactivate update
      ],
      external_agent_versions: [
        { data: { version_number: 2 }, error: null }, // latest version lookup
        { data: { id: 'version-3' }, error: null }, // insert
      ],
    })

    const result = await createExternalAgentVersion({ ...ctx(), supabase: fakeSupabase as never } as never, 'agent-1', {
      skills: [],
      credentialsPolicy: {},
      spendingLimits: {},
      approvalPolicy: {},
    })

    expect(result).toEqual({ versionId: 'version-3', versionNumber: 3 })
    const versionInsert = fakeSupabase._calls.find((c) => c.table === 'external_agent_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({ external_agent_id: 'agent-1', version_number: 3 })
    // No certification_status set explicitly -- the column default
    // ('experimental') is what resets a bumped version, per the schema.
    expect(versionInsert?.args).not.toHaveProperty('certification_status')
  })

  it('rejects a caller who is neither the registering builder nor curator/admin staff', async () => {
    const fakeSupabase = createFakeSupabase({
      external_agents: [{ data: { id: 'agent-1', created_by: 'someone-else' }, error: null }],
    })

    await expect(
      createExternalAgentVersion({ ...ctx({ userId: 'user-1', role: 'consultant' }), supabase: fakeSupabase as never } as never, 'agent-1', {
        skills: [],
        credentialsPolicy: {},
        spendingLimits: {},
        approvalPolicy: {},
      })
    ).rejects.toThrow(ExternalAgentValidationError)
  })

  it('allows curator/admin staff to add a version even when they did not register the agent', async () => {
    const fakeSupabase = createFakeSupabase({
      external_agents: [
        { data: { id: 'agent-1', created_by: 'someone-else' }, error: null },
        { data: [{ id: 'agent-1' }], error: null },
      ],
      external_agent_versions: [
        { data: { version_number: 1 }, error: null },
        { data: { id: 'version-2' }, error: null },
      ],
    })

    const result = await createExternalAgentVersion(
      { ...ctx({ userId: 'admin-1', role: 'admin' }), supabase: fakeSupabase as never } as never,
      'agent-1',
      { skills: [], credentialsPolicy: {}, spendingLimits: {}, approvalPolicy: {} }
    )

    expect(result.versionNumber).toBe(2)
  })
})

describe('updateCertificationStatus', () => {
  it('rejects a non-staff caller', async () => {
    const fakeSupabase = createFakeSupabase({})

    await expect(
      updateCertificationStatus({ ...ctx({ role: 'consultant' }), supabase: fakeSupabase as never } as never, 'version-1', 'sandbox_tested')
    ).rejects.toThrow(ExternalAgentValidationError)
  })

  it('rejects an invalid status value', async () => {
    const fakeSupabase = createFakeSupabase({})

    await expect(
      updateCertificationStatus(
        { ...ctx({ role: 'curator' }), supabase: fakeSupabase as never } as never,
        'version-1',
        'not_a_real_status' as never
      )
    ).rejects.toThrow(ExternalAgentValidationError)
  })

  it('sets approved_by/approved_at when moving to security_reviewed or beyond', async () => {
    const fakeSupabase = createFakeSupabase({
      external_agent_versions: [{ data: null, error: null }], // update
    })

    await updateCertificationStatus(
      { ...ctx({ role: 'curator', userId: 'curator-1' }), supabase: fakeSupabase as never } as never,
      'version-1',
      'security_reviewed'
    )

    const update = fakeSupabase._calls.find((c) => c.table === 'external_agent_versions' && c.method === 'update')
    expect(update?.args).toMatchObject({ certification_status: 'security_reviewed', approved_by: 'curator-1' })
    expect((update?.args as { approved_at: string }).approved_at).toBeTruthy()
  })

  it('does not set approved_by/approved_at for pre-review tiers (experimental, sandbox_tested)', async () => {
    const fakeSupabase = createFakeSupabase({
      external_agent_versions: [{ data: null, error: null }],
    })

    await updateCertificationStatus({ ...ctx({ role: 'curator' }), supabase: fakeSupabase as never } as never, 'version-1', 'sandbox_tested')

    const update = fakeSupabase._calls.find((c) => c.table === 'external_agent_versions' && c.method === 'update')
    expect(update?.args).toEqual({ certification_status: 'sandbox_tested' })
  })
})
