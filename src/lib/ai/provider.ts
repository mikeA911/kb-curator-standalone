import 'server-only'
import type { z } from 'zod'

// Generic AI provider contract. Nothing here names a specific vendor, model,
// or embedding dimension -- callers get back whatever the active provider
// actually produced (model name, dimensions) and record it as provenance,
// rather than assuming a fixed shape. Swapping OpenAI <-> Gemini <-> a future
// local/OpenAI-compatible provider means writing a new class that implements
// this interface, not touching call sites.

export interface TokenUsage {
  inputTokens: number | null
  outputTokens: number | null
}

export interface GenerateTextInput {
  prompt: string
  system?: string
  maxOutputTokens?: number
  // Overrides the provider instance's constructor-supplied default model --
  // this is what lets an Eval run pick a specific model per call while every
  // other caller (chunk enrichment, Wiki synthesis) keeps using whatever the
  // provider was built with.
  model?: string
}

export interface GenerateTextResult {
  text: string
  model: string
  usage: TokenUsage
}

export interface GenerateStructuredInput<T> {
  prompt: string
  system?: string
  schema: z.ZodType<T>
  maxOutputTokens?: number
  model?: string
}

export interface GenerateStructuredResult<T> {
  data: T
  model: string
  usage: TokenUsage
}

export interface EmbedInput {
  text: string
  model?: string
}

export interface EmbedResult {
  embedding: number[]
  model: string
  dimensions: number
  usage: TokenUsage
}

export type ProviderErrorCode =
  | 'rate_limit'
  | 'quota_exceeded'
  | 'model_unavailable'
  | 'authentication'
  | 'invalid_request'
  | 'unknown'

export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly operation: 'generate_text' | 'generate_structured' | 'embed',
    message: string,
    public readonly cause?: unknown,
    public readonly errorCode: ProviderErrorCode = classifyProviderError(cause)
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}

// Distinguishes *why* a provider call failed from the caught SDK error's
// status/message, so callers (eval failure classification in particular)
// don't have to re-derive this from a generic "request failed" string. Not
// full quota-header telemetry -- just enough to tell "we're rate limited"
// from "this model doesn't exist" from "the API key is wrong".
export function classifyProviderError(err: unknown): ProviderErrorCode {
  const status = (err as { status?: number })?.status
  const message = String((err as { message?: string })?.message ?? err ?? '').toLowerCase()

  if (status === 401 || status === 403 || message.includes('api key') || message.includes('unauthorized')) {
    return 'authentication'
  }
  if (status === 404 || message.includes('does not exist') || message.includes('not found') || message.includes('no longer available')) {
    return 'model_unavailable'
  }
  if (status === 429 || message.includes('rate limit')) {
    return message.includes('quota') || message.includes('credit') ? 'quota_exceeded' : 'rate_limit'
  }
  if (message.includes('quota') || message.includes('insufficient_quota') || message.includes('credit')) {
    return 'quota_exceeded'
  }
  if (status === 400 || message.includes('invalid')) {
    return 'invalid_request'
  }
  return 'unknown'
}

export interface AIProvider {
  readonly name: string
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>
  generateStructured<T>(input: GenerateStructuredInput<T>): Promise<GenerateStructuredResult<T>>
  embed(input: EmbedInput): Promise<EmbedResult>
}
