import { describe, it, expect } from 'vitest'
import { applyToolbarAction, insertInlineImage } from './editor-toolbar'

describe('insertInlineImage', () => {
  // Block-safe: an image needs a blank line on each side unless one
  // already exists, or it's at the true start/end of the document.
  // Regression: inserting at the very start of "## Heading" content used
  // to produce "![alt](url)## Heading" on one line, so Preview rendered
  // the "##" as literal text instead of a heading.

  it('regression case: inserting at the start of heading content adds a separating blank line', () => {
    const result = insertInlineImage('## Launch regression', { start: 0, end: 0 }, 'alt', 'https://example.com/img.png')
    expect(result.text).toBe('![alt](https://example.com/img.png)\n\n## Launch regression')
  })

  it('mid-line insertion adds blank-line separation on both sides', () => {
    const result = insertInlineImage('Before. After.', { start: 8, end: 8 }, 'A diagram', 'https://example.com/img.png')
    expect(result.text).toBe('Before. \n\n![A diagram](https://example.com/img.png)\n\nAfter.')
    expect(result.selectionStart).toBe(result.selectionEnd)
    expect(result.text.slice(0, result.selectionStart).endsWith(')')).toBe(true)
  })

  it('insertion at the very start of an empty document needs no separators', () => {
    const result = insertInlineImage('', { start: 0, end: 0 }, 'A diagram', 'https://example.com/img.png', 'Figure 1')
    expect(result.text).toBe('![A diagram](https://example.com/img.png "Figure 1")')
  })

  it('insertion at the very end of content adds only a leading separator', () => {
    const result = insertInlineImage('Some text', { start: 9, end: 9 }, 'alt', 'https://example.com/img.png')
    expect(result.text).toBe('Some text\n\n![alt](https://example.com/img.png)')
  })

  it('replacing a selection at the start of the document adds only a trailing separator', () => {
    const result = insertInlineImage('placeholder text', { start: 0, end: 11 }, 'Alt', 'https://x/y.png')
    expect(result.text).toBe('![Alt](https://x/y.png)\n\n text')
  })

  it('does not add extra blank lines when the insertion point is already separated on both sides', () => {
    const text = 'Para one.\n\n\n\nPara two.'
    const result = insertInlineImage(text, { start: 11, end: 11 }, 'alt', 'https://example.com/img.png')
    expect(result.text).toBe('Para one.\n\n![alt](https://example.com/img.png)\n\nPara two.')
  })

  it('tops up an existing single newline to a blank line rather than adding a full two on top', () => {
    const text = 'Line one.\nLine two.'
    const result = insertInlineImage(text, { start: 10, end: 10 }, 'alt', 'https://example.com/img.png')
    // If this were "always add two newlines" rather than "top up to a
    // blank line," the existing single "\n" before the cursor would
    // become three newlines instead of two.
    expect(result.text).toBe('Line one.\n\n![alt](https://example.com/img.png)\n\nLine two.')
  })
})

describe('applyToolbarAction', () => {
  describe('bold', () => {
    it('wraps a selection with **', () => {
      const result = applyToolbarAction('hello world', { start: 6, end: 11 }, 'bold')
      expect(result.text).toBe('hello **world**')
      expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('world')
    })

    it('inserts a placeholder and selects it when nothing is selected', () => {
      const result = applyToolbarAction('hello ', { start: 6, end: 6 }, 'bold')
      expect(result.text).toBe('hello **bold text**')
      expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('bold text')
    })
  })

  describe('italic', () => {
    it('wraps a selection with *', () => {
      const result = applyToolbarAction('one two', { start: 0, end: 3 }, 'italic')
      expect(result.text).toBe('*one* two')
    })
  })

  describe('link', () => {
    it('wraps a selection as [text](https://)', () => {
      const result = applyToolbarAction('see the docs', { start: 4, end: 8 }, 'link')
      expect(result.text).toBe('see [the ](https://)docs')
      expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('the ')
    })

    it('inserts a full link placeholder when nothing is selected', () => {
      const result = applyToolbarAction('', { start: 0, end: 0 }, 'link')
      expect(result.text).toBe('[link text](https://)')
      expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('link text')
    })
  })

  describe('heading', () => {
    it('prefixes the current line with ##', () => {
      const result = applyToolbarAction('My Title', { start: 3, end: 3 }, 'heading')
      expect(result.text).toBe('## My Title')
    })

    it('does not double-prefix a line that already has the heading marker', () => {
      const result = applyToolbarAction('## Already a heading', { start: 5, end: 5 }, 'heading')
      expect(result.text).toBe('## Already a heading')
    })

    it('only prefixes the line the cursor is on, not the whole document', () => {
      const text = 'first line\nsecond line\nthird line'
      const cursor = text.indexOf('second')
      const result = applyToolbarAction(text, { start: cursor, end: cursor }, 'heading')
      expect(result.text).toBe('first line\n## second line\nthird line')
    })
  })

  describe('bulletList', () => {
    it('prefixes every line touched by a multi-line selection', () => {
      const text = 'first\nsecond\nthird'
      const result = applyToolbarAction(text, { start: 0, end: text.length }, 'bulletList')
      expect(result.text).toBe('- first\n- second\n- third')
    })
  })

  describe('numberedList', () => {
    it('prefixes each line with 1.', () => {
      const text = 'a\nb'
      const result = applyToolbarAction(text, { start: 0, end: text.length }, 'numberedList')
      expect(result.text).toBe('1. a\n1. b')
    })
  })

  describe('blockquote', () => {
    it('prefixes the selected line with >', () => {
      const result = applyToolbarAction('quote me', { start: 0, end: 8 }, 'blockquote')
      expect(result.text).toBe('> quote me')
    })
  })
})
