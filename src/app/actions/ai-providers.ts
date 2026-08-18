'use server'

import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { requireRole } from '@/lib/auth'
import { env } from '@/lib/env'
import { AIConfigError } from '@/lib/ai'
import type { AIModelType, AIModelStatus, AIProviderType } from '@/types/database'

// Model/provider configuration is admin-only throughout this file --
// consultants and curators can *select* from enabled models (see
// RunConfigForm) but never modify credentials or the registry itself.

export async function createProviderAction(input: {
  name: string
  providerType: AIProviderType
  displayName: string
  baseUrl: string | null
  apiKeyEnvVar: string
  supportsModelDiscovery: boolean
}) {
  const { supabase } = await requireRole('admin')
  const { error } = await supabase.from('ai_providers').insert({
    name: input.name,
    provider_type: input.providerType,
    display_name: input.displayName,
    base_url: input.baseUrl,
    api_key_env_var: input.apiKeyEnvVar,
    enabled: true,
    supports_model_discovery: input.supportsModelDiscovery,
  })
  if (error) throw error
  revalidatePath('/admin')
}

export async function updateProviderEnabledAction(providerId: string, enabled: boolean) {
  const { supabase } = await requireRole('admin')
  const { error } = await supabase.from('ai_providers').update({ enabled }).eq('id', providerId)
  if (error) throw error
  revalidatePath('/admin')
}

export interface CreateModelInput {
  providerId: string
  modelId: string
  displayName: string
  modelType: AIModelType
  contextWindow: number | null
  maxOutputTokens: number | null
  embeddingDimensions: number | null
  supportsStructuredOutput: boolean
  supportsTools: boolean
  supportsReasoning: boolean
  supportsVision: boolean
}

export async function createModelAction(input: CreateModelInput) {
  const { supabase } = await requireRole('admin')
  const { error } = await supabase.from('ai_models').insert({
    provider_id: input.providerId,
    model_id: input.modelId,
    display_name: input.displayName || input.modelId,
    model_type: input.modelType,
    enabled: true,
    is_default: false,
    is_default_structured_output: false,
    context_window: input.contextWindow,
    max_output_tokens: input.maxOutputTokens,
    input_cost_per_million: null,
    output_cost_per_million: null,
    embedding_dimensions: input.embeddingDimensions,
    supports_structured_output: input.supportsStructuredOutput,
    supports_tools: input.supportsTools,
    supports_reasoning: input.supportsReasoning,
    supports_vision: input.supportsVision,
    supports_embeddings: input.modelType === 'embedding',
    status: 'active',
    deprecation_date: null,
    replacement_model_id: null,
    notes: null,
    metadata: {},
  })
  if (error) throw error
  revalidatePath(`/admin/providers/${input.providerId}`)
}

export async function updateModelEnabledAction(modelId: string, providerId: string, enabled: boolean) {
  const { supabase } = await requireRole('admin')
  const { error } = await supabase.from('ai_models').update({ enabled }).eq('id', modelId)
  if (error) throw error
  revalidatePath(`/admin/providers/${providerId}`)
}

// The partial unique index (one default per model_type) means setting a new
// default requires clearing the old one first -- same two-step pattern as
// markBaselineAction for eval runs.
export async function setDefaultModelAction(modelId: string, providerId: string, modelType: AIModelType) {
  const { supabase } = await requireRole('admin')
  await supabase.from('ai_models').update({ is_default: false }).eq('model_type', modelType).eq('is_default', true)
  const { error } = await supabase.from('ai_models').update({ is_default: true }).eq('id', modelId)
  if (error) throw error
  revalidatePath(`/admin/providers/${providerId}`)
}

// Independent of setDefaultModelAction/is_default -- see the migration
// comment on is_default_structured_output. Not scoped by model_type (unlike
// setDefaultModelAction) since it's a single global flag, not one-per-type;
// the DB check constraint (ai_models_default_structured_output_requires_capability)
// is the real guard against picking a model that doesn't support it, this
// just turns that into a readable error instead of a raw Postgres one.
export async function setDefaultStructuredOutputModelAction(modelId: string, providerId: string) {
  const { supabase } = await requireRole('admin')
  await supabase.from('ai_models').update({ is_default_structured_output: false }).eq('is_default_structured_output', true)
  const { error } = await supabase.from('ai_models').update({ is_default_structured_output: true }).eq('id', modelId)
  if (error) {
    if (error.code === '23514') throw new AIConfigError('This model does not support structured output')
    throw error
  }
  revalidatePath(`/admin/providers/${providerId}`)
}

export async function updateModelStatusAction(
  modelId: string,
  providerId: string,
  status: AIModelStatus,
  deprecationDate: string | null
) {
  const { supabase } = await requireRole('admin')
  const { error } = await supabase.from('ai_models').update({ status, deprecation_date: deprecationDate }).eq('id', modelId)
  if (error) throw error
  revalidatePath(`/admin/providers/${providerId}`)
}

export async function updateModelNotesAction(modelId: string, providerId: string, notes: string) {
  const { supabase } = await requireRole('admin')
  const { error } = await supabase.from('ai_models').update({ notes: notes || null }).eq('id', modelId)
  if (error) throw error
  revalidatePath(`/admin/providers/${providerId}`)
}

// Best-effort model discovery for the "Refresh Models" action -- returns
// what the provider currently lists, never writes to ai_models. Admin
// reviews the list and adds whichever models they actually want (see
// createModelAction) -- discovery never auto-enables anything.
export async function discoverModelsAction(providerId: string): Promise<{ id: string }[]> {
  const { supabase } = await requireRole('admin')
  const { data: provider, error } = await supabase.from('ai_providers').select('*').eq('id', providerId).single()
  if (error || !provider) throw new AIConfigError('Provider not found')
  if (!provider.supports_model_discovery) throw new AIConfigError(`${provider.display_name} does not support model discovery`)

  const apiKey = env.byName(provider.api_key_env_var)
  if (!apiKey) throw new AIConfigError(`${provider.api_key_env_var} is not set`)

  const client = new OpenAI({ apiKey, baseURL: provider.base_url ?? undefined })
  const res = await client.models.list()
  return res.data.map((m) => ({ id: m.id }))
}
