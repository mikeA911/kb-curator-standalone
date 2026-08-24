import 'server-only'
import mammoth from 'mammoth'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import JSZip from 'jszip'

// Blog draft import (docs/dev-request-blog-document-import-for-non-
// technical-authors.md). Pure conversion, no I/O beyond parsing the given
// buffer/text -- the Server Action (src/app/actions/blog.ts) is
// responsible for role checks and for never persisting anything from this
// module directly. No temporary storage anywhere in this file: everything
// is buffer-in/ImportResult-out within one call, so "never retain the
// original document" and "delete the temp copy after conversion" are true
// by construction, not by a separate cleanup step.

export class BlogImportError extends Error {}

export interface ImportWarning {
  message: string
}

export interface ImportStats {
  headings: number
  links: number
  listItems: number
  tables: number
}

export interface ImportResult {
  title: string
  excerpt: string
  stats: ImportStats
  body: string
  warnings: ImportWarning[]
  imageCount: number
}

const MAX_IMPORT_SIZE = 10 * 1024 * 1024
const SUPPORTED_EXTENSIONS = ['.docx', '.md', '.markdown', '.txt']
const DOCX_ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] // "PK\x03\x04"
const EXCERPT_MAX_LENGTH = 300

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  return idx === -1 ? '' : filename.slice(idx).toLowerCase()
}

// Extension allowlist check, run before any parsing. `.docx`'s deeper
// checks (zip signature, macro scan) live in their own functions below --
// this one is shared by every format.
export function checkImportFileBasics(filename: string, size: number): string {
  const ext = getExtension(filename)
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new BlogImportError(`Unsupported file type${ext ? ` "${ext}"` : ''}. Supported formats: .docx, .md, .markdown, .txt`)
  }
  if (size === 0) throw new BlogImportError('No file provided')
  if (size > MAX_IMPORT_SIZE) throw new BlogImportError(`File exceeds ${MAX_IMPORT_SIZE / 1024 / 1024}MB limit`)
  return ext
}

// Checked before mammoth ever touches the buffer -- a `.docm` renamed to
// `.docx` shares the same OOXML zip structure except for a
// word/vbaProject.bin part, so the extension allowlist alone can't catch
// it. Reading just the zip's central directory (via jszip, already a
// mammoth dependency) is cheap and doesn't require parsing any document
// content.
async function checkDocxIsSafe(buffer: Buffer): Promise<void> {
  const hasZipSignature = DOCX_ZIP_SIGNATURE.every((byte, i) => buffer[i] === byte)
  if (!hasZipSignature) {
    throw new BlogImportError('This file could not be read -- it may be corrupted or not a real .docx file.')
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    throw new BlogImportError('This file could not be read -- it may be corrupted or password protected.')
  }

  if (zip.file('word/vbaProject.bin')) {
    throw new BlogImportError('Macro-enabled Word documents are not supported. Save as a macro-free .docx file and try again.')
  }
}

function titleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  const humanized = withoutExt.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return humanized || 'Untitled import'
}

// Splits Markdown into { title, body } by extracting a leading top-level
// heading, per the dev request's "avoid duplicating the selected title as
// both the page title and the first article-body heading." Only the very
// first non-blank line counts as "the title" -- a heading buried deeper in
// the document is left in the body untouched, not guessed at.
function extractLeadingTitle(markdown: string, filename: string, headingPattern: RegExp): { title: string; body: string } {
  const lines = markdown.split('\n')
  let i = 0
  while (i < lines.length && lines[i].trim() === '') i++
  const match = i < lines.length ? lines[i].match(headingPattern) : null
  if (!match) return { title: titleFromFilename(filename), body: markdown }
  const title = match[1].trim()
  const body = lines
    .slice(i + 1)
    .join('\n')
    .replace(/^\n+/, '')
  return { title, body }
}

// A simple regex-based count for the import summary's "number of headings,
// links, lists, and tables recognised" -- not a full Markdown AST walk,
// which would be overkill for a summary line. GFM table rows are detected
// by a leading "|---" separator row, counted once per table rather than
// once per row.
function countStructuralElements(markdown: string): ImportStats {
  const headings = (markdown.match(/^#{1,6}\s+.+$/gm) ?? []).length
  const links = (markdown.match(/\[[^\]]*\]\([^)]+\)/g) ?? []).length
  const listItems = (markdown.match(/^\s*(?:[-*+]|\d+\.)\s+.+$/gm) ?? []).length
  const tables = (markdown.match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/gm) ?? []).length
  return { headings, links, listItems, tables }
}

function extractExcerpt(body: string): string {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const first = paragraphs.find((p) => !p.startsWith('#') && !p.startsWith('!['))
  if (!first) return ''
  const plain = first
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > EXCERPT_MAX_LENGTH ? `${plain.slice(0, EXCERPT_MAX_LENGTH).trim()}…` : plain
}

function buildTurndown(): TurndownService {
  const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' })
  turndownService.use(gfm)
  // Images are never imported (dev request: "do not automatically extract
  // or publish images embedded in Word files... do not insert broken
  // image placeholders"). mammoth's imgElement always emits an <img> tag
  // regardless of what the convertImage handler returns, so the only
  // reliable way to guarantee no "![alt]()" placeholder ever reaches the
  // body is to drop every img element at the turndown-rule level -- the
  // imageCount is tracked separately via the convertImage handler itself.
  turndownService.addRule('stripImages', { filter: 'img', replacement: () => '' })
  // mammoth wraps every table cell's content in its own <p>, which
  // turndown's default paragraph rule pads with blank lines -- harmless
  // outside a table, but it breaks a GFM table row (each row must stay on
  // one line). A table cell's paragraph should just be its inline content.
  turndownService.addRule('tableCellParagraph', {
    filter: (node) => node.nodeName === 'P' && ['TD', 'TH'].includes((node.parentNode as { nodeName?: string })?.nodeName ?? ''),
    replacement: (content) => content,
  })
  return turndownService
}

// turndown-plugin-gfm only converts a <table> to GFM syntax when its first
// row is already made of <th> cells (see isHeadingRow in
// turndown-plugin-gfm) -- otherwise it keeps the table as raw HTML, which
// this app's Markdown renderer (no rehype-raw) would then show as literal
// escaped text, not a table. mammoth never emits <th> itself (it has no
// header-row detection at all), so without this step no docx table would
// ever convert to GFM syntax. Treating a table's first row as its header
// is the same "simple tables" assumption the dev request's own examples
// use, and matches how most Word tables are actually authored.
function promoteFirstTableRowToHeader(html: string): string {
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (tableMatch, inner: string) => {
    const firstRowMatch = inner.match(/<tr>[\s\S]*?<\/tr>/)
    if (!firstRowMatch) return tableMatch
    const original = firstRowMatch[0]
    const promoted = original.replace(/<td(\s[^>]*)?>/g, (_m, attrs) => `<th${attrs ?? ''}>`).replace(/<\/td>/g, '</th>')
    return tableMatch.replace(original, promoted)
  })
}

// .docx: mammoth.convertToHtml -> turndown -> Markdown. mammoth's own
// `messages` already report unsupported/simplified content (footnotes,
// comments, Track Changes markers, unrecognised styles) as structured
// warnings -- no custom detection needed for most of the dev request's
// "unsupported features produce understandable warnings" requirement.
export async function convertDocxImport(buffer: Buffer, filename: string): Promise<ImportResult> {
  await checkDocxIsSafe(buffer)

  let imageCount = 0
  const { value: html, messages } = await mammoth.convertToHtml(
    { buffer },
    {
      // Word's "Title" paragraph style has no built-in mammoth mapping --
      // without this it becomes a plain <p>, and the title-extraction step
      // below would miss it entirely and fall back to the filename, even
      // though the dev request explicitly names "the Word title style" as
      // the first thing to check.
      styleMap: ["p[style-name='Title'] => h1:fresh"],
      // mammoth's own types require `src`, even though it's discarded --
      // every <img> this produces is stripped by the turndown rule below
      // regardless of its attributes, so an empty src is harmless.
      convertImage: mammoth.images.imgElement(async () => {
        imageCount++
        return { src: '' }
      }),
    }
  )

  const rawMarkdown = buildTurndown().turndown(promoteFirstTableRowToHeader(html))
  const { title, body } = extractLeadingTitle(rawMarkdown, filename, /^#{1,2}\s+(.+)$/)
  const excerpt = extractExcerpt(body)

  const warnings: ImportWarning[] = messages
    .filter((m) => m.type === 'warning' || m.type === 'error')
    .map((m) => ({ message: m.message }))
  if (imageCount > 0) {
    warnings.push({
      message: `${imageCount} embedded image${imageCount > 1 ? 's were' : ' was'} found and not imported. Use the cover image field or the "Add image" toolbar button to add approved images after saving.`,
    })
  }

  return { title, excerpt, stats: countStructuralElements(body), body, warnings, imageCount }
}

function decodeUtf8(buffer: Buffer): string {
  const text = buffer.toString('utf-8')
  // toString('utf-8') never throws on Node -- invalid byte sequences
  // become U+FFFD replacement characters instead. That's the signal a
  // real decode failure occurred, since legitimate Markdown/text content
  // essentially never contains one.
  if (text.includes('�')) {
    throw new BlogImportError('This file could not be read as UTF-8 text. Save it as UTF-8 and try again.')
  }
  return text
}

// .md/.markdown: no rewriting of valid supported Markdown, per the dev
// request -- only a single leading "# Title" line is stripped (a common
// convention), everything else passes through untouched.
export function convertMarkdownImport(buffer: Buffer, filename: string): ImportResult {
  const text = decodeUtf8(buffer)
  const { title, body } = extractLeadingTitle(text, filename, /^#\s+(.+)$/)
  const excerpt = extractExcerpt(body)
  return { title, excerpt, stats: countStructuralElements(body), body, warnings: [], imageCount: 0 }
}

// .txt: blank-line-separated blocks are already valid Markdown paragraphs.
// A single (non-blank) newline within a block is converted to a Markdown
// hard break (trailing two spaces) so an intentional line break (e.g. an
// address block) survives instead of being silently collapsed into one
// line by CommonMark's normal "single newline is a soft wrap" rule.
export function convertPlainTextImport(buffer: Buffer, filename: string): ImportResult {
  const text = decodeUtf8(buffer)
  const body = text
    .split(/\n{2,}/)
    .map((block) => block.split('\n').join('  \n'))
    .join('\n\n')
    .trim()
  const excerpt = extractExcerpt(body)
  return { title: titleFromFilename(filename), excerpt, stats: countStructuralElements(body), body, warnings: [], imageCount: 0 }
}
