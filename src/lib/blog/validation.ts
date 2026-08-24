// Pure client-side validation for the Blog editor (Stage 2 of
// docs/dev-request-blog-contributor-workflow-and-editorial-placeholders.md).
// This is a UX aid, not the enforcement boundary -- createDraftPost/updatePost
// (src/lib/blog/posts.ts) and blog_posts' RLS remain the real gate, same as
// every other write in this app.

export interface BlogEditorFields {
  title: string
  slug: string
  excerpt: string
  content: string
}

export interface BlogValidationErrors {
  title?: string
  excerpt?: string
  content?: string
  slug?: string
  links?: string
}

export interface BlogValidationResult {
  valid: boolean
  errors: BlogValidationErrors
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
// Matches only the opening "[text](" of a link -- the closing ")" is found
// manually below, so an unclosed link (missing ")") is detected too, not
// just a complete link with a bad destination.
const LINK_OPEN_PATTERN = /\[([^\]]*)\]\(/g
const INCOMPLETE_SNIPPET_LENGTH = 30

function isValidLinkDestination(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  const isRelative = trimmed.startsWith('/')
  const isAnchor = trimmed.startsWith('#')
  const isAbsolute = /^https?:\/\/[^\s]+$/i.test(trimmed)
  const isMailto = /^mailto:[^\s]+@[^\s]+$/i.test(trimmed)
  return isRelative || isAnchor || isAbsolute || isMailto
}

function findMalformedLinks(content: string): string[] {
  const bad: string[] = []
  for (const match of content.matchAll(LINK_OPEN_PATTERN)) {
    const openIndex = match.index
    const afterOpenParen = openIndex + match[0].length
    const closeIndex = content.indexOf(')', afterOpenParen)
    const nextLinkStart = content.indexOf('[', afterOpenParen)

    // No closing ")" at all, or another link starts before this one closes
    // -- either way, this "[text](" never actually completes as a link.
    if (closeIndex === -1 || (nextLinkStart !== -1 && nextLinkStart < closeIndex)) {
      const snippetEnd = Math.min(content.length, afterOpenParen + INCOMPLETE_SNIPPET_LENGTH)
      bad.push(content.slice(openIndex, snippetEnd) + (snippetEnd < content.length && closeIndex === -1 ? '…' : ''))
      continue
    }

    const url = content.slice(afterOpenParen, closeIndex)
    if (!isValidLinkDestination(url)) bad.push(content.slice(openIndex, closeIndex + 1))
  }
  return bad
}

export function validateBlogPostFields(input: BlogEditorFields): BlogValidationResult {
  const errors: BlogValidationErrors = {}

  if (!input.title.trim()) errors.title = 'Title is required.'
  if (!input.excerpt.trim()) errors.excerpt = 'Excerpt is required.'
  if (!input.content.trim()) errors.content = 'Content is required.'

  const slug = input.slug.trim()
  if (slug && !SLUG_PATTERN.test(slug)) {
    errors.slug = 'Slug may only contain lowercase letters, numbers, and single hyphens between words.'
  }

  const malformed = findMalformedLinks(input.content)
  if (malformed.length > 0) {
    errors.links = `Malformed link${malformed.length > 1 ? 's' : ''} -- each link needs a real destination (e.g. https://..., a /path, or #anchor): ${malformed.join(', ')}`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// Cover/inline images are uploaded through their own small forms (see
// BlogPostForm's cover-image field and the "Add image" toolbar panel), not
// through validateBlogPostFields' content-editing fields, so this is a
// standalone check rather than a new BlogValidationErrors key. Required
// whenever an image is actually being attached -- an empty cover-image
// selection just means "no cover image," not a validation failure.
export function validateImageAltText(alt: string): string | undefined {
  return alt.trim() ? undefined : 'Alternative text is required before an image can be inserted or saved.'
}
