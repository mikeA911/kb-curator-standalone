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
}

export interface GenerateStructuredResult<T> {
  data: T
  model: string
  usage: TokenUsage
}

export interface EmbedInput {
  text: string
}

export interface EmbedResult {
  embedding: number[]
  model: string
  dimensions: number
  usage: TokenUsage
}

export class AIProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly operation: 'generate_text' | 'generate_structured' | 'embed',
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}

export interface AIProvider {
  readonly name: string
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>
  generateStructured<T>(input: GenerateStructuredInput<T>): Promise<GenerateStructuredResult<T>>
  embed(input: EmbedInput): Promise<EmbedResult>
}
