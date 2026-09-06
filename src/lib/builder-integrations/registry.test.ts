import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import {
  registerBuilderIntegration,
  createBuilderIntegrationVersion,
  updateCertificationStatus,
  grantProjectAvailability,
  revokeProjectAvailability,
  listProjectAvailability,
  listCapabilityEvaluations,
  upsertCapabilityEvidence,
  decideCapabilityEvaluation,
} from './registry'
import { BuilderIntegrationValidationError } from './errors'

function ctx(overrides: { role?: string; userId?: string } = {}) {
  return {
    user: { id: overrides.userId ?? 'user-1' },
    profile: { role: overrides.role ?? 'consultant' },
  }
}

describe('registerBuilderIntegration', () => {
  it('creates the integration and an initial experimental version, then activates it', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integrations: [
        { data: { id: 'integration-1' }, error: null }, // insert
        { data: [{ id: 'integration-1' }], error: null }, // activate update
      ],
      builder_integration_versions: [{ data: { id: 'version-1' }, error: null }], // insert
    })

    const result = await registerBuilderIntegration({ ...ctx(), supabase: fakeSupabase as never } as never, {
      name: 'Lunch Agent',
      purpose: 'Order lunch for a team within a spending limit.',
      kind: 'external_agent',
      protocol: 'mcp',
      skills: [{ name: 'jollibee', description: 'Jollibee ordering skill' }],
      credentialsPolicy: { name: 'ref', storage_location: 'Sandz secret store' },
      spendingLimits: { perOrderMax: 2500, currency: 'PHP' },
      approvalPolicy: { requiresHumanConfirmation: true },
    })

    expect(result).toEqual({ integrationId: 'integration-1', versionId: 'version-1' })

    const versionInsert = fakeSupabase._calls.find((c) => c.table === 'builder_integration_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({
      builder_integration_id: 'integration-1',
      version_number: 1,
      skills: [{ name: 'jollibee', description: 'Jollibee ordering skill' }],
      risk_classification: 'read_only',
    })

    const activateUpdate = fakeSupabase._calls.find((c) => c.table === 'builder_integrations' && c.method === 'update')
    expect(activateUpdate?.args).toEqual({ active_version_id: 'version-1' })
  })

  it('registers an mcp_server kind and passes through a non-default risk classification', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integrations: [
        { data: { id: 'integration-2' }, error: null },
        { data: [{ id: 'integration-2' }], error: null },
      ],
      builder_integration_versions: [{ data: { id: 'version-1' }, error: null }],
    })

    await registerBuilderIntegration({ ...ctx(), supabase: fakeSupabase as never } as never, {
      name: 'Order Food MCP Server',
      purpose: 'Exposes outlet menu and ordering tools.',
      kind: 'mcp_server',
      protocol: 'mcp',
      skills: [],
      credentialsPolicy: {},
      spendingLimits: {},
      approvalPolicy: {},
      riskClassification: 'consequential_write',
      authMethod: 'delegated_user_identity',
    })

    const integrationInsert = fakeSupabase._calls.find((c) => c.table === 'builder_integrations' && c.method === 'insert')
    expect(integrationInsert?.args).toMatchObject({ kind: 'mcp_server' })
    const versionInsert = fakeSupabase._calls.find((c) => c.table === 'builder_integration_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({ risk_classification: 'consequential_write', auth_method: 'delegated_user_identity' })
  })

  it('rejects anonymous callers', async () => {
    const fakeSupabase = createFakeSupabase({})

    await expect(
      registerBuilderIntegration({ ...ctx({ role: 'anonymous' }), supabase: fakeSupabase as never } as never, {
        name: 'Lunch Agent',
        purpose: 'Order lunch.',
        kind: 'external_agent',
        protocol: 'mcp',
        skills: [],
        credentialsPolicy: {},
        spendingLimits: {},
        approvalPolicy: {},
      })
    ).rejects.toThrow(BuilderIntegrationValidationError)
  })

  it('retries once with a suffixed slug on a unique-constraint collision', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integrations: [
        { data: null, error: Object.assign(new Error('duplicate key'), { code: '23505' }) }, // first insert collides
        { data: { id: 'integration-2' }, error: null }, // retried insert
        { data: [{ id: 'integration-2' }], error: null }, // activate update
      ],
      builder_integration_versions: [{ data: { id: 'version-1' }, error: null }],
    })

    const result = await registerBuilderIntegration({ ...ctx(), supabase: fakeSupabase as never } as never, {
      name: 'Lunch Agent',
      purpose: 'Order lunch.',
      kind: 'external_agent',
      protocol: 'mcp',
      skills: [],
      credentialsPolicy: {},
      spendingLimits: {},
      approvalPolicy: {},
    })

    expect(result.integrationId).toBe('integration-2')
    const inserts = fakeSupabase._calls.filter((c) => c.table === 'builder_integrations' && c.method === 'insert')
    expect(inserts).toHaveLength(2)
    expect((inserts[1].args as { slug: string }).slug).not.toBe((inserts[0].args as { slug: string }).slug)
  })
})

describe('createBuilderIntegrationVersion', () => {
  it('creates a new version at the next version number and reactivates it', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integrations: [
        { data: { id: 'integration-1', created_by: 'user-1' }, error: null }, // ownership lookup
        { data: [{ id: 'integration-1' }], error: null }, // reactivate update
      ],
      builder_integration_versions: [
        { data: { version_number: 2 }, error: null }, // latest version lookup
        { data: { id: 'version-3' }, error: null }, // insert
      ],
    })

    const result = await createBuilderIntegrationVersion({ ...ctx(), supabase: fakeSupabase as never } as never, 'integration-1', {
      skills: [],
      credentialsPolicy: {},
      spendingLimits: {},
      approvalPolicy: {},
    })

    expect(result).toEqual({ versionId: 'version-3', versionNumber: 3 })
    const versionInsert = fakeSupabase._calls.find((c) => c.table === 'builder_integration_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({ builder_integration_id: 'integration-1', version_number: 3, risk_classification: 'read_only' })
    // No certification_status set explicitly -- the column default
    // ('experimental') is what resets a bumped version, per the schema.
    expect(versionInsert?.args).not.toHaveProperty('certification_status')
  })

  it('rejects a caller who is neither the registering builder nor curator/admin staff', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integrations: [{ data: { id: 'integration-1', created_by: 'someone-else' }, error: null }],
    })

    await expect(
      createBuilderIntegrationVersion(
        { ...ctx({ userId: 'user-1', role: 'consultant' }), supabase: fakeSupabase as never } as never,
        'integration-1',
        { skills: [], credentialsPolicy: {}, spendingLimits: {}, approvalPolicy: {} }
      )
    ).rejects.toThrow(BuilderIntegrationValidationError)
  })

  it('allows curator/admin staff to add a version even when they did not register the integration', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integrations: [
        { data: { id: 'integration-1', created_by: 'someone-else' }, error: null },
        { data: [{ id: 'integration-1' }], error: null },
      ],
      builder_integration_versions: [
        { data: { version_number: 1 }, error: null },
        { data: { id: 'version-2' }, error: null },
      ],
    })

    const result = await createBuilderIntegrationVersion(
      { ...ctx({ userId: 'admin-1', role: 'admin' }), supabase: fakeSupabase as never } as never,
      'integration-1',
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
    ).rejects.toThrow(BuilderIntegrationValidationError)
  })

  it('rejects an invalid status value', async () => {
    const fakeSupabase = createFakeSupabase({})

    await expect(
      updateCertificationStatus(
        { ...ctx({ role: 'curator' }), supabase: fakeSupabase as never } as never,
        'version-1',
        'not_a_real_status' as never
      )
    ).rejects.toThrow(BuilderIntegrationValidationError)
  })

  it('sets approved_by/approved_at when moving to security_reviewed or beyond (required templates satisfied)', async () => {
    const fakeSupabase = createFakeSupabase({
      // read_only (default) profile at security_reviewed only requires
      // functional_contract -- identity_permissions is skipped for Low risk.
      builder_integration_versions: [{ data: { risk_classification: 'read_only' }, error: null }, { data: null, error: null }],
      capability_evaluations: [{ data: [{ template_id: 'functional_contract', status: 'pass' }], error: null }],
    })

    await updateCertificationStatus(
      { ...ctx({ role: 'curator', userId: 'curator-1' }), supabase: fakeSupabase as never } as never,
      'version-1',
      'security_reviewed'
    )

    const update = fakeSupabase._calls.find((c) => c.table === 'builder_integration_versions' && c.method === 'update')
    expect(update?.args).toMatchObject({ certification_status: 'security_reviewed', approved_by: 'curator-1' })
    expect((update?.args as { approved_at: string }).approved_at).toBeTruthy()
  })

  it('does not set approved_by/approved_at for pre-review tiers (experimental, sandbox_tested)', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_versions: [{ data: { risk_classification: 'read_only' }, error: null }, { data: null, error: null }],
      capability_evaluations: [{ data: [{ template_id: 'scope_evidence', status: 'pass' }], error: null }],
    })

    await updateCertificationStatus({ ...ctx({ role: 'curator' }), supabase: fakeSupabase as never } as never, 'version-1', 'sandbox_tested')

    const update = fakeSupabase._calls.find((c) => c.table === 'builder_integration_versions' && c.method === 'update')
    expect(update?.args).toEqual({ certification_status: 'sandbox_tested' })
  })

  // Builder Capability Promotion gating.
  it('blocks advancing to sandbox_tested when scope_evidence is not yet satisfied', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_versions: [{ data: { risk_classification: 'read_only' }, error: null }],
      capability_evaluations: [{ data: [], error: null }],
    })

    await expect(
      updateCertificationStatus({ ...ctx({ role: 'curator' }), supabase: fakeSupabase as never } as never, 'version-1', 'sandbox_tested')
    ).rejects.toThrow('scope_evidence')
    expect(fakeSupabase._calls.find((c) => c.table === 'builder_integration_versions' && c.method === 'update')).toBeUndefined()
  })

  it('varies required templates by risk_classification -- Low skips identity_permissions, Transactional requires it', async () => {
    const lowRisk = createFakeSupabase({
      builder_integration_versions: [{ data: { risk_classification: 'read_only' }, error: null }, { data: null, error: null }],
      capability_evaluations: [{ data: [{ template_id: 'functional_contract', status: 'pass' }], error: null }],
    })
    await expect(
      updateCertificationStatus({ ...ctx({ role: 'admin' }), supabase: lowRisk as never } as never, 'version-1', 'security_reviewed')
    ).resolves.toBeUndefined()

    const transactionalRisk = createFakeSupabase({
      builder_integration_versions: [{ data: { risk_classification: 'consequential_write' }, error: null }],
      capability_evaluations: [{ data: [{ template_id: 'functional_contract', status: 'pass' }], error: null }],
    })
    await expect(
      updateCertificationStatus({ ...ctx({ role: 'admin' }), supabase: transactionalRisk as never } as never, 'version-1', 'security_reviewed')
    ).rejects.toThrow('identity_permissions')
  })

  it('requires human_decision before outlet_accepted only for consequential_write (Transactional) risk', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_versions: [{ data: { risk_classification: 'consequential_write' }, error: null }],
      capability_evaluations: [{ data: [{ template_id: 'customer_acceptance', status: 'pass' }], error: null }],
    })

    await expect(
      updateCertificationStatus({ ...ctx({ role: 'admin' }), supabase: fakeSupabase as never } as never, 'version-1', 'outlet_accepted')
    ).rejects.toThrow('human_decision')
  })

  it('skips the template gate entirely for deprecated/suspended (exits, not advances)', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_versions: [{ data: null, error: null }], // update only -- no version/risk lookup expected
    })

    await updateCertificationStatus({ ...ctx({ role: 'admin' }), supabase: fakeSupabase as never } as never, 'version-1', 'suspended')

    const update = fakeSupabase._calls.find((c) => c.table === 'builder_integration_versions' && c.method === 'update')
    expect(update?.args).toEqual({ certification_status: 'suspended' })
  })
})

describe('Capability Promotion evidence and decisions', () => {
  it('upsertCapabilityEvidence rejects a caller who is neither the registering builder nor staff', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_versions: [{ data: { builder_integration_id: 'integration-1' }, error: null }],
      builder_integrations: [{ data: { created_by: 'someone-else' }, error: null }],
    })

    await expect(
      upsertCapabilityEvidence(
        { ...ctx({ userId: 'user-1', role: 'consultant' }), supabase: fakeSupabase as never } as never,
        'version-1',
        'scope_evidence',
        'notes'
      )
    ).rejects.toThrow(BuilderIntegrationValidationError)
  })

  it('upsertCapabilityEvidence inserts a fresh row at ready_for_review when none exists yet', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_versions: [{ data: { builder_integration_id: 'integration-1' }, error: null }],
      builder_integrations: [{ data: { created_by: 'user-1' }, error: null }],
      capability_evaluations: [{ data: null, error: null }], // no existing row
    })

    await upsertCapabilityEvidence({ ...ctx({ userId: 'user-1' }), supabase: fakeSupabase as never } as never, 'version-1', 'scope_evidence', 'My evidence')

    const insert = fakeSupabase._calls.find((c) => c.table === 'capability_evaluations' && c.method === 'insert')
    expect(insert?.args).toMatchObject({
      builder_integration_version_id: 'version-1',
      template_id: 'scope_evidence',
      evidence_notes: 'My evidence',
      status: 'ready_for_review',
      created_by: 'user-1',
    })
  })

  it('upsertCapabilityEvidence updates the existing row (revision resets to ready_for_review)', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_versions: [{ data: { builder_integration_id: 'integration-1' }, error: null }],
      builder_integrations: [{ data: { created_by: 'user-1' }, error: null }],
      capability_evaluations: [{ data: { id: 'eval-1' }, error: null }],
    })

    await upsertCapabilityEvidence({ ...ctx({ userId: 'user-1' }), supabase: fakeSupabase as never } as never, 'version-1', 'scope_evidence', 'Revised evidence')

    const update = fakeSupabase._calls.find((c) => c.table === 'capability_evaluations' && c.method === 'update')
    expect(update?.args).toEqual({ evidence_notes: 'Revised evidence', status: 'ready_for_review' })
  })

  it('decideCapabilityEvaluation rejects a non-staff caller -- a Builder cannot decide their own gate', async () => {
    const fakeSupabase = createFakeSupabase({})

    await expect(
      decideCapabilityEvaluation({ ...ctx({ role: 'consultant' }), supabase: fakeSupabase as never } as never, 'eval-1', 'pass')
    ).rejects.toThrow(BuilderIntegrationValidationError)
  })

  it('decideCapabilityEvaluation records status/rationale/reviewer for staff', async () => {
    const fakeSupabase = createFakeSupabase({
      capability_evaluations: [{ data: null, error: null }],
    })

    await decideCapabilityEvaluation(
      { ...ctx({ role: 'curator', userId: 'curator-1' }), supabase: fakeSupabase as never } as never,
      'eval-1',
      'conditional_pass',
      'Acceptable with monitoring'
    )

    const update = fakeSupabase._calls.find((c) => c.table === 'capability_evaluations' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'conditional_pass', rationale: 'Acceptable with monitoring', reviewed_by: 'curator-1' })
  })

  it('listCapabilityEvaluations returns every row for a version', async () => {
    const fakeSupabase = createFakeSupabase({
      capability_evaluations: [{ data: [{ id: 'eval-1', template_id: 'scope_evidence' }], error: null }],
    })

    const result = await listCapabilityEvaluations({ ...ctx(), supabase: fakeSupabase as never } as never, 'version-1')
    expect(result).toEqual([{ id: 'eval-1', template_id: 'scope_evidence' }])
  })
})

describe('Project availability', () => {
  it('grantProjectAvailability inserts a row when the caller registered the integration', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integrations: [{ data: { id: 'integration-1', created_by: 'user-1' }, error: null }],
      builder_integration_project_availability: [{ data: null, error: null }],
    })

    await grantProjectAvailability({ ...ctx({ userId: 'user-1' }), supabase: fakeSupabase as never } as never, 'integration-1', 'project-1')

    const insert = fakeSupabase._calls.find((c) => c.table === 'builder_integration_project_availability' && c.method === 'insert')
    expect(insert?.args).toEqual({ builder_integration_id: 'integration-1', project_id: 'project-1', granted_by: 'user-1' })
  })

  it('grantProjectAvailability rejects a caller who is neither the registering builder nor staff', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integrations: [{ data: { id: 'integration-1', created_by: 'someone-else' }, error: null }],
    })

    await expect(
      grantProjectAvailability(
        { ...ctx({ userId: 'user-1', role: 'consultant' }), supabase: fakeSupabase as never } as never,
        'integration-1',
        'project-1'
      )
    ).rejects.toThrow(BuilderIntegrationValidationError)
  })

  it('revokeProjectAvailability deletes by availability id, gated the same way as grant', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integrations: [{ data: { id: 'integration-1', created_by: 'user-1' }, error: null }],
      builder_integration_project_availability: [{ data: null, error: null }],
    })

    await revokeProjectAvailability({ ...ctx({ userId: 'user-1' }), supabase: fakeSupabase as never } as never, 'integration-1', 'avail-1')

    const del = fakeSupabase._calls.find((c) => c.table === 'builder_integration_project_availability' && c.method === 'delete')
    expect(del).toBeTruthy()
  })

  it('listProjectAvailability resolves project names for each granted row', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_project_availability: [{ data: [{ id: 'avail-1', project_id: 'project-1' }], error: null }],
      projects: [{ data: [{ id: 'project-1', name: 'OrderFood' }], error: null }],
    })

    const result = await listProjectAvailability({ ...ctx(), supabase: fakeSupabase as never } as never, 'integration-1')

    expect(result).toEqual([{ id: 'avail-1', projectId: 'project-1', projectName: 'OrderFood' }])
  })

  it('listProjectAvailability short-circuits to [] without querying projects when nothing is granted', async () => {
    const fakeSupabase = createFakeSupabase({
      builder_integration_project_availability: [{ data: [], error: null }],
    })

    expect(await listProjectAvailability({ ...ctx(), supabase: fakeSupabase as never } as never, 'integration-1')).toEqual([])
  })
})
