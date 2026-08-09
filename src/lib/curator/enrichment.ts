import 'server-only'
import { z } from 'zod'
import type { AIProvider } from '@/lib/ai/provider'
import type { ChunkAIMetadata } from '@/types/database'

const EnrichmentSchema = z.object({
  topic: z.string(),
  subtopic: z.string().optional(),
  relevance_score: z.number().min(0).max(1),
  use_cases: z.array(z.string()).default([]),
  key_concepts: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
})

// Generic over whichever AIProvider is active -- no OpenAI/Gemini-specific
// code here. A failure propagates to the caller rather than degrading to a
// placeholder value (the old app's enrichChunk always returned a fake
// {topic: 'Unknown', confidence: 0.3} object on error, which hid failures
// from curators; here the caller records it via buildEnrichmentError).
export async function enrichChunk(provider: AIProvider, chunkText: string, docType: string): Promise<ChunkAIMetadata> {
  const { data } = await provider.generateStructured({
    system:
      'You are a knowledge curation assistant. Analyze the given document chunk and produce structured metadata for a human curator to review before it enters a knowledge base.',
    prompt: `Knowledge base: ${docType}\n\nChunk:\n"""\n${chunkText}\n"""\n\nReturn JSON with fields: topic (string), subtopic (string, optional), relevance_score (0-1), use_cases (string[]), key_concepts (string[]), confidence (0-1).`,
    schema: EnrichmentSchema,
  })
  return data
}
