import { describe, it, expect } from 'vitest'
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, ExternalHyperlink } from 'docx'
import JSZip from 'jszip'
import {
  convertDocxImport,
  convertMarkdownImport,
  convertPlainTextImport,
  checkImportFileBasics,
  BlogImportError,
} from './import'
import { validateBlogPostFields } from './validation'

// Fixtures are generated at test time (docx is a devDependency) rather
// than checked in as binaries -- reproducible, and every fixture's exact
// content is visible right next to the assertions that depend on it.
async function buildRepresentativeDocx(): Promise<Buffer> {
  const doc = new Document({
    numbering: {
      config: [{ reference: 'num1', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: 'start' }] }],
    },
    sections: [
      {
        children: [
          new Paragraph({ text: 'My Test Article', heading: HeadingLevel.TITLE }),
          new Paragraph({ text: 'Section One', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [
              new TextRun('This has '),
              new TextRun({ text: 'bold', bold: true }),
              new TextRun(' and '),
              new TextRun({ text: 'italic', italics: true }),
              new TextRun(' text.'),
            ],
          }),
          new Paragraph({ text: 'First bullet', bullet: { level: 0 } }),
          new Paragraph({ text: 'Second bullet', bullet: { level: 0 } }),
          new Paragraph({ text: 'First numbered', numbering: { reference: 'num1', level: 0 } }),
          new Paragraph({ text: 'Second numbered', numbering: { reference: 'num1', level: 0 } }),
          new Paragraph({
            children: [
              new TextRun('Visit '),
              new ExternalHyperlink({ link: 'https://example.com', children: [new TextRun({ text: 'our site', style: 'Hyperlink' })] }),
            ],
          }),
          new Table({
            rows: [
              new TableRow({
                children: [new TableCell({ children: [new Paragraph('Name')] }), new TableCell({ children: [new Paragraph('Value')] })],
              }),
              new TableRow({
                children: [new TableCell({ children: [new Paragraph('A')] }), new TableCell({ children: [new Paragraph('1')] })],
              }),
            ],
          }),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

async function buildDocxWithImage(): Promise<Buffer> {
  // A real embedded image needs an ImageRun with binary data -- for the
  // counting behaviour, what matters is that mammoth's image converter
  // gets invoked at all, which a full image paragraph exercises the same
  // way a real photograph would.
  const { ImageRun } = await import('docx')
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  )
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: 'Has An Image', heading: HeadingLevel.TITLE }),
          new Paragraph({ text: 'Text after the image reference.' }),
          new Paragraph({ children: [new ImageRun({ data: pngBytes, transformation: { width: 1, height: 1 }, type: 'png' })] }),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

describe('checkImportFileBasics', () => {
  it('accepts supported extensions', () => {
    expect(checkImportFileBasics('article.docx', 1000)).toBe('.docx')
    expect(checkImportFileBasics('article.md', 1000)).toBe('.md')
    expect(checkImportFileBasics('article.markdown', 1000)).toBe('.markdown')
    expect(checkImportFileBasics('article.txt', 1000)).toBe('.txt')
  })

  it('rejects unsupported extensions (.doc, .pdf, .rtf, .html)', () => {
    for (const name of ['article.doc', 'article.pdf', 'article.rtf', 'article.html']) {
      expect(() => checkImportFileBasics(name, 1000)).toThrow(BlogImportError)
    }
  })

  it('rejects an empty file', () => {
    expect(() => checkImportFileBasics('article.docx', 0)).toThrow('No file provided')
  })

  it('rejects a file over the 10MB cap without ever attempting to parse it', () => {
    expect(() => checkImportFileBasics('article.docx', 11 * 1024 * 1024)).toThrow(/exceeds/i)
  })
})

describe('convertDocxImport', () => {
  it('converts headings, emphasis, lists, a link, and a table into Markdown, extracting and removing the title', async () => {
    const buffer = await buildRepresentativeDocx()
    const result = await convertDocxImport(buffer, 'my-test-article.docx')

    expect(result.title).toBe('My Test Article')
    expect(result.body).not.toContain('My Test Article')
    expect(result.body).toContain('# Section One')
    expect(result.body).toContain('**bold**')
    expect(result.body).toMatch(/_italic_|\*italic\*/)
    // Turndown pads list markers with extra spaces (e.g. "-   First bullet") --
    // valid, harmless CommonMark, so the assertion matches the marker and
    // text loosely rather than exact spacing.
    expect(result.body).toMatch(/^-\s+First bullet$/m)
    expect(result.body).toMatch(/^1\.\s+First numbered$/m)
    expect(result.body).toContain('[our site](https://example.com)')
    expect(result.body).toContain('| Name | Value |')
    expect(result.stats.headings).toBeGreaterThan(0)
    expect(result.stats.links).toBe(1)
    expect(result.stats.listItems).toBe(4)
    expect(result.stats.tables).toBe(1)
  })

  it('counts embedded images and never emits an image placeholder', async () => {
    const buffer = await buildDocxWithImage()
    const result = await convertDocxImport(buffer, 'with-image.docx')

    expect(result.imageCount).toBe(1)
    expect(result.body).not.toContain('![')
    expect(result.warnings.some((w) => w.message.includes('1 embedded image'))).toBe(true)
  })

  it('falls back to the filename when no title-like heading is found', async () => {
    const doc = new Document({ sections: [{ children: [new Paragraph('Just a plain paragraph, no heading at all.')] }] })
    const buffer = await Packer.toBuffer(doc)

    const result = await convertDocxImport(buffer, 'my-cool-report.docx')
    expect(result.title).toBe('my cool report')
  })

  it('rejects a corrupted file with a clear message, not a raw parser stack trace', async () => {
    const buffer = await buildRepresentativeDocx()
    const corrupted = buffer.subarray(0, Math.floor(buffer.length / 2))

    await expect(convertDocxImport(corrupted, 'broken.docx')).rejects.toThrow(BlogImportError)
    await expect(convertDocxImport(corrupted, 'broken.docx')).rejects.toThrow(/could not be read/i)
  })

  it('rejects a file with no zip signature at all before ever invoking mammoth', async () => {
    const notAZip = Buffer.from('this is definitely not a docx file')
    await expect(convertDocxImport(notAZip, 'fake.docx')).rejects.toThrow(/could not be read/i)
  })

  it('rejects a macro-enabled file (a renamed .docm) before mammoth ever parses it', async () => {
    const buffer = await buildRepresentativeDocx()
    const zip = await JSZip.loadAsync(buffer)
    zip.file('word/vbaProject.bin', Buffer.from('fake macro bytes'))
    const macroBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    await expect(convertDocxImport(macroBuffer, 'renamed.docx')).rejects.toThrow(/macro/i)
  })
})

describe('convertMarkdownImport', () => {
  it('strips a single leading "# Title" line without rewriting the rest of the Markdown', () => {
    const source = '# My Post\n\nSome **existing** Markdown with a [link](https://example.com).\n\n- one\n- two'
    const result = convertMarkdownImport(Buffer.from(source, 'utf-8'), 'my-post.md')

    expect(result.title).toBe('My Post')
    expect(result.body).toBe('Some **existing** Markdown with a [link](https://example.com).\n\n- one\n- two')
  })

  it('falls back to the filename when there is no leading heading', () => {
    const result = convertMarkdownImport(Buffer.from('Just a paragraph.', 'utf-8'), 'notes-from-standup.md')
    expect(result.title).toBe('notes from standup')
  })

  it('throws a clear error for non-UTF-8 content', () => {
    const invalidUtf8 = Buffer.from([0xff, 0xfe, 0x00, 0x80, 0x81])
    expect(() => convertMarkdownImport(invalidUtf8, 'bad-encoding.md')).toThrow(/UTF-8/)
  })

  it('a malicious javascript: link survives conversion unchanged, but is caught by the same validation a manually authored draft goes through', () => {
    const source = '# Title\n\nClick [here](javascript:alert(1)) now.'
    const result = convertMarkdownImport(Buffer.from(source, 'utf-8'), 'malicious.md')

    const validation = validateBlogPostFields({ title: result.title, slug: '', excerpt: result.excerpt || 'x', content: result.body })
    expect(validation.valid).toBe(false)
    expect(validation.errors.links).toBeTruthy()
  })
})

describe('convertPlainTextImport', () => {
  it('preserves blank-line-separated paragraphs', () => {
    const result = convertPlainTextImport(Buffer.from('First paragraph.\n\nSecond paragraph.', 'utf-8'), 'notes.txt')
    expect(result.body).toBe('First paragraph.\n\nSecond paragraph.')
  })

  it('converts a single newline within a block into a Markdown hard break instead of collapsing it', () => {
    const result = convertPlainTextImport(Buffer.from('123 Main St\nSuite 400\nSomewhere, ST 00000', 'utf-8'), 'address.txt')
    expect(result.body).toBe('123 Main St  \nSuite 400  \nSomewhere, ST 00000')
  })

  it('suggests the title from the filename', () => {
    const result = convertPlainTextImport(Buffer.from('Some content.', 'utf-8'), 'quarterly-notes.txt')
    expect(result.title).toBe('quarterly notes')
  })
})
