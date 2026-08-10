import 'server-only'
import { GoogleGenAI } from '@google/genai'
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

// gemini-embedding-001's native output is much larger than older models';
// pin it down to match kb_vectors/wiki_vectors' vector(1536) column instead
// of letting it default to a size Postgres would reject on insert.
const DEFAULT_EMBED_DIMENSIONS = 1536

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'
  private client: GoogleGenAI

  constructor(
    apiKey: string,
    private defaultTextModel: string = 'gemini-3.5-flash',
    private defaultEmbedModel: string = 'gemini-embedding-001',
    private embedDimensions: number = DEFAULT_EMBED_DIMENSIONS
  ) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const model = input.model ?? this.defaultTextModel
    try {
      const res = await this.client.models.generateContent({
        model,
        contents: input.prompt,
        config: {
          systemInstruction: input.system,
          maxOutputTokens: input.maxOutputTokens,
          // Observed live: with thinking left on its default (AUTOMATIC),
          // this model spends part of maxOutputTokens on invisible reasoning
          // and can truncate the actual answer before it finishes. Disabled
          // since these calls need a direct answer, not shown reasoning.
          thinkingConfig: { thinkingBudget: 0 },
        },
      })
      return {
        text: res.text ?? '',
        model,
        usage: {
          inputTokens: res.usageMetadata?.promptTokenCount ?? null,
          outputTokens: res.usageMetadata?.candidatesTokenCount ?? null,
        },
      }
    } catch (err) {
      throw new AIProviderError('gemini', 'generate_text', 'Gemini generateText failed', err)
    }
  }

  async generateStructured<T>(input: GenerateStructuredInput<T>): Promise<GenerateStructuredResult<T>> {
    const model = input.model ?? this.defaultTextModel
    let raw = '{}'
    try {
      const res = await this.client.models.generateContent({
        model,
        contents: `${input.prompt}\n\nRespond with a single JSON object only, no prose, no markdown fences.`,
        config: {
          systemInstruction: input.system,
          responseMimeType: 'application/json',
          maxOutputTokens: input.maxOutputTokens,
          // See generateText's comment -- this is what was actually causing
          // the truncated-JSON failures observed against the live API.
          thinkingConfig: { thinkingBudget: 0 },
        },
      })
      raw = res.text ?? '{}'
      const data = input.schema.parse(extractJsonObject(raw))
      return {
        data,
        model,
        usage: {
          inputTokens: res.usageMetadata?.promptTokenCount ?? null,
          outputTokens: res.usageMetadata?.candidatesTokenCount ?? null,
        },
      }
    } catch (err) {
      throw new AIProviderError('gemini', 'generate_structured', `Gemini generateStructured failed to produce valid output: ${raw}`, err)
    }
  }

  async embed(input: EmbedInput): Promise<EmbedResult> {
    const model = input.model ?? this.defaultEmbedModel
    try {
      const res = await this.client.models.embedContent({
        model,
        contents: [input.text],
        config: { outputDimensionality: this.embedDimensions },
      })
      const embedding = res.embeddings?.[0]?.values ?? []
      return {
        embedding,
        model,
        dimensions: embedding.length,
        usage: { inputTokens: null, outputTokens: null },
      }
    } catch (err) {
      throw new AIProviderError('gemini', 'embed', 'Gemini embed failed', err)
    }
  }
}
