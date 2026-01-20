import OpenAI from 'openai'
import { createClient } from '../supabase'
import type { FlowiseChunk, FlowiseMetadata } from '../../types'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
})

/**
 * Process document directly with OpenAI
 */
export async function processDocumentWithOpenAI(
  storageUrl: string,
  docType: string,
  filters: string[]
): Promise<FlowiseChunk[]> {
  try {
    // Get filename from URL
    const url = new URL(storageUrl)
    const pathParts = url.pathname.split('/')
    const filename = pathParts[pathParts.length - 1]

    // Download from Supabase
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('documents')
      .download(`uploads/${filename}`)

    if (error || !data) {
      console.error('Error downloading from storage:', error)
      throw new Error('Failed to download document from storage')
    }

    const text = await data.text()

    if (!text || text.trim().length === 0) {
      throw new Error('Document content is empty')
    }

    // Chunk the text
    const chunks = await chunkTextWithOpenAI(text, docType)
    return chunks
  } catch (error) {
    console.error('Error processing document with OpenAI:', error)
    throw error
  }
}

/**
 * Intelligent text chunking using OpenAI
 */
async function chunkTextWithOpenAI(text: string, docType: string): Promise<FlowiseChunk[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert document analyzer. Your task is to intelligently chunk the following ${docType} document text into meaningful, self-contained sections.`
        },
        {
          role: 'user',
          content: `Guidelines for chunking:
1. Each chunk should be a complete, coherent section (300-800 words)
2. Preserve logical document structure
3. Ensure chunks can stand alone
4. Return ONLY a JSON array of chunks with this format:
[
  {
    "index": 0,
    "text": "chunk text here",
    "filtered": false,
    "section_type": "introduction|body|conclusion|etc"
  }
]

Document text:
${text}`
        }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('No content from OpenAI')
    
    const data = JSON.parse(content)
    const chunks = (Array.isArray(data) ? data : data.chunks) as FlowiseChunk[]

    return chunks.map((chunk, idx) => ({
      index: idx,
      text: chunk.text.trim(),
      filtered: false,
      section_type: chunk.section_type || 'body'
    }))
  } catch (error) {
    console.error('Error chunking with OpenAI:', error)
    return fallbackChunking(text)
  }
}

/**
 * Enrich a chunk with metadata using OpenAI
 */
export async function enrichChunkWithOpenAI(
  chunkText: string,
  docType: string
): Promise<FlowiseMetadata> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert document analyzer. Analyze the text chunk and extract key metadata.'
        },
        {
          role: 'user',
          content: `Document Type: ${docType}\n\nText Chunk:\n${chunkText}\n\nReturn JSON with: topic, subtopic, relevance_score (0-1), use_cases (array), key_concepts (array), confidence (0-1).`
        }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('No content from OpenAI')
    
    return JSON.parse(content) as FlowiseMetadata
  } catch (error) {
    console.error('Error enriching with OpenAI:', error)
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
 * Generate vector embedding for text using OpenAI
 */
export async function generateEmbeddingWithOpenAI(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding with OpenAI:', error)
    throw error
  }
}

function fallbackChunking(text: string): FlowiseChunk[] {
  const chunkSize = 1000
  const chunks: FlowiseChunk[] = []
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  let currentChunk = ''
  let chunkIndex = 0

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        index: chunkIndex++,
        text: currentChunk.trim(),
        filtered: false,
        section_type: 'body'
      })
      currentChunk = sentence + '. '
    } else {
      currentChunk += sentence + '. '
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      index: chunkIndex,
      text: currentChunk.trim(),
      filtered: false,
      section_type: 'body'
    })
  }
  return chunks
}
