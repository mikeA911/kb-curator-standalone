// Pure text-transform logic for the Blog editor's small formatting toolbar
// (docs/dev-request-blog-contributor-workflow-and-editorial-placeholders.md,
// Stage 2). Kept separate from BlogPostForm.tsx so it's unit-testable
// without a DOM/component-testing setup, which this codebase doesn't have
// (vitest runs with environment: 'node', *.test.ts only -- see
// vitest.config.ts). The component wires this to a textarea's
// selectionStart/selectionEnd and restores the returned selection after
// the state update commits.

export type ToolbarAction = 'heading' | 'bold' | 'italic' | 'link' | 'bulletList' | 'numberedList' | 'blockquote'

export interface TextSelection {
  start: number
  end: number
}

export interface FormatResult {
  text: string
  selectionStart: number
  selectionEnd: number
}

function wrapSelection(text: string, selection: TextSelection, before: string, after: string, placeholder: string): FormatResult {
  const { start, end } = selection
  const selected = text.slice(start, end)
  if (selected.length > 0) {
    const newText = text.slice(0, start) + before + selected + after + text.slice(end)
    return { text: newText, selectionStart: start + before.length, selectionEnd: start + before.length + selected.length }
  }
  const newText = text.slice(0, start) + before + placeholder + after + text.slice(start)
  return { text: newText, selectionStart: start + before.length, selectionEnd: start + before.length + placeholder.length }
}

// Prefixes every line touched by the selection (or the cursor's own line,
// when nothing is selected) -- the standard behaviour for a small markdown
// toolbar's heading/list/quote buttons. Idempotent per line: a line that
// already carries the exact prefix is left alone rather than double-prefixed.
function prefixLines(text: string, selection: TextSelection, prefix: string): FormatResult {
  const { start, end } = selection
  const blockStart = text.lastIndexOf('\n', start - 1) + 1
  const nextBreak = text.indexOf('\n', Math.max(end - 1, blockStart))
  const blockEnd = nextBreak === -1 ? text.length : nextBreak

  const block = text.slice(blockStart, blockEnd)
  const lines = block.split('\n')
  let addedChars = 0
  const newLines = lines.map((line) => {
    if (line.startsWith(prefix)) return line
    addedChars += prefix.length
    return prefix + line
  })
  const newBlock = newLines.join('\n')
  const newText = text.slice(0, blockStart) + newBlock + text.slice(blockEnd)

  return {
    text: newText,
    selectionStart: start + (lines[0].startsWith(prefix) ? 0 : prefix.length),
    selectionEnd: end + addedChars,
  }
}

// How many "\n" are needed right before/after the insertion point to reach
// a blank-line block boundary. 0 if already at a boundary (true start/end
// of the text, or already adjacent to a blank line), 1 if there's a single
// trailing/leading newline to complete into a blank line, 2 if the
// insertion point is mid-line with no newline at all.
function blockSeparator(adjacent: string, edge: 'start' | 'end'): string {
  if (adjacent.length === 0) return ''
  const newlines = edge === 'start' ? (adjacent.match(/\n*$/)?.[0].length ?? 0) : (adjacent.match(/^\n*/)?.[0].length ?? 0)
  if (newlines >= 2) return ''
  if (newlines === 1) return '\n'
  return '\n\n'
}

// Inserts an uploaded inline image's Markdown at the cursor (replacing any
// current selection), matching the dev request's "automatic insertion of
// uploaded inline images at the current editor position." Alt text is
// required by the caller (the upload panel) before this is ever called --
// this function doesn't itself enforce that, it just formats what it's
// given.
//
// Block-safe: an image is a block-level element, so it needs a blank line
// on each side unless one already exists (or it's at the very start/end of
// the document). Without this, inserting at the start of "## Heading"
// content produced "![alt](url)## Heading" on one line, and Preview
// rendered the "##" as literal paragraph text instead of a heading
// (confirmed live via the Launch-slice regression report).
export function insertInlineImage(text: string, selection: TextSelection, alt: string, url: string, caption?: string): FormatResult {
  const { start, end } = selection
  const before = text.slice(0, start)
  const after = text.slice(end)
  const markdown = caption ? `![${alt}](${url} "${caption}")` : `![${alt}](${url})`
  const prefix = blockSeparator(before, 'start')
  const suffix = blockSeparator(after, 'end')
  const newText = before + prefix + markdown + suffix + after
  const cursor = before.length + prefix.length + markdown.length
  return { text: newText, selectionStart: cursor, selectionEnd: cursor }
}

export function applyToolbarAction(text: string, selection: TextSelection, action: ToolbarAction): FormatResult {
  switch (action) {
    case 'bold':
      return wrapSelection(text, selection, '**', '**', 'bold text')
    case 'italic':
      return wrapSelection(text, selection, '*', '*', 'italic text')
    case 'link':
      return wrapSelection(text, selection, '[', '](https://)', 'link text')
    case 'heading':
      return prefixLines(text, selection, '## ')
    case 'bulletList':
      return prefixLines(text, selection, '- ')
    case 'numberedList':
      return prefixLines(text, selection, '1. ')
    case 'blockquote':
      return prefixLines(text, selection, '> ')
  }
}
