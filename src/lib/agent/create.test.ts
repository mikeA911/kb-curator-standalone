import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { createAgentFromTemplate } from './create'

function fakeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'template-1',
    agent_type: 'knowledge',
    default_graph_version_id: 'graph-version-1',
    default_purpose: 'Answer questions using permitted knowledge.',
    default_instructions: 'Answer using only retrieved evidence.',
    default_source_policy: { evidenceSource: 'both', topK: 5 },
    default_tool_policy: {},
    default_guardrails: { noUnsupportedClaims: true },
    default_termination_policy: { maxIterations: 2 },
    default_generation_provider_id: 'provider-gen',
    default_generation_model_id: 'model-gen',
    default_embedding_provider_id: 'provider-embed',
    default_embedding_model_id: 'model-embed',
    default_evaluator_provider_id: 'provider-eval',
    default_evaluator_model_id: 'model-eval',
    slug: 'rag-answer',
    ...overrides,
  }
}

function buildFakeSupabase(template: ReturnType<typeof fakeTemplate>) {
  const fakeSupabase = createFakeSupabase({
    agent_templates: [{ data: template, error: null }],
    agents: [
      { data: { id: 'agent-1' }, error: null }, // insert
      { data: [{ id: 'agent-1' }], error: null }, // final activate update
    ],
    agent_versions: [{ data: { id: 'version-1' }, error: null }], // insert
  })
  return { supabase: fakeSupabase as never, fakeSupabase }
}

describe('createAgentFromTemplate', () => {
  it('copies template defaults verbatim when no override is given', async () => {
    const template = fakeTemplate()
    const { supabase, fakeSupabase } = buildFakeSupabase(template)

    const result = await createAgentFromTemplate(supabase, {
      templateId: 'template-1',
      name: 'RAG Answer Agent',
      slug: 'rag-answer-agent',
      createdBy: 'user-1',
    })

    expect(result).toEqual({ agentId: 'agent-1', versionId: 'version-1' })

    const versionInsert = fakeSupabase._calls.find((c) => c.table === 'agent_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({
      purpose: template.default_purpose,
      instructions: template.default_instructions,
      graph_version_id: template.default_graph_version_id,
      generation_provider_id: template.default_generation_provider_id,
      generation_model_id: template.default_generation_model_id,
      embedding_provider_id: template.default_embedding_provider_id,
      embedding_model_id: template.default_embedding_model_id,
      source_policy: template.default_source_policy,
      guardrails: template.default_guardrails,
      termination_policy: template.default_termination_policy,
    })
  })

  it('applies field-level overrides when given, leaving unspecified fields as template defaults', async () => {
    const template = fakeTemplate()
    const { supabase, fakeSupabase } = buildFakeSupabase(template)

    await createAgentFromTemplate(supabase, {
      templateId: 'template-1',
      name: 'Custom RAG Agent',
      slug: 'custom-rag-agent',
      purpose: 'A custom purpose.',
      generationProviderId: 'provider-override',
      generationModelId: 'model-override',
      createdBy: 'user-1',
    })

    const versionInsert = fakeSupabase._calls.find((c) => c.table === 'agent_versions' && c.method === 'insert')
    expect(versionInsert?.args).toMatchObject({
      purpose: 'A custom purpose.',
      instructions: template.default_instructions, // not overridden -- template default
      generation_provider_id: 'provider-override',
      generation_model_id: 'model-override',
      embedding_provider_id: template.default_embedding_provider_id, // not overridden
    })
  })

  it('sets template_id on the created agent', async () => {
    const template = fakeTemplate()
    const { supabase, fakeSupabase } = buildFakeSupabase(template)

    await createAgentFromTemplate(supabase, {
      templateId: 'template-1',
      name: 'RAG Answer Agent',
      slug: 'rag-answer-agent',
      createdBy: 'user-1',
    })

    const agentInsert = fakeSupabase._calls.find((c) => c.table === 'agents' && c.method === 'insert')
    expect(agentInsert?.args).toMatchObject({ template_id: 'template-1', agent_type: 'knowledge' })
  })

  it('activates the created version via agents.active_version_id', async () => {
    const template = fakeTemplate()
    const { supabase, fakeSupabase } = buildFakeSupabase(template)

    await createAgentFromTemplate(supabase, {
      templateId: 'template-1',
      name: 'RAG Answer Agent',
      slug: 'rag-answer-agent',
      createdBy: 'user-1',
    })

    const agentUpdate = fakeSupabase._calls.find((c) => c.table === 'agents' && c.method === 'update')
    expect(agentUpdate?.args).toEqual({ active_version_id: 'version-1' })
  })

  it('throws a clear error when the required models are missing from both input and template', async () => {
    const template = fakeTemplate({ default_generation_provider_id: null, default_generation_model_id: null })
    const { supabase } = buildFakeSupabase(template)

    await expect(
      createAgentFromTemplate(supabase, {
        templateId: 'template-1',
        name: 'RAG Answer Agent',
        slug: 'rag-answer-agent',
        createdBy: 'user-1',
      })
    ).rejects.toThrow('generation model')
  })
})
