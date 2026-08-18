import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIModelRow, AIModelType, AIProviderRow, Database } from '@/types/database'
import { env } from '@/lib/env'
import type { AIProvider } from './provider'
import { OpenAIProvider } from './openai-provider'
import { GeminiProvider } from './gemini-provider'
import { OpenAICompatibleProvider } from './openai-compatible-provider'
import { withLogging, type LogContext } from './logging'

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIConfigError'
  }
}

export async function listProviders(
  supabase: SupabaseClient<Database>,
  opts: { enabledOnly?: boolean } = {}
): Promise<AIProviderRow[]> {
  let query = supabase.from('ai_providers').select('*').order('name')
  if (opts.enabledOnly) query = query.eq('enabled', true)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listModels(
  supabase: SupabaseClient<Database>,
  opts: { providerId?: string; modelType?: AIModelType; enabledOnly?: boolean } = {}
): Promise<AIModelRow[]> {
  let query = supabase.from('ai_models').select('*').order('display_name')
  if (opts.providerId) query = query.eq('provider_id', opts.providerId)
  if (opts.modelType) query = query.eq('model_type', opts.modelType)
  if (opts.enabledOnly) query = query.eq('enabled', true)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function resolveModel(
  supabase: SupabaseClient<Database>,
  providerName: string,
  modelId: string
): Promise<{ provider: AIProviderRow; model: AIModelRow }> {
  const { data: provider, error: providerError } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('name', providerName)
    .single()
  if (providerError || !provider) throw new AIConfigError(`Unknown AI provider: ${JSON.stringify(providerName)}`)
  if (!provider.enabled) throw new AIConfigError(`AI provider "${providerName}" is disabled`)

  const { data: model, error: modelError } = await supabase
    .from('ai_models')
    .select('*')
    .eq('provider_id', provider.id)
    .eq('model_id', modelId)
    .single()
  if (modelError || !model) throw new AIConfigError(`Unknown model "${modelId}" for provider "${providerName}"`)

  return { provider, model }
}

// "The default generation model" / "the default embedding model" fall out of
// the single is_default flag scoped by model_type (see the partial unique
// index in the migration) rather than a separate boolean pair -- this is
// what makes generation and embedding defaults genuinely independent.
export async function getDefaultModel(
  supabase: SupabaseClient<Database>,
  modelType: 'generation' | 'embedding'
): Promise<{ provider: AIProviderRow; model: AIModelRow }> {
  const { data: model, error: modelError } = await supabase
    .from('ai_models')
    .select('*')
    .eq('model_type', modelType)
    .eq('is_default', true)
    .single()
  if (modelError || !model) throw new AIConfigError(`No default ${modelType} model configured`)

  const { data: provider, error: providerError } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('id', model.provider_id)
    .single()
  if (providerError || !provider) throw new AIConfigError(`Default ${modelType} model's provider is missing`)

  return { provider, model }
}

// Called once at the top of an eval run rather than scattered provider-name
// checks throughout the pipeline -- validates the model actually selected
// for a slot can do what that slot needs before any API call is made.
export function assertModelCapability(model: AIModelRow, need: 'generation' | 'embedding' | 'structured_output') {
  if (need === 'generation' && model.model_type !== 'generation') {
    throw new AIConfigError(`Model "${model.model_id}" is a ${model.model_type} model and cannot be used for generation`)
  }
  if (need === 'embedding' && model.model_type !== 'embedding' && !model.supports_embeddings) {
    throw new AIConfigError(`Model "${model.model_id}" is a ${model.model_type} model and cannot be used for embedding`)
  }
  if (need === 'structured_output' && !model.supports_structured_output) {
    throw new AIConfigError(`Model "${model.model_id}" does not support structured output`)
  }
  if (!model.enabled) {
    throw new AIConfigError(`Model "${model.model_id}" is disabled`)
  }
}

function resolveApiKey(provider: AIProviderRow): string | undefined {
  return env.byName(provider.api_key_env_var)
}

function buildProviderClient(provider: AIProviderRow, defaultTextModel?: string, defaultEmbedModel?: string): AIProvider {
  const apiKey = resolveApiKey(provider)
  if (!apiKey) {
    throw new AIConfigError(`Provider "${provider.name}" is enabled but ${provider.api_key_env_var} is not set`)
  }

  switch (provider.provider_type) {
    case 'openai':
      return defaultTextModel || defaultEmbedModel
        ? new OpenAIProvider(apiKey, defaultTextModel, defaultEmbedModel)
        : new OpenAIProvider(apiKey)
    case 'gemini':
      return defaultTextModel || defaultEmbedModel
        ? new GeminiProvider(apiKey, defaultTextModel, defaultEmbedModel)
        : new GeminiProvider(apiKey)
    case 'groq':
    case 'openai_compatible': {
      if (!provider.base_url) throw new AIConfigError(`Provider "${provider.name}" has no base_url configured`)
      return new OpenAICompatibleProvider(provider.name, apiKey, provider.base_url, defaultTextModel)
    }
  }
}

// The one place evaluation (and everything else) resolves a provider by
// name -- now a DB lookup against the registry instead of a switch over a
// hard-coded union, so a newly admin-added provider works immediately.
export async function getProviderByName(
  supabase: SupabaseClient<Database>,
  name: string,
  logContext: LogContext = {}
): Promise<AIProvider> {
  const { data: provider, error } = await supabase.from('ai_providers').select('*').eq('name', name).single()
  if (error || !provider) throw new AIConfigError(`Unknown AI provider: ${JSON.stringify(name)}`)
  if (!provider.enabled) throw new AIConfigError(`AI provider "${name}" is disabled`)

  return withLogging(buildProviderClient(provider), logContext)
}

// The app-wide default, used by chunk enrichment and Wiki synthesis --
// replaces the old settings.ai_provider key. Resolves to whichever provider
// currently owns the default generation model in the registry (e.g. Groq),
// with that model pre-filled as the provider instance's default so callers
// that don't pass `model` explicitly (enrichment/synthesis never do) still
// get the right one.
export async function getActiveProvider(
  supabase: SupabaseClient<Database>,
  logContext: LogContext = {}
): Promise<AIProvider> {
  const { provider, model } = await getDefaultModel(supabase, 'generation')
  return withLogging(buildProviderClient(provider, model.model_id), logContext)
}

// The embedding counterpart to getActiveProvider -- resolves whichever
// provider currently owns the default EMBEDDING model (independent of the
// default generation model; they're frequently different providers, e.g.
// Groq for generation + Gemini for embeddings). Chunk approval and Wiki
// version approval both call .embed() and must use this, not
// getActiveProvider -- calling .embed() on a generation-only provider
// throws (some, like Groq, don't support embeddings at all).
export async function getActiveEmbeddingProvider(
  supabase: SupabaseClient<Database>,
  logContext: LogContext = {}
): Promise<AIProvider> {
  const { provider, model } = await getDefaultModel(supabase, 'embedding')
  return withLogging(buildProviderClient(provider, undefined, model.model_id), logContext)
}
