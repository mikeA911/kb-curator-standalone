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

// gemini-2.0-flash was shut down 2026-06-01 (confirmed against a live 404,
// not assumed). gemini-2.5-flash is valid but itself scheduled to shut down
// 2026-10-16; gemini-3.5-flash (released 2026-05-19) has no announced
// shutdown date as of this writing, so it's the more durable pick rather
// than trading one near-term deprecation for another.
const TEXT_MODEL = 'gemini-3.5-flash'
// text-embedding-004 was shut down by Google on 2026-01-14; gemini-embedding-001
// is the replacement (confirmed against a live 404 from the API, not assumed --
// see the AGENTS.md warning that library APIs in this repo's environment may
// have moved past this model's training-data knowledge).
const EMBED_MODEL = 'gemini-embedding-001'
// gemini-embedding-001's native output is much larger than the old model's;
// pin it down to match kb_vectors/wiki_vectors' vector(1536) column instead of
// letting it default to a size Postgres would reject on insert.
const EMBED_DIMENSIONS = 1536

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'
  private client: GoogleGenAI

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    try {
      const res = await this.client.models.generateContent({
        model: TEXT_MODEL,
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
        model: TEXT_MODEL,
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
    let raw = '{}'
    try {
      const res = await this.client.models.generateContent({
        model: TEXT_MODEL,
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
        model: TEXT_MODEL,
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
    try {
      const res = await this.client.models.embedContent({
        model: EMBED_MODEL,
        contents: [input.text],
        config: { outputDimensionality: EMBED_DIMENSIONS },
      })
      const embedding = res.embeddings?.[0]?.values ?? []
      return {
        embedding,
        model: EMBED_MODEL,
        dimensions: embedding.length,
        usage: { inputTokens: null, outputTokens: null },
      }
    } catch (err) {
      throw new AIProviderError('gemini', 'embed', 'Gemini embed failed', err)
    }
  }
}
