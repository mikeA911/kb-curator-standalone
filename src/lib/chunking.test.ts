import { describe, it, expect } from 'vitest'
import { chunkDocument } from './chunking'
import type { ParsedDocument } from './parsing'

function words(n: number, prefix: string) {
  return Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(' ')
}

describe('chunkDocument', () => {
  it('carries page number and parser through to every chunk', () => {
    const parsed: ParsedDocument = {
      parser: 'pdf',
      pages: [
        { pageNumber: 1, text: `${words(350, 'w')}.` },
        { pageNumber: 2, text: `${words(350, 'x')}.` },
      ],
    }

    const chunks = chunkDocument(parsed)

    expect(chunks.length).toBeGreaterThan(0)
    for (const chunk of chunks) {
      expect(chunk.parser).toBe('pdf')
      expect([1, 2]).toContain(chunk.sourcePage)
    }
    expect(chunks.some((c) => c.sourcePage === 1)).toBe(true)
    expect(chunks.some((c) => c.sourcePage === 2)).toBe(true)
  })

  it('records char offsets that point back into the source page text', () => {
    const pageText = `${words(320, 'w')}.`
    const parsed: ParsedDocument = { parser: 'text', pages: [{ pageNumber: null, text: pageText }] }

    const [chunk] = chunkDocument(parsed)

    expect(chunk.charStart).toBeGreaterThanOrEqual(0)
    expect(chunk.charEnd).toBeGreaterThan(chunk.charStart)
    expect(chunk.charEnd).toBeLessThanOrEqual(pageText.length)
  })

  it('attaches the preceding heading as sourceSection', () => {
    const parsed: ParsedDocument = {
      parser: 'docx',
      pages: [
        {
          pageNumber: null,
          text: `Background\n\n${words(320, 'w')}.`,
        },
      ],
    }

    const [chunk] = chunkDocument(parsed)

    expect(chunk.sourceSection).toBe('Background')
  })

  it('produces no chunks for an empty page', () => {
    const parsed: ParsedDocument = { parser: 'text', pages: [{ pageNumber: null, text: '   ' }] }
    expect(chunkDocument(parsed)).toEqual([])
  })
})
