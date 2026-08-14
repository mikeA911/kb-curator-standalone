import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { getBrandingUrls, validateIconFile, IconValidationError, LOGO_PATH } from './branding'

describe('getBrandingUrls', () => {
  it('falls back to LOGO_PATH for all four when no branding row exists', async () => {
    const supabase = createFakeSupabase({
      settings: [{ data: null, error: null }],
    }) as never

    const result = await getBrandingUrls(supabase)

    expect(result).toEqual({ logo: LOGO_PATH, icon192: LOGO_PATH, icon512: LOGO_PATH, appleTouchIcon: LOGO_PATH })
  })

  it('derives public URLs from the stored config when a branding row exists', async () => {
    const supabase = createFakeSupabase({
      settings: [
        {
          data: {
            value: {
              sourcePath: 'icons/1-source-logo.png',
              icon192Path: 'icons/1-192.png',
              icon512Path: 'icons/1-512.png',
              appleTouchIconPath: 'icons/1-apple-touch.png',
              updatedAt: '2026-08-14T00:00:00Z',
            },
          },
          error: null,
        },
      ],
    }) as never

    const result = await getBrandingUrls(supabase)

    expect(result.logo).toBe('https://fake.supabase.co/storage/v1/object/public/branding/icons/1-source-logo.png')
    expect(result.icon192).toBe('https://fake.supabase.co/storage/v1/object/public/branding/icons/1-192.png')
    expect(result.icon512).toBe('https://fake.supabase.co/storage/v1/object/public/branding/icons/1-512.png')
    expect(result.appleTouchIcon).toBe('https://fake.supabase.co/storage/v1/object/public/branding/icons/1-apple-touch.png')
  })
})

describe('validateIconFile', () => {
  it('accepts a valid PNG under the size cap', () => {
    const file = new File([new Uint8Array(1024)], 'logo.png', { type: 'image/png' })
    expect(() => validateIconFile(file)).not.toThrow()
  })

  it('rejects an unsupported MIME type', () => {
    const file = new File([new Uint8Array(1024)], 'logo.gif', { type: 'image/gif' })
    expect(() => validateIconFile(file)).toThrow(IconValidationError)
  })

  it('rejects a file over the size cap', () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], 'logo.png', { type: 'image/png' })
    expect(() => validateIconFile(file)).toThrow(IconValidationError)
  })

  it('rejects an empty file', () => {
    const file = new File([], 'logo.png', { type: 'image/png' })
    expect(() => validateIconFile(file)).toThrow(IconValidationError)
  })
})
