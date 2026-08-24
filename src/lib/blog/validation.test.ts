import { describe, it, expect } from 'vitest'
import { validateBlogPostFields, validateImageAltText } from './validation'

const valid = { title: 'A title', slug: 'a-title', excerpt: 'An excerpt', content: 'Some content.' }

describe('validateBlogPostFields', () => {
  it('accepts a fully filled-in, well-formed post', () => {
    expect(validateBlogPostFields(valid)).toEqual({ valid: true, errors: {} })
  })

  it('flags a missing title', () => {
    const result = validateBlogPostFields({ ...valid, title: '  ' })
    expect(result.valid).toBe(false)
    expect(result.errors.title).toBeTruthy()
  })

  it('flags a missing excerpt', () => {
    const result = validateBlogPostFields({ ...valid, excerpt: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.excerpt).toBeTruthy()
  })

  it('flags missing content', () => {
    const result = validateBlogPostFields({ ...valid, content: '   ' })
    expect(result.valid).toBe(false)
    expect(result.errors.content).toBeTruthy()
  })

  it('does not require a slug -- an empty slug is filled in from the title at save time', () => {
    const result = validateBlogPostFields({ ...valid, slug: '' })
    expect(result.valid).toBe(true)
  })

  it('flags an invalid slug (uppercase, spaces, or other disallowed characters)', () => {
    expect(validateBlogPostFields({ ...valid, slug: 'Not A Slug' }).errors.slug).toBeTruthy()
    expect(validateBlogPostFields({ ...valid, slug: 'bad_slug!' }).errors.slug).toBeTruthy()
    expect(validateBlogPostFields({ ...valid, slug: '-leading-hyphen' }).errors.slug).toBeTruthy()
  })

  it('accepts a well-formed slug', () => {
    expect(validateBlogPostFields({ ...valid, slug: 'a-good-slug-123' }).errors.slug).toBeUndefined()
  })

  it('accepts absolute, relative, anchor, and mailto links', () => {
    const content = 'See [docs](https://example.com/docs), [home](/), [section](#section), or [email](mailto:a@b.com).'
    expect(validateBlogPostFields({ ...valid, content }).errors.links).toBeUndefined()
  })

  it('flags a link with no destination', () => {
    const result = validateBlogPostFields({ ...valid, content: 'Broken [link]().' })
    expect(result.valid).toBe(false)
    expect(result.errors.links).toContain('[link]()')
  })

  it('flags a link whose destination is not a recognised URL form', () => {
    const result = validateBlogPostFields({ ...valid, content: 'Broken [link](not a url).' })
    expect(result.valid).toBe(false)
    expect(result.errors.links).toBeTruthy()
  })

  it('flags a structurally incomplete link with no closing parenthesis', () => {
    const result = validateBlogPostFields({ ...valid, content: 'See [broken link](not a url' })
    expect(result.valid).toBe(false)
    expect(result.errors.links).toContain('[broken link](not a url')
  })

  it('flags an incomplete link even when a later, well-formed link follows it', () => {
    const result = validateBlogPostFields({ ...valid, content: 'First [broken link](oops then [second link](https://example.com).' })
    expect(result.valid).toBe(false)
    expect(result.errors.links).toBeTruthy()
  })

  it('does not flag plain bracketed text that is not attempting to be a link', () => {
    const result = validateBlogPostFields({ ...valid, content: 'A [note] in brackets, not a link.' })
    expect(result.errors.links).toBeUndefined()
  })

  it('reports every invalid field at once, not just the first', () => {
    const result = validateBlogPostFields({ title: '', slug: 'Bad Slug', excerpt: '', content: '' })
    expect(Object.keys(result.errors).sort()).toEqual(['content', 'excerpt', 'slug', 'title'])
  })
})

describe('validateImageAltText', () => {
  it('requires non-empty alt text', () => {
    expect(validateImageAltText('')).toBeTruthy()
    expect(validateImageAltText('   ')).toBeTruthy()
  })

  it('accepts real alt text', () => {
    expect(validateImageAltText('A diagram of the pipeline')).toBeUndefined()
  })
})
