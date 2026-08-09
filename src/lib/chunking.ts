import type { ParsedDocument } from './parsing'
import type { Parser } from '@/types/database'

export interface Chunk {
  chunkIndex: number
  text: string
  wordCount: number
  sourcePage: number | null
  sourceSection: string | null
  parser: Parser
  charStart: number
  charEnd: number
}

const MIN_WORDS = 300
const MAX_WORDS = 800

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length

// A line reads as a heading if it's short, has no terminal sentence
// punctuation, and isn't itself part of a longer paragraph. Cheap heuristic,
// not a structural parse -- good enough to preserve rough section provenance
// without building a real document-structure parser for Milestone 1.
function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 90) return false
  if (/[.!?]$/.test(trimmed)) return false
  return wordCount(trimmed) <= 12
}

// Deterministic paragraph-accumulation chunker: groups paragraphs into
// MIN_WORDS-MAX_WORDS chunks, carrying page number and the most recent
// detected heading as provenance on every chunk.
export function chunkDocument(parsed: ParsedDocument): Chunk[] {
  const chunks: Chunk[] = []
  let chunkIndex = 0
  let currentSection: string | null = null

  for (const page of parsed.pages) {
    const paragraphs = page.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

    let buffer: string[] = []
    let bufferWords = 0
    let charStart = 0
    let cursor = 0

    const flush = (endCursor: number) => {
      if (buffer.length === 0) return
      const text = buffer.join('\n\n')
      chunks.push({
        chunkIndex: chunkIndex++,
        text,
        wordCount: bufferWords,
        sourcePage: page.pageNumber,
        sourceSection: currentSection,
        parser: parsed.parser,
        charStart,
        charEnd: endCursor,
      })
      buffer = []
      bufferWords = 0
    }

    for (const para of paragraphs) {
      const paraStart = page.text.indexOf(para, cursor)
      cursor = paraStart >= 0 ? paraStart + para.length : cursor + para.length

      if (looksLikeHeading(para)) {
        currentSection = para
        continue
      }

      if (buffer.length === 0) charStart = paraStart >= 0 ? paraStart : charStart
      buffer.push(para)
      bufferWords += wordCount(para)

      if (bufferWords >= MIN_WORDS) {
        flush(cursor)
      }
    }

    if (bufferWords > 0) {
      // Trailing partial chunk: merge into the previous one if it would stay
      // under MAX_WORDS, otherwise keep it as its own (short) final chunk.
      const prev = chunks[chunks.length - 1]
      if (prev && prev.sourcePage === page.pageNumber && prev.wordCount + bufferWords <= MAX_WORDS) {
        prev.text = `${prev.text}\n\n${buffer.join('\n\n')}`
        prev.wordCount += bufferWords
        prev.charEnd = cursor
      } else {
        flush(cursor)
      }
    }
  }

  return chunks
}
