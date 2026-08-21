import { describe, it, expect } from 'vitest'
import { validateSharedLinkUrl, normalizeUrlForDuplicateDetection } from './url-safety'

describe('validateSharedLinkUrl', () => {
  it('accepts a plain https URL, returning it unchanged (trimmed)', () => {
    expect(validateSharedLinkUrl('  https://example.com/paper  ')).toBe('https://example.com/paper')
  })

  it('accepts http, for deliberately-supported local/internal links', () => {
    expect(validateSharedLinkUrl('http://internal.example.com/notes')).toBe('http://internal.example.com/notes')
  })

  it('rejects executable/local schemes', () => {
    expect(() => validateSharedLinkUrl('javascript:alert(1)')).toThrow('Only http(s)')
    expect(() => validateSharedLinkUrl('data:text/html,<script>alert(1)</script>')).toThrow('Only http(s)')
    expect(() => validateSharedLinkUrl('file:///etc/passwd')).toThrow('Only http(s)')
    expect(() => validateSharedLinkUrl('chrome-extension://abc/page.html')).toThrow('Only http(s)')
  })

  it('rejects embedded credentials', () => {
    expect(() => validateSharedLinkUrl('https://user:pass@example.com')).toThrow('embedded credentials')
  })

  it('rejects an empty or missing value', () => {
    expect(() => validateSharedLinkUrl('')).toThrow('required')
    expect(() => validateSharedLinkUrl('   ')).toThrow('required')
  })

  it('rejects a malformed URL', () => {
    expect(() => validateSharedLinkUrl('not a url')).toThrow('valid URL')
  })

  it('rejects a URL exceeding the length cap', () => {
    const huge = `https://example.com/${'a'.repeat(2100)}`
    expect(() => validateSharedLinkUrl(huge)).toThrow('exceeds')
  })
})

describe('normalizeUrlForDuplicateDetection', () => {
  it('lowercases the host', () => {
    expect(normalizeUrlForDuplicateDetection('https://Example.COM/Path')).toBe('example.com/Path')
  })

  it('strips a trailing slash', () => {
    expect(normalizeUrlForDuplicateDetection('https://example.com/path/')).toBe('example.com/path')
  })

  it('strips the default port for the URL scheme', () => {
    expect(normalizeUrlForDuplicateDetection('https://example.com:443/path')).toBe('example.com/path')
  })

  it('keeps a non-default port', () => {
    expect(normalizeUrlForDuplicateDetection('https://example.com:8443/path')).toBe('example.com:8443/path')
  })

  it('drops the fragment but keeps the query string', () => {
    expect(normalizeUrlForDuplicateDetection('https://example.com/path?x=1#section')).toBe('example.com/path?x=1')
  })

  it('treats two differently-cased/trailing-slash URLs as the same normalized form', () => {
    const a = normalizeUrlForDuplicateDetection('https://Example.com/Paper/')
    const b = normalizeUrlForDuplicateDetection('https://example.com/Paper')
    expect(a).toBe(b)
  })
})
