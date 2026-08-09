import 'server-only'
import { getDocumentProxy, extractText } from 'unpdf'
import mammoth from 'mammoth'
import type { Parser } from '@/types/database'

export interface ParsedPage {
  pageNumber: number | null // null when the format has no native pagination (docx, txt)
  text: string
}

export interface ParsedDocument {
  parser: Parser
  pages: ParsedPage[]
}

export class ParseError extends Error {
  constructor(
    public readonly parser: Parser,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'ParseError'
  }
}

export function parserForMimeType(mimeType: string): Parser {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (mimeType === 'text/plain') return 'text'
  throw new ParseError('text', `Unsupported MIME type: ${mimeType}`)
}

// Real, server-side extraction -- replaces the old app's "ask an LLM to fetch
// a URL" non-parser. Returns per-page text where the format actually has
// pages (PDF), so chunking can attach a real page number to every chunk.
export async function parseDocument(buffer: Buffer, mimeType: string): Promise<ParsedDocument> {
  const parser = parserForMimeType(mimeType)

  try {
    if (parser === 'pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(buffer))
      const { text } = await extractText(pdf, { mergePages: false })
      return { parser, pages: text.map((pageText, i) => ({ pageNumber: i + 1, text: pageText })) }
    }

    if (parser === 'docx') {
      const { value } = await mammoth.extractRawText({ buffer })
      return { parser, pages: [{ pageNumber: null, text: value }] }
    }

    return { parser, pages: [{ pageNumber: null, text: buffer.toString('utf-8') }] }
  } catch (err) {
    if (err instanceof ParseError) throw err
    throw new ParseError(parser, `Failed to parse ${parser} document`, err)
  }
}
