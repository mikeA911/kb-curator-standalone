import 'server-only'
import OpenAI from 'openai'
import type {
  AIProvider,
  EmbedInput,
  EmbedResult,
  GenerateStructuredInput,
  GenerateStructuredResult,
  GenerateTextInput,
  GenerateTextResult,
} from './provider'
import { AIProviderError } from './provider'
import { extractJsonObject } from './json-extract'

export interface DiscoveredModel {
  id: string
}

// Generic provider for anything implementing the OpenAI chat/completions
// interface -- Groq is just this class pre-configured with Groq's base URL
// (https://api.groq.com/openai/v1); the same class covers any future local
// (vLLM/Ollama-gateway/LM Studio) or enterprise gateway without a new
// implementation, per the brief's "one reusable compatibility layer".
// Reuses the already-installed `openai` package via its `baseURL` option
// rather than a new SDK dependency.
export class OpenAICompatibleProvider implements AIProvider {
  private client: OpenAI

  constructor(
    readonly name: string,
    apiKey: string,
    private baseURL: string,
    private defaultTextModel?: string
  ) {
    this.client = new OpenAI({ apiKey, baseURL })
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const model = this.requireModel(input.model)
    try {
      const res = await this.client.chat.completions.create({
        model,
        messages: [
          ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
          { role: 'user' as const, content: input.prompt },
        ],
        max_completion_tokens: input.maxOutputTokens,
      })
      return {
        text: res.choices[0]?.message?.content ?? '',
        model,
        usage: {
          inputTokens: res.usage?.prompt_tokens ?? null,
          outputTokens: res.usage?.completion_tokens ?? null,
        },
      }
    } catch (err) {
      throw new AIProviderError(this.name, 'generate_text', `${this.name} generateText failed`, err)
    }
  }

  async generateStructured<T>(input: GenerateStructuredInput<T>): Promise<GenerateStructuredResult<T>> {
    const model = this.requireModel(input.model)
    let raw = '{}'
    try {
      const res = await this.client.chat.completions.create({
        model,
        messages: [
          ...(input.system ? [{ role: 'system' as const, content: input.system }] : []),
          { role: 'user' as const, content: `${input.prompt}\n\nRespond with a single JSON object only, no prose, no markdown fences.` },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: input.maxOutputTokens,
      })
      raw = res.choices[0]?.message?.content ?? '{}'
      const data = input.schema.parse(extractJsonObject(raw))
      return {
        data,
        model,
        usage: {
          inputTokens: res.usage?.prompt_tokens ?? null,
          outputTokens: res.usage?.completion_tokens ?? null,
        },
      }
    } catch (err) {
      throw new AIProviderError(this.name, 'generate_structured', `${this.name} generateStructured failed to produce valid output: ${raw}`, err)
    }
  }

  // No OpenAI-compatible generation gateway covered here (Groq included)
  // currently offers embeddings -- fails explicitly rather than silently
  // returning nothing. Capability filtering in the Eval model picker (only
  // model_type='embedding' rows are ever offered for the embedding slot)
  // means this should never actually be reached in normal use; it's the
  // provider-level backstop.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by the AIProvider interface even though this implementation always throws
  async embed(input: EmbedInput): Promise<EmbedResult> {
    throw new AIProviderError(this.name, 'embed', `${this.name} does not support embeddings`, undefined, 'model_unavailable')
  }

  // Best-effort discovery for the admin "Refresh Models" action -- returns
  // what the provider currently lists, never writes anything itself. Not
  // every OpenAI-compatible gateway implements GET /models; a failure here
  // surfaces as a normal thrown error for the caller to handle.
  async listModels(): Promise<DiscoveredModel[]> {
    try {
      const res = await this.client.models.list()
      return res.data.map((m) => ({ id: m.id }))
    } catch (err) {
      throw new AIProviderError(this.name, 'generate_text', `${this.name} model discovery failed`, err)
    }
  }

  private requireModel(model: string | undefined): string {
    const resolved = model ?? this.defaultTextModel
    if (!resolved) {
      throw new AIProviderError(this.name, 'generate_text', `${this.name} call made with no model specified and no default configured`, undefined, 'invalid_request')
    }
    return resolved
  }
}
