import 'server-only'

export type { AIProvider } from './provider'
export { AIProviderError, classifyProviderError } from './provider'
export type { ProviderErrorCode } from './provider'

// Provider/model resolution now lives in registry.ts (DB-backed registry,
// replacing the old hard-coded 'openai' | 'gemini' switch) -- this file
// stays as the stable import path (`@/lib/ai`) the rest of the app already
// uses.
export {
  AIConfigError,
  listProviders,
  listModels,
  resolveModel,
  getDefaultModel,
  assertModelCapability,
  getProviderByName,
  getActiveProvider,
} from './registry'
