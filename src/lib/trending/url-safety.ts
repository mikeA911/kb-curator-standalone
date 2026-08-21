import 'server-only'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const MAX_URL_LENGTH = 2048

// Rejects javascript:/data:/file:/browser-extension/etc. schemes, embedded
// credentials, malformed/empty hosts, and oversized input -- the doc's own
// "URL safety" requirements. No dedicated URL-safety utility existed
// anywhere in this codebase before this (confirmed by search) -- this is
// the first one, used by submitTrendingItemAction.
export function validateSharedLinkUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('URL is required')
  if (trimmed.length > MAX_URL_LENGTH) throw new Error(`URL exceeds ${MAX_URL_LENGTH} characters`)

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('Enter a valid URL')
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error('Only http(s) links are allowed')
  }
  if (url.username || url.password) {
    throw new Error('URLs with embedded credentials are not allowed')
  }
  if (!url.hostname) {
    throw new Error('URL is missing a host')
  }

  return url.toString()
}

// For duplicate detection only -- never stored as or substituted for the
// real URL, so a normalization mistake can never silently change what a
// user actually submitted. Lowercases the host, drops the fragment, strips
// a default port and a trailing slash.
export function normalizeUrlForDuplicateDetection(validUrl: string): string {
  const url = new URL(validUrl)
  const host = url.hostname.toLowerCase()
  const port = url.port && !['80', '443'].includes(url.port) ? `:${url.port}` : ''
  const path = url.pathname.replace(/\/+$/, '')
  return `${host}${port}${path}${url.search}`
}
