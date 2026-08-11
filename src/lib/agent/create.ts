import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { AgentValidationError } from './errors'

export interface CreateAgentFromTemplateInput {
  templateId: string
  name: string
  slug: string
  projectId?: string | null
  // Each optional field overrides the template's default -- "A custom Agent
  // can override template models, instructions..." Absent = the template's
  // default is copied verbatim, exactly what the migration seed does for
  // the RAG Answer Agent by hand.
  purpose?: string
  instructions?: string
  generationProviderId?: string
  generationModelId?: string
  embeddingProviderId?: string
  embeddingModelId?: string
  evaluatorProviderId?: string
  evaluatorModelId?: string
  createdBy: string
}

// "A user can create a custom Agent from an Agent Template" -- defaults are
// COPIED into the new agent_versions row here, never dynamically inherited,
// so a later edit to the template can never disturb an Agent already
// created from it (agent_templates is an ordinary mutable table; this copy
// step is what makes that safe).
export async function createAgentFromTemplate(
  supabase: SupabaseClient<Database>,
  input: CreateAgentFromTemplateInput
): Promise<{ agentId: string; versionId: string }> {
  const { data: template, error: templateError } = await supabase
    .from('agent_templates')
    .select('*')
    .eq('id', input.templateId)
    .single()
  if (templateError || !template) throw templateError ?? new AgentValidationError('Template not found')

  const generationProviderId = input.generationProviderId ?? template.default_generation_provider_id
  const generationModelId = input.generationModelId ?? template.default_generation_model_id
  const embeddingProviderId = input.embeddingProviderId ?? template.default_embedding_provider_id
  const embeddingModelId = input.embeddingModelId ?? template.default_embedding_model_id
  if (!generationProviderId || !generationModelId || !embeddingProviderId || !embeddingModelId) {
    throw new AgentValidationError('A generation model and an embedding model are required (the template supplied no default for one and none was given)')
  }

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .insert({
      name: input.name,
      slug: input.slug,
      description: null,
      agent_type: template.agent_type,
      template_id: template.id,
      project_id: input.projectId ?? null,
      status: 'active',
      created_by: input.createdBy,
    })
    .select('id')
    .single()
  if (agentError || !agent) throw agentError ?? new AgentValidationError('Failed to create agent')

  const { data: version, error: versionError } = await supabase
    .from('agent_versions')
    .insert({
      agent_id: agent.id,
      version_number: 1,
      purpose: input.purpose ?? template.default_purpose,
      instructions: input.instructions ?? template.default_instructions,
      graph_version_id: template.default_graph_version_id,
      generation_provider_id: generationProviderId,
      generation_model_id: generationModelId,
      embedding_provider_id: embeddingProviderId,
      embedding_model_id: embeddingModelId,
      evaluator_provider_id: input.evaluatorProviderId ?? template.default_evaluator_provider_id,
      evaluator_model_id: input.evaluatorModelId ?? template.default_evaluator_model_id,
      source_policy: template.default_source_policy,
      tool_policy: template.default_tool_policy,
      guardrails: template.default_guardrails,
      termination_policy: template.default_termination_policy,
      metadata: { family: template.agent_type, createdFromTemplate: template.slug },
      created_by: input.createdBy,
      activated_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (versionError || !version) throw versionError ?? new AgentValidationError('Failed to create agent version')

  // Same RLS-silent-no-op check as activateGraphVersionAction/
  // activateAgentVersionAction -- an UPDATE matching zero rows under RLS
  // succeeds silently with an empty result rather than erroring.
  const { data: activated, error: activateError } = await supabase
    .from('agents')
    .update({ active_version_id: version.id })
    .eq('id', agent.id)
    .select('id')
  if (activateError) throw activateError
  if (!activated || activated.length === 0) {
    throw new AgentValidationError('You do not have permission to activate this agent version')
  }

  return { agentId: agent.id, versionId: version.id }
}
