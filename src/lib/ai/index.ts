import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'
import type { AIProvider } from './provider'
import { OpenAIProvider } from './openai-provider'
import { GeminiProvider } from './gemini-provider'
import { withLogging, type LogContext } from './logging'

export type { AIProvider } from './provider'
export { AIProviderError } from './provider'

const KNOWN_PROVIDERS = ['openai', 'gemini'] as const
export type ProviderName = (typeof KNOWN_PROVIDERS)[number]

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIConfigError'
  }
}

function buildProvider(name: ProviderName): AIProvider {
  switch (name) {
    case 'openai': {
      const apiKey = env.openaiApiKey()
      if (!apiKey) throw new AIConfigError('ai_provider is "openai" but OPENAI_API_KEY is not set')
      return new OpenAIProvider(apiKey)
    }
    case 'gemini': {
      const apiKey = env.googleApiKey()
      if (!apiKey) throw new AIConfigError('ai_provider is "gemini" but GOOGLE_API_KEY is not set')
      return new GeminiProvider(apiKey)
    }
  }
}

// Reads the active provider name from `settings` and returns a logging-wrapped
// instance. This is the app's default -- everything in the curator/Wiki
// pipeline calls getActiveProvider(). Evaluation runs are the one place that
// needs to pick a specific provider *independent* of that global setting (to
// compare configurations), so they call getProviderByName() directly instead.
export async function getActiveProvider(
  supabase: SupabaseClient<Database>,
  logContext: LogContext = {}
): Promise<AIProvider> {
  const { data } = await supabase.from('settings').select('value').eq('key', 'ai_provider').single()

  const name = (typeof data?.value === 'string' ? data.value : 'openai') as ProviderName
  return getProviderByName(name, logContext)
}

export function getProviderByName(name: ProviderName, logContext: LogContext = {}): AIProvider {
  if (!KNOWN_PROVIDERS.includes(name)) {
    throw new AIConfigError(`Unknown provider: ${JSON.stringify(name)}`)
  }
  return withLogging(buildProvider(name), logContext)
}
