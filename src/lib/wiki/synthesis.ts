import 'server-only'
import { z } from 'zod'
import type { AIProvider } from '@/lib/ai/provider'

const WikiDraftSchema = z.object({
  title: z.string(),
  short_description: z.string(),
  quick_help: z.string(),
  content: z.string(),
  implementation_notes: z.string().optional(),
  limitations: z.string().optional(),
})

export type WikiDraftProposal = z.infer<typeof WikiDraftSchema> & { model: string }

export interface SourceChunkInput {
  id: string
  text: string
  sourcePage?: number | null
  documentName?: string | null
}

// Pure synthesis step: approved chunks in, a structured draft out. Never
// touches the database and never sets a status beyond what the caller does
// with the result -- persistence always lands as a draft version (see
// createAIAssistedDraftVersion in articles.ts), and nothing here can publish
// canonical knowledge on its own.
export async function synthesizeWikiDraft(
  provider: AIProvider,
  input: { topic: string; category: string; chunks: SourceChunkInput[] }
): Promise<WikiDraftProposal> {
  const evidence = input.chunks
    .map((c, i) => `[Source ${i + 1}${c.documentName ? ` -- ${c.documentName}` : ''}${c.sourcePage ? `, page ${c.sourcePage}` : ''}]\n${c.text}`)
    .join('\n\n')

  const { data, model } = await provider.generateStructured({
    system:
      'You are an AI-engineering technical writer producing a draft Wiki article for a knowledge curation platform. ' +
      'Write only from the provided source evidence -- do not invent facts, and note when the evidence is incomplete. ' +
      'This draft will be reviewed by a human curator before anything is published; be precise and flag uncertainty rather than smoothing it over.',
    prompt:
      `Topic: ${input.topic}\nCategory: ${input.category}\n\nSource evidence:\n${evidence}\n\n` +
      'Produce a structured Wiki draft as JSON with fields:\n' +
      '- title: article title\n' +
      '- short_description: one sentence, shown in article listings\n' +
      '- quick_help: 1-3 sentences suitable for a contextual "?" help tooltip in the application UI\n' +
      '- content: a markdown document with headings for: What it is / Why it matters / How it works / Architecture / ' +
      'When to use it / When not to use it / Failure modes / Evaluation / Governance considerations / Practical experiment. ' +
      'Only include what the evidence supports; say so explicitly under a heading if evidence is thin.\n' +
      '- implementation_notes: practical notes for someone implementing this (optional)\n' +
      '- limitations: known limitations or open questions (optional)',
    schema: WikiDraftSchema,
    // Left unset, some providers truncate before the closing brace on a full
    // article-length response (observed live: content alone can run several
    // thousand words, more so when synthesizing from a whole workstream
    // artifact rather than a short chunk) -- the model then produces
    // well-formed-but-incomplete JSON that fails to parse.
    maxOutputTokens: 8192,
  })

  return { ...data, model }
}
