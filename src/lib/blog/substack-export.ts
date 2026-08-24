import 'server-only'
import { z } from 'zod'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import type { AIProvider } from '@/lib/ai/provider'
import type { BlogPost } from '@/types/database'

// "Clean rich text or HTML suitable for pasting into the Substack editor,
// without visible Markdown heading markers." Next.js's Server Component
// graph refuses to import react-dom/server (the obvious way to reuse
// src/components/shared/Markdown.tsx's JSX output directly), so this uses
// the same remark-parse + remark-gfm parsing pipeline react-markdown
// itself is built on, just swapping the final render target from JSX to
// an HTML string via remark-rehype + rehype-stringify -- the identical
// parse tree and Markdown dialect, not a second interpretation of
// formatting, only a different serializer forced by that constraint.
// rehypeSanitize (default/GitHub schema) blocks javascript:/data: URLs in
// href/src -- this HTML is copied out of KB Sandbox for use on Substack, so
// it can't rely on the destination editor to sanitize it. Confirmed live
// via the Launch-slice regression report that omitting this let
// [x](javascript:...) and ![x](data:...) survive straight into the output.
async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const file = await unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeSanitize).use(rehypeStringify).process(markdown)
  return String(file)
}

const SubstackAdaptationSchema = z.object({
  substackEditionMarkdown: z.string(),
  tags: z.array(z.string()).max(8),
  socialPreviewText: z.string(),
  substackNote: z.string(),
})
type SubstackAdaptation = z.infer<typeof SubstackAdaptationSchema>

export interface SubstackExportPackage {
  fullArticleHtml: string
  substackEditionHtml: string
  tags: string[]
  socialPreviewText: string
  substackNote: string
  canonicalUrl: string
  providerName: string
  modelUsed: string
}

// Pure function: provider + post in, a reviewable package out. Never
// touches blog_posts and never publishes anything -- the caller (the
// Server Action) is responsible for requiring curator/admin role and for
// never writing this back over the original draft, per the dev request's
// "must not write the generated adaptation back over the Blog article
// automatically."
export async function generateSubstackPackage(provider: AIProvider, post: BlogPost, canonicalUrl: string): Promise<SubstackExportPackage> {
  const { data, model } = await provider.generateStructured<SubstackAdaptation>({
    system:
      'You adapt an existing published article for cross-posting on Substack. ' +
      'You never invent facts not present in the source article. The Substack edition must clearly ' +
      'link readers back to the canonical article rather than reproducing it in full.',
    prompt:
      `Canonical article title: ${post.title}\n` +
      `Canonical article URL: ${canonicalUrl}\n\n` +
      `Full article content (Markdown):\n${post.content}\n\n` +
      'Produce a Substack adaptation package as a single JSON object with exactly these fields:\n' +
      '- substackEditionMarkdown: string, Markdown. A shorter adaptation (roughly a third the length of the source) that introduces the argument ' +
      `and explicitly links the reader to the complete original at ${canonicalUrl} using descriptive link text (never "click here"). ` +
      'Do not reproduce the full article verbatim.\n' +
      '- tags: array of strings, at most 8, suggested Substack tags for this article\n' +
      '- socialPreviewText: string, one or two sentences suitable as social-preview/share text\n' +
      '- substackNote: string, a short Substack Note (a few sentences) for sharing the article\n' +
      'Use an empty string or empty array for any field you cannot support from the evidence -- do not omit fields or invent other field names.',
    schema: SubstackAdaptationSchema,
    // Some providers (observed live: Groq's on-demand tier) count prompt
    // tokens plus maxOutputTokens together against a per-minute budget, not
    // just actual usage -- 8192 pushed a short placeholder post over an
    // 8000 TPM limit. 4096 matches generateJournalContent's sibling budget
    // (src/lib/journal/generate.ts) and is still generous for a "roughly a
    // third the length" edition plus a few short fields.
    maxOutputTokens: 4096,
  })

  const [fullArticleHtml, substackEditionHtml] = await Promise.all([
    renderMarkdownToHtml(post.content),
    renderMarkdownToHtml(data.substackEditionMarkdown),
  ])

  return {
    fullArticleHtml,
    substackEditionHtml,
    tags: data.tags,
    socialPreviewText: data.socialPreviewText,
    substackNote: data.substackNote,
    canonicalUrl,
    providerName: provider.name,
    modelUsed: model,
  }
}
