import { describe, it, expect } from 'vitest'
import { validateBlogImageFile, buildBlogMediaPath, BlogMediaValidationError } from './media'

function fakeFile(size: number, type: string, name = 'photo.png'): File {
  return { size, type, name } as File
}

describe('validateBlogImageFile', () => {
  it('accepts a well-formed png/jpeg/webp under the size limit', () => {
    expect(() => validateBlogImageFile(fakeFile(1024, 'image/png'))).not.toThrow()
    expect(() => validateBlogImageFile(fakeFile(1024, 'image/jpeg'))).not.toThrow()
    expect(() => validateBlogImageFile(fakeFile(1024, 'image/webp'))).not.toThrow()
  })

  it('rejects an empty file', () => {
    expect(() => validateBlogImageFile(fakeFile(0, 'image/png'))).toThrow(BlogMediaValidationError)
  })

  it('rejects a file over the size limit', () => {
    expect(() => validateBlogImageFile(fakeFile(6 * 1024 * 1024, 'image/png'))).toThrow(BlogMediaValidationError)
  })

  it('rejects SVG -- unlike branding icons, Blog media never allows active content', () => {
    expect(() => validateBlogImageFile(fakeFile(1024, 'image/svg+xml'))).toThrow(BlogMediaValidationError)
  })

  it('rejects an unsupported type', () => {
    expect(() => validateBlogImageFile(fakeFile(1024, 'application/pdf'))).toThrow(BlogMediaValidationError)
  })
})

describe('buildBlogMediaPath', () => {
  it('sanitizes the filename and prefixes it with a timestamp for collision resistance', () => {
    const path = buildBlogMediaPath('My Photo (final)!.png')
    expect(path).toMatch(/^posts\/\d+-My_Photo__final__\.png$/)
  })
})
