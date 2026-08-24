import { describe, it, expect, vi } from 'vitest'
import { generateSubstackPackage } from './substack-export'
import type { BlogPost } from '@/types/database'

const basePost: BlogPost = {
  id: 'post-1',
  slug: 'my-post',
  title: 'My Post',
  excerpt: 'An excerpt',
  content: '## Heading\n\nSome **bold** content with a [link](https://example.com).',
  status: 'published',
  author_id: null,
  last_editor_id: null,
  submitted_for_review_at: null,
  submitted_by: null,
  published_by: null,
  source_reference: null,
  cover_image_path: null,
  cover_image_alt: null,
  published_at: '2026-08-01T00:00:00Z',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
}

const adaptation = {
  substackEditionMarkdown: '## Shorter version\n\nRead the [full article](https://kbsandbox.tech/blog/my-post).',
  tags: ['ai', 'governance'],
  socialPreviewText: 'A short teaser.',
  substackNote: 'Check this out.',
}

describe('generateSubstackPackage', () => {
  it('spells out every schema field name in the prompt (the OpenAI-compatible provider does not forward the zod schema)', async () => {
    const generateStructured = vi.fn().mockResolvedValue({ data: adaptation, model: 'test-model' })

    await generateSubstackPackage({ name: 'groq', generateStructured } as never, basePost, 'https://kbsandbox.tech/blog/my-post')

    const call = generateStructured.mock.calls[0][0]
    for (const field of ['substackEditionMarkdown', 'tags', 'socialPreviewText', 'substackNote']) {
      expect(call.prompt).toContain(field)
    }
  })

  it('includes the canonical URL and full article content in the prompt', async () => {
    const generateStructured = vi.fn().mockResolvedValue({ data: adaptation, model: 'test-model' })

    await generateSubstackPackage({ name: 'groq', generateStructured } as never, basePost, 'https://kbsandbox.tech/blog/my-post')

    const call = generateStructured.mock.calls[0][0]
    expect(call.prompt).toContain('https://kbsandbox.tech/blog/my-post')
    expect(call.prompt).toContain(basePost.content)
  })

  it('renders the full article and Substack edition to HTML with no visible Markdown syntax', async () => {
    const generateStructured = vi.fn().mockResolvedValue({ data: adaptation, model: 'test-model' })

    const result = await generateSubstackPackage({ name: 'groq', generateStructured } as never, basePost, 'https://kbsandbox.tech/blog/my-post')

    for (const html of [result.fullArticleHtml, result.substackEditionHtml]) {
      expect(html).not.toContain('##')
      expect(html).not.toContain('**')
      expect(html).toMatch(/<h\d|<p/)
    }
  })

  it('returns the resolved provider name and model, and never touches the post itself', async () => {
    const generateStructured = vi.fn().mockResolvedValue({ data: adaptation, model: 'test-model' })

    const result = await generateSubstackPackage({ name: 'groq', generateStructured } as never, basePost, 'https://kbsandbox.tech/blog/my-post')

    expect(result.providerName).toBe('groq')
    expect(result.modelUsed).toBe('test-model')
    expect(result.tags).toEqual(['ai', 'governance'])
    expect(result.canonicalUrl).toBe('https://kbsandbox.tech/blog/my-post')
  })

  describe('URL protocol sanitization', () => {
    // This HTML is copied out of KB Sandbox for use on Substack -- it can't
    // rely on the destination editor to sanitize it. Covers both the stored
    // article (fullArticleHtml) and the model-generated adaptation
    // (substackEditionHtml), since both go through the same renderer.
    it('strips javascript: link hrefs from both the article and the model-generated edition', async () => {
      const post = { ...basePost, content: 'Click [here](javascript:alert(1)) to win.' }
      const generateStructured = vi
        .fn()
        .mockResolvedValue({ data: { ...adaptation, substackEditionMarkdown: 'See [this](javascript:alert(2)).' }, model: 'test-model' })

      const result = await generateSubstackPackage({ name: 'groq', generateStructured } as never, post, 'https://kbsandbox.tech/blog/my-post')

      expect(result.fullArticleHtml).not.toContain('javascript:')
      expect(result.substackEditionHtml).not.toContain('javascript:')
    })

    it('strips data: image sources', async () => {
      const post = { ...basePost, content: '![bad](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)' }
      const generateStructured = vi.fn().mockResolvedValue({ data: adaptation, model: 'test-model' })

      const result = await generateSubstackPackage({ name: 'groq', generateStructured } as never, post, 'https://kbsandbox.tech/blog/my-post')

      expect(result.fullArticleHtml).not.toContain('data:')
    })

    it('drops the raw script element -- its text is left inert (not executable) rather than needing to vanish entirely', async () => {
      const post = { ...basePost, content: 'Text<script>alert(1)</script>more text.' }
      const generateStructured = vi.fn().mockResolvedValue({ data: adaptation, model: 'test-model' })

      const result = await generateSubstackPackage({ name: 'groq', generateStructured } as never, post, 'https://kbsandbox.tech/blog/my-post')

      expect(result.fullArticleHtml).not.toContain('<script')
      expect(result.fullArticleHtml).not.toContain('</script>')
    })

    it('keeps safe https, relative, and mailto links intact', async () => {
      const post = {
        ...basePost,
        content: 'See [docs](https://example.com/docs), [home](/), and [email](mailto:a@b.com).',
      }
      const generateStructured = vi.fn().mockResolvedValue({ data: adaptation, model: 'test-model' })

      const result = await generateSubstackPackage({ name: 'groq', generateStructured } as never, post, 'https://kbsandbox.tech/blog/my-post')

      expect(result.fullArticleHtml).toContain('href="https://example.com/docs"')
      expect(result.fullArticleHtml).toContain('href="/"')
      expect(result.fullArticleHtml).toContain('href="mailto:a@b.com"')
    })

    it('keeps safe https images intact', async () => {
      const post = { ...basePost, content: '![A diagram](https://example.com/diagram.png)' }
      const generateStructured = vi.fn().mockResolvedValue({ data: adaptation, model: 'test-model' })

      const result = await generateSubstackPackage({ name: 'groq', generateStructured } as never, post, 'https://kbsandbox.tech/blog/my-post')

      expect(result.fullArticleHtml).toContain('src="https://example.com/diagram.png"')
    })
  })
})
