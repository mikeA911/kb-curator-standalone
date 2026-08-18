import 'server-only'
import { GoogleGenAI } from '@google/genai'
import type {
  AIProvider,
  ChatMessage,
  EmbedInput,
  EmbedResult,
  GenerateChatInput,
  GenerateChatResult,
  GenerateStructuredInput,
  GenerateStructuredResult,
  GenerateTextInput,
  GenerateTextResult,
  ToolCall,
} from './provider'
import type { Content } from '@google/genai'
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

  // Gemini's Content.role only accepts 'user'/'model' (per the SDK's own
  // type comment) -- there is no distinct 'function' role in this API
  // version. A tool result therefore goes back as a 'user'-role Content
  // carrying a functionResponse part, not a separate role.
  async generateChat(input: GenerateChatInput): Promise<GenerateChatResult> {
    const model = input.model ?? this.defaultTextModel
    try {
      const contents: Content[] = input.messages.map((m) => {
        if (m.role === 'user') return { role: 'user', parts: [{ text: m.content }] }
        if (m.role === 'tool') {
          return {
            role: 'user',
            parts: [{ functionResponse: { id: m.toolCallId, name: m.toolName, response: { result: m.content } } }],
          }
        }
        return {
          role: 'model',
          parts: [
            ...(m.content ? [{ text: m.content }] : []),
            ...(m.toolCalls ?? []).map((tc) => ({ functionCall: { id: tc.id, name: tc.name, args: tc.arguments } })),
          ],
        }
      })

      const res = await this.client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: input.system,
          maxOutputTokens: input.maxOutputTokens,
          thinkingConfig: { thinkingBudget: 0 },
          tools: input.tools?.length
            ? [
                {
                  functionDeclarations: input.tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    parametersJsonSchema: t.parameters,
                  })),
                },
              ]
            : undefined,
        },
      })

      const toolCalls: ToolCall[] = (res.functionCalls ?? []).map((fc, i) => ({
        id: fc.id ?? `${fc.name ?? 'call'}-${i}`,
        name: fc.name ?? '',
        arguments: fc.args ?? {},
      }))

      const message: ChatMessage = {
        role: 'assistant',
        content: res.text ?? '',
        ...(toolCalls.length > 0 ? { toolCalls } : {}),
      }

      return {
        message,
        model,
        usage: {
          inputTokens: res.usageMetadata?.promptTokenCount ?? null,
          outputTokens: res.usageMetadata?.candidatesTokenCount ?? null,
        },
      }
    } catch (err) {
      throw new AIProviderError('gemini', 'generate_chat', 'Gemini generateChat failed', err)
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
