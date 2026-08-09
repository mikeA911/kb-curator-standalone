import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'node:fs'

const doc = await PDFDocument.create()
const font = await doc.embedFont(StandardFonts.Helvetica)
const fontSize = 11
const margin = 50
const pageWidth = 612
const pageHeight = 792
const maxWidth = pageWidth - margin * 2

function wrapText(text, size) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function addPage(paragraphs) {
  const page = doc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin
  for (const para of paragraphs) {
    const lines = wrapText(para, fontSize)
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) })
      y -= fontSize + 4
    }
    y -= fontSize // blank line between paragraphs
  }
}

addPage([
  'Chunking Strategies for Retrieval-Augmented Generation',
  'Chunking is the process of splitting source documents into smaller retrieval units before embedding. The chunk size and boundary strategy materially affects retrieval quality.',
  'Fixed-size chunking splits text into uniform windows, typically 300 to 800 words, optionally with overlap between consecutive chunks to preserve context across boundaries.',
  'Semantic chunking instead splits at natural boundaries such as paragraphs, sections, or topic shifts, producing chunks that are more coherent but less predictable in size.',
])

addPage([
  'Chunking Failure Modes',
  'Chunks that are too small lose necessary context and produce fragmented, low-quality retrieval results. Chunks that are too large dilute relevance and increase token cost per retrieved item.',
  'A common failure mode is splitting a chunk in the middle of a critical fact, such as separating a defined term from its definition, which degrades both retrieval and generation quality.',
  'Overlap between adjacent chunks is a common mitigation, trading some storage and embedding cost for reduced boundary-loss risk.',
])

const bytes = await doc.save()
fs.writeFileSync(new URL('./chunking-strategies.pdf', import.meta.url), bytes)
console.log('PDF written')
