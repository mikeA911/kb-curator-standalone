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

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  private client: OpenAI

  constructor(
    apiKey: string,
    private defaultTextModel: string = 'gpt-4o-mini',
    private defaultEmbedModel: string = 'text-embedding-3-small'
  ) {
    this.client = new OpenAI({ apiKey })
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const model = input.model ?? this.defaultTextModel
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
      throw new AIProviderError('openai', 'generate_text', 'OpenAI generateText failed', err)
    }
  }

  async generateStructured<T>(input: GenerateStructuredInput<T>): Promise<GenerateStructuredResult<T>> {
    const model = input.model ?? this.defaultTextModel
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
      throw new AIProviderError('openai', 'generate_structured', `OpenAI generateStructured failed to produce valid output: ${raw}`, err)
    }
  }

  async embed(input: EmbedInput): Promise<EmbedResult> {
    const model = input.model ?? this.defaultEmbedModel
    try {
      const res = await this.client.embeddings.create({ model, input: input.text })
      const embedding = res.data[0]?.embedding ?? []
      return {
        embedding,
        model,
        dimensions: embedding.length,
        usage: { inputTokens: res.usage?.prompt_tokens ?? null, outputTokens: null },
      }
    } catch (err) {
      throw new AIProviderError('openai', 'embed', 'OpenAI embed failed', err)
    }
  }
}
