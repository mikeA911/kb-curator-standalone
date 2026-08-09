import type { FlowiseChunk, FlowiseMetadata, FlowiseEmbedResult } from '../../types'

const FLOWISE_URL = import.meta.env.VITE_FLOWISE_URL
const FLOWISE_API_KEY = import.meta.env.VITE_FLOWISE_API_KEY
const FLOW1_ID = import.meta.env.VITE_FLOW1_ID // Document Processor
const FLOW2_ID = import.meta.env.VITE_FLOW2_ID // Metadata Enricher
const FLOW3_OPENAI_ID = import.meta.env.VITE_FLOW3_OPENAI_ID // Vector Embedder OpenAI
const FLOW3_GEMINI_ID = import.meta.env.VITE_FLOW3_GEMINI_ID // Vector Embedder Gemini

interface FlowiseResponse {
  chunks?: FlowiseChunk[]
  metadata?: FlowiseMetadata
  success?: boolean
  vector_id?: string
  error?: string
  text?: string
  topic?: string
  use_cases?: string[]
  [key: string]: unknown // Allow additional properties
}

/**
 * Generic function to call any Flowise flow
 */
async function callFlowise(
  flowId: string,
  data: Record<string, unknown>
): Promise<FlowiseResponse> {
  if (!FLOWISE_URL || !FLOWISE_API_KEY) {
    throw new Error('Flowise configuration missing. Please set NEXT_PUBLIC_FLOWISE_URL and FLOWISE_API_KEY')
  }

  if (!flowId) {
    throw new Error('Flow ID is required')
  }

  const response = await fetch(`${FLOWISE_URL}/api/v1/prediction/${flowId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FLOWISE_API_KEY}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Flowise API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const result = await response.json()
  return result
}

/**
 * Flow 1: Process and chunk document
 *
 * Takes a document URL, processes it with AI, chunks it, and returns filtered chunks.
 *
 * @param storageUrl - Supabase Storage URL of the document
 * @param docType - Document type (fhir, vbc, grants, billing)
 * @param filters - Array of section types to filter out
 * @returns Array of document chunks
 */
export async function processDocument(
  storageUrl: string,
  docType: string,
  filters: string[]
): Promise<FlowiseChunk[]> {
  if (!FLOW1_ID) {
    throw new Error('FLOW1_ID not configured')
  }

  try {
    const result = await callFlowise(FLOW1_ID, {
      question: storageUrl, // Flowise often uses 'question' as input field
      overrideConfig: {
        docType,
        filters,
        documentUrl: storageUrl,
      },
    })

    // Handle different response formats from Flowise
    if (result.chunks && Array.isArray(result.chunks)) {
      return result.chunks
    }

    // If result is a string (sometimes Flowise returns parsed output as string)
    if (typeof result.text === 'string') {
      try {
        const parsed = JSON.parse(result.text)
        if (parsed.chunks) {
          return parsed.chunks
        }
      } catch {
        console.warn('Could not parse Flowise text response as JSON')
      }
    }

    throw new Error('Invalid response from document processor flow')
  } catch (error) {
    console.error('Error processing document:', error)
    throw error
  }
}

/**
 * Flow 2: Enrich chunk with metadata
 *
 * Analyzes a chunk and extracts topic, relevance, use cases, and concepts.
 *
 * @param chunkText - Text content of the chunk
 * @param docType - Document type for context
 * @returns Metadata object
 */
export async function enrichChunk(
  chunkText: string,
  docType: string
): Promise<FlowiseMetadata> {
  if (!FLOW2_ID) {
    throw new Error('FLOW2_ID not configured')
  }

  try {
    const result = await callFlowise(FLOW2_ID, {
      question: chunkText,
      overrideConfig: {
        docType,
        chunkText,
      },
    })

    // Try to extract metadata from various response formats
    if (result.metadata) {
      return result.metadata
    }

    // If result is directly the metadata
    if (result.topic && result.use_cases) {
      return result as unknown as FlowiseMetadata
    }

    // If result is a string (sometimes Flowise returns parsed output as string)
    if (typeof result.text === 'string') {
      try {
        const parsed = JSON.parse(result.text)
        if (parsed.topic || parsed.metadata) {
          return parsed.metadata || parsed
        }
      } catch {
        console.warn('Could not parse Flowise text response as JSON')
      }
    }

    // Return default metadata if parsing fails
    return {
      topic: 'Unknown',
      subtopic: '',
      relevance_score: 0.5,
      use_cases: [],
      key_concepts: [],
      confidence: 0.3,
    }
  } catch (error) {
    console.error('Error enriching chunk:', error)
    // Return default metadata on error instead of throwing
    // This allows processing to continue
    return {
      topic: 'Unknown',
      subtopic: '',
      relevance_score: 0.5,
      use_cases: [],
      key_concepts: [],
      confidence: 0.3,
    }
  }
}

/**
 * Flow 3: Embed and store approved chunk
 *
 * Generates embedding for a chunk and stores it in kb_vectors.
 * Note: This might be handled directly by the app instead of Flowise
 * if we want more control over the embedding process.
 *
 * @param chunkId - UUID of the chunk to embed
 * @param provider - AI provider (gemini or openai)
 * @param curatorNotes - Optional curator notes
 * @returns Success status and vector ID
 */
export async function embedChunk(
  chunkId: string,
  provider: 'gemini' | 'openai',
  curatorNotes?: string
): Promise<FlowiseEmbedResult> {
  const flowId = provider === 'openai' ? FLOW3_OPENAI_ID : FLOW3_GEMINI_ID

  if (!flowId) {
    throw new Error(`FLOW3_${provider.toUpperCase()}_ID not configured`)
  }

  try {
    const result = await callFlowise(flowId, {
      chunkId,
      curatorNotes: curatorNotes || '',
    })

    return {
      success: result.success || false,
      vector_id: result.vector_id,
    }
  } catch (error) {
    console.error('Error embedding chunk:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if Flowise is configured and available
 */
export function isFlowiseConfigured(): boolean {
  return !!(FLOWISE_URL && FLOWISE_API_KEY && FLOW1_ID && FLOW2_ID)
}

/**
 * Test Flowise connection
 */
export async function testFlowiseConnection(): Promise<{
  success: boolean
  message: string
}> {
  if (!isFlowiseConfigured()) {
    return {
      success: false,
      message: 'Flowise is not configured. Please set environment variables.',
    }
  }

  try {
    // Simple ping to check if Flowise is reachable
    const response = await fetch(`${FLOWISE_URL}/api/v1/ping`, {
      headers: {
        Authorization: `Bearer ${FLOWISE_API_KEY}`,
      },
    })

    if (response.ok) {
      return {
        success: true,
        message: 'Flowise connection successful',
      }
    }

    return {
      success: false,
      message: `Flowise returned status ${response.status}`,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
