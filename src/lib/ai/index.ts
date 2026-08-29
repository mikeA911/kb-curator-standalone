import 'server-only'

export type { AIProvider } from './provider'
export { AIProviderError, classifyProviderError } from './provider'
export type { ProviderErrorCode } from './provider'
export type { ChatMessage, ToolCall, ToolSpec, GenerateChatInput, GenerateChatResult } from './provider'

// Provider/model resolution now lives in registry.ts (DB-backed registry,
// replacing the old hard-coded 'openai' | 'gemini' switch) -- this file
// stays as the stable import path (`@/lib/ai`) the rest of the app already
// uses.
export {
  AIConfigError,
  toRoleOption,
  listProviders,
  listModels,
  resolveModel,
  getDefaultModel,
  assertModelCapability,
  getProviderByName,
  getActiveProvider,
  getActiveEmbeddingProvider,
  getActiveStructuredOutputProvider,
  getDefaultStructuredOutputModel,
  resolveChatProvider,
  listChatCapableModels,
  listStructuredOutputCapableModels,
} from './registry'
export type { ChatProviderInfo, ChatModelOption } from './registry'

export { AISensitivityError, SENSITIVITY_RANK, getEffectiveSensitivity, assertProviderEligible, evaluatePolicy, withPolicyGate } from './sensitivity'
export type { ContextManifest, ContextManifestEntry, PolicySubject, PolicyDecision } from './sensitivity'
