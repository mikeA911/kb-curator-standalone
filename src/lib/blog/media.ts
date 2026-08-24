import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const BLOG_MEDIA_BUCKET = 'blog-media'

export class BlogMediaValidationError extends Error {}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
// Deliberately excludes image/svg+xml (unlike branding's icon allowlist) --
// the dev request requires preventing SVG or other active content in Blog
// media unless a separate sanitisation design is approved.
const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// Server-side gate on an uploaded cover/inline image -- the file input's
// `accept` attribute is a UX hint only, never a security boundary. Mirrors
// validateIconFile (src/lib/branding.ts).
export function validateBlogImageFile(file: File): void {
  if (file.size === 0) throw new BlogMediaValidationError('No file provided')
  if (file.size > MAX_IMAGE_SIZE) throw new BlogMediaValidationError(`File exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit`)
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) throw new BlogMediaValidationError(`Unsupported file type: ${file.type}`)
}

function sanitize(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_')
}

// Timestamp-prefixed path is the collision-resistance mechanism (same
// scheme as branding's icon paths and the documents bucket's uploads/
// paths) -- the original filename is never trusted as a storage path on
// its own.
export function buildBlogMediaPath(filename: string): string {
  return `posts/${Date.now()}-${sanitize(filename)}`
}

// Public URL is derived at read time via getPublicUrl (a pure string
// construction, no network call) -- only the path is ever stored, so this
// survives a Supabase project URL change. Mirrors getBrandingUrls.
export function getBlogMediaUrl(supabase: SupabaseClient<Database>, path: string): string {
  return supabase.storage.from(BLOG_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

export { BLOG_MEDIA_BUCKET }
