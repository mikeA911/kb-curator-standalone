import { describe, it, expect, vi } from 'vitest'
import { synthesizeWikiDraft } from './synthesis'
import type { AIProvider } from '@/lib/ai/provider'

const draftFields = {
  title: 'Test Article',
  short_description: 'A short description',
  quick_help: 'Quick help text',
  content: '# Content',
}

function fakeProvider(generateStructured: ReturnType<typeof vi.fn>): AIProvider {
  return { name: 'test-provider', generateStructured } as unknown as AIProvider
}

describe('synthesizeWikiDraft', () => {
  it('caps each chunk\'s evidence text so an oversized chunk cannot balloon the prompt unbounded', async () => {
    const generateStructured = vi.fn().mockResolvedValue({ data: draftFields, model: 'test-model' })
    const oversized = 'x'.repeat(5000)

    await synthesizeWikiDraft(fakeProvider(generateStructured), {
      topic: 'Test',
      category: 'foundations',
      chunks: [{ id: 'c1', text: oversized }],
    })

    const [{ prompt }] = generateStructured.mock.calls[0]
    // Truncated with the ellipsis marker, well under the raw 5000 chars.
    expect(prompt).toContain('…')
    expect(prompt.length).toBeLessThan(oversized.length)
  })

  it('leaves a normal-length chunk untouched', async () => {
    const generateStructured = vi.fn().mockResolvedValue({ data: draftFields, model: 'test-model' })
    const normal = 'A normal-length chunk of evidence text.'

    await synthesizeWikiDraft(fakeProvider(generateStructured), {
      topic: 'Test',
      category: 'foundations',
      chunks: [{ id: 'c1', text: normal }],
    })

    const [{ prompt }] = generateStructured.mock.calls[0]
    expect(prompt).toContain(normal)
    expect(prompt).not.toContain('…')
  })
})
