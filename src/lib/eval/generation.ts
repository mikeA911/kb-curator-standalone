import 'server-only'
import type { AIProvider } from '@/lib/ai/provider'
import type { RetrievedEvidenceItem } from '@/types/database'

export interface GenerationResult {
  answer: string
  model: string
  inputTokens: number | null
  outputTokens: number | null
}

// Deliberately just retrieve() -> generate(), no agent loop, no query
// rewriting, no retry -- that's Milestone 4's graph. This is the
// deterministic pipeline the brief asks for.
export async function generateAnswer(
  provider: AIProvider,
  model: string,
  question: string,
  evidence: RetrievedEvidenceItem[]
): Promise<GenerationResult> {
  const evidenceBlock = evidence
    .map((item, i) => `[${i + 1}] (${item.type}: ${item.title})\n${item.content}`)
    .join('\n\n')

  const result = await provider.generateText({
    model,
    system:
      'You are answering a question using only the supplied evidence. Do not use outside knowledge. ' +
      'If the evidence is insufficient to answer confidently, say so explicitly rather than guessing.',
    prompt: `Question: ${question}\n\nEvidence:\n${evidenceBlock || '(no evidence retrieved)'}\n\nAnswer the question using only the evidence above.`,
  })

  return {
    answer: result.text,
    model: result.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  }
}
