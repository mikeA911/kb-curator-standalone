import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

const requireRoleMock = vi.fn()
const getActiveStructuredOutputProviderMock = vi.fn()
const generateSubstackPackageMock = vi.fn()
const createAdminClientMock = vi.fn()
const convertDocxImportMock = vi.fn()
const convertMarkdownImportMock = vi.fn()
const convertPlainTextImportMock = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return { ...actual, requireRole: (...args: unknown[]) => requireRoleMock(...args) }
})
vi.mock('@/lib/ai', () => ({ getActiveStructuredOutputProvider: (...args: unknown[]) => getActiveStructuredOutputProviderMock(...args) }))
vi.mock('@/lib/blog/substack-export', () => ({ generateSubstackPackage: (...args: unknown[]) => generateSubstackPackageMock(...args) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => createAdminClientMock() }))
vi.mock('@/lib/blog/import', async () => {
  const actual = await vi.importActual<typeof import('@/lib/blog/import')>('@/lib/blog/import')
  return {
    ...actual,
    convertDocxImport: (...args: unknown[]) => convertDocxImportMock(...args),
    convertMarkdownImport: (...args: unknown[]) => convertMarkdownImportMock(...args),
    convertPlainTextImport: (...args: unknown[]) => convertPlainTextImportMock(...args),
  }
})

const {
  createBlogPostAction,
  updateBlogPostAction,
  submitBlogPostForReviewAction,
  returnBlogPostToDraftAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
  deleteBlogPostAction,
  uploadBlogCoverImageAction,
  uploadBlogInlineImageAction,
  linkRelatedBlogPostAction,
  unlinkRelatedBlogPostAction,
  generateSubstackExportAction,
  importBlogDraftAction,
} = await import('./blog')

beforeEach(() => {
  requireRoleMock.mockReset()
  getActiveStructuredOutputProviderMock.mockReset()
  generateSubstackPackageMock.mockReset()
  createAdminClientMock.mockReset()
  convertDocxImportMock.mockReset()
  convertMarkdownImportMock.mockReset()
  convertPlainTextImportMock.mockReset()
})

function fakeImageFile(name = 'photo.png', type = 'image/png', size = 1024) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('createBlogPostAction', () => {
  it('requires curator (or above), not admin-only', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })

    await createBlogPostAction({ title: 'X', slug: '', excerpt: '', content: 'body' })

    expect(requireRoleMock).toHaveBeenCalledWith('curator')
  })

  it('slugifies the title when no slug is given, and stamps the session author as both author and last editor', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })

    await createBlogPostAction({ title: 'My First Post!', slug: '', excerpt: 'why', content: 'body' })

    const insert = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'insert')
    expect(insert?.args).toMatchObject({
      slug: 'my-first-post',
      title: 'My First Post!',
      author_id: 'curator-1',
      last_editor_id: 'curator-1',
      excerpt: 'why',
      content: 'body',
    })
  })

  it('respects an explicit slug over the title-derived one', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })

    await createBlogPostAction({ title: 'My First Post', slug: 'custom-slug', excerpt: '', content: 'body' })

    const insert = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ slug: 'custom-slug' })
  })
})

describe('updateBlogPostAction', () => {
  it('requires curator (or above) and updates the given fields, stamping the last editor', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })

    await updateBlogPostAction('p-1', { title: 'Updated', slug: 'updated', excerpt: '', content: 'new body' })

    expect(requireRoleMock).toHaveBeenCalledWith('curator')
    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toMatchObject({ title: 'Updated', slug: 'updated', excerpt: null, content: 'new body', last_editor_id: 'curator-1' })
  })

  it('rejects when the update is blocked (RLS no-op returns no row)', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-2' }, supabase })

    await expect(updateBlogPostAction('p-1', { title: 'X', slug: 'x', excerpt: '', content: 'body' })).rejects.toThrow("can't be edited right now")
  })
})

describe('submitBlogPostForReviewAction', () => {
  it('requires curator (or above) and stamps submitted_for_review_at/submitted_by', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1' }, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })

    await submitBlogPostForReviewAction('p-1')

    expect(requireRoleMock).toHaveBeenCalledWith('curator')
    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toMatchObject({ submitted_by: 'curator-1' })
  })

  it('rejects when the draft is not eligible for submission', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-2' }, supabase })

    await expect(submitBlogPostForReviewAction('p-1')).rejects.toThrow('not eligible for submission')
  })
})

describe('returnBlogPostToDraftAction', () => {
  it('requires admin and clears submission markers', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await returnBlogPostToDraftAction('p-1')

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toEqual({ submitted_for_review_at: null, submitted_by: null })
  })
})

describe('publishBlogPostAction', () => {
  it('sets status to published and stamps published_at and published_by', async () => {
    // publishPost's update runs first, then getPostById's select (for revalidation).
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: null, error: null },
        { data: { id: 'p-1', slug: 'x' }, error: null },
      ],
    })
    requireRoleMock.mockResolvedValue({ user: { id: 'admin-1' }, supabase })

    await publishBlogPostAction('p-1')

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toMatchObject({ status: 'published', published_by: 'admin-1' })
    expect((update?.args as { published_at: string }).published_at).toBeTruthy()
  })
})

describe('unpublishBlogPostAction', () => {
  it('sets status back to draft and clears published_at, published_by, and stale submission markers', async () => {
    // getPostById's select runs first (to know the slug to revalidate), then unpublishPost's update.
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: { id: 'p-1', slug: 'x' }, error: null },
        { data: null, error: null },
      ],
    })
    requireRoleMock.mockResolvedValue({ supabase })

    await unpublishBlogPostAction('p-1')

    const update = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'update')
    expect(update?.args).toEqual({
      status: 'draft',
      published_at: null,
      published_by: null,
      submitted_for_review_at: null,
      submitted_by: null,
    })
  })
})

describe('uploadBlogCoverImageAction', () => {
  it('requires curator (or above)', async () => {
    requireRoleMock.mockResolvedValue({ supabase: createFakeSupabase({}) })
    const formData = new FormData()

    await expect(uploadBlogCoverImageAction('post-1', formData)).rejects.toThrow()
    expect(requireRoleMock).toHaveBeenCalledWith('curator')
  })

  it('rejects when no file is provided, before ever touching storage', async () => {
    requireRoleMock.mockResolvedValue({ supabase: createFakeSupabase({}) })
    const formData = new FormData()
    formData.set('alt', 'Some alt text')

    await expect(uploadBlogCoverImageAction('post-1', formData)).rejects.toThrow('No file provided')
  })

  it('rejects when alt text is missing, before ever touching storage', async () => {
    requireRoleMock.mockResolvedValue({ supabase: createFakeSupabase({}) })
    const formData = new FormData()
    formData.set('file', fakeImageFile())

    await expect(uploadBlogCoverImageAction('post-1', formData)).rejects.toThrow('Alternative text is required')
  })

  it('rejects an unsupported file type, before ever touching storage', async () => {
    requireRoleMock.mockResolvedValue({ supabase: createFakeSupabase({}) })
    const formData = new FormData()
    formData.set('file', fakeImageFile('icon.svg', 'image/svg+xml'))
    formData.set('alt', 'Some alt text')

    await expect(uploadBlogCoverImageAction('post-1', formData)).rejects.toThrow('Unsupported file type')
  })

  it('deletes the just-uploaded object when the post-row update fails, instead of leaving an orphan', async () => {
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: { id: 'post-1', cover_image_path: null }, error: null }, // getPostById (existing)
        { data: null, error: null }, // setCoverImage blocked -- throws
      ],
    })
    const admin = createFakeSupabase({})
    requireRoleMock.mockResolvedValue({ supabase })
    createAdminClientMock.mockReturnValue(admin)
    const formData = new FormData()
    formData.set('file', fakeImageFile())
    formData.set('alt', 'Some alt text')

    await expect(uploadBlogCoverImageAction('post-1', formData)).rejects.toThrow()

    expect(admin._storageUploadCalls).toHaveLength(1)
    const uploadedPath = admin._storageUploadCalls[0].path
    expect(admin._storageRemoveCalls).toEqual([{ bucket: 'blog-media', paths: [uploadedPath] }])
  })

  it('deletes the previous cover image after successfully replacing it, and never touches the new one', async () => {
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: { id: 'post-1', cover_image_path: 'posts/111-old-cover.png' }, error: null }, // getPostById (existing)
        { data: { id: 'post-1' }, error: null }, // setCoverImage succeeds
      ],
    })
    const admin = createFakeSupabase({})
    requireRoleMock.mockResolvedValue({ supabase })
    createAdminClientMock.mockReturnValue(admin)
    const formData = new FormData()
    formData.set('file', fakeImageFile())
    formData.set('alt', 'Some alt text')

    await uploadBlogCoverImageAction('post-1', formData)

    const uploadedPath = admin._storageUploadCalls[0].path
    expect(admin._storageRemoveCalls).toEqual([{ bucket: 'blog-media', paths: ['posts/111-old-cover.png'] }])
    expect(admin._storageRemoveCalls[0].paths).not.toContain(uploadedPath)
  })

  it('does not attempt to delete a previous cover image when the post had none', async () => {
    const supabase = createFakeSupabase({
      blog_posts: [
        { data: { id: 'post-1', cover_image_path: null }, error: null },
        { data: { id: 'post-1' }, error: null },
      ],
    })
    const admin = createFakeSupabase({})
    requireRoleMock.mockResolvedValue({ supabase })
    createAdminClientMock.mockReturnValue(admin)
    const formData = new FormData()
    formData.set('file', fakeImageFile())
    formData.set('alt', 'Some alt text')

    await uploadBlogCoverImageAction('post-1', formData)

    expect(admin._storageRemoveCalls).toEqual([])
  })
})

describe('uploadBlogInlineImageAction', () => {
  it('requires curator (or above) and validates before touching storage', async () => {
    requireRoleMock.mockResolvedValue({ supabase: createFakeSupabase({}) })
    const formData = new FormData()

    await expect(uploadBlogInlineImageAction(formData)).rejects.toThrow('No file provided')
    expect(requireRoleMock).toHaveBeenCalledWith('curator')
  })
})

describe('linkRelatedBlogPostAction', () => {
  it('requires curator (or above) and rejects an unknown slug', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await expect(linkRelatedBlogPostAction('post-a', 'missing-slug')).rejects.toThrow('No post found')
    expect(requireRoleMock).toHaveBeenCalledWith('curator')
  })

  it('rejects linking a post to itself', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'post-a' }, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await expect(linkRelatedBlogPostAction('post-a', 'self-slug')).rejects.toThrow('cannot be related to itself')
  })

  it('links to a different post found by slug', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'post-b' }, error: null }], blog_relations: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await linkRelatedBlogPostAction('post-a', 'other-slug')

    const insert = supabase._calls.find((c) => c.table === 'blog_relations' && c.method === 'insert')
    expect(insert?.args).toMatchObject({ from_post_id: 'post-a', to_post_id: 'post-b' })
  })
})

describe('unlinkRelatedBlogPostAction', () => {
  it('requires curator (or above)', async () => {
    const supabase = createFakeSupabase({ blog_relations: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await unlinkRelatedBlogPostAction('relation-1', 'post-a')

    expect(requireRoleMock).toHaveBeenCalledWith('curator')
  })
})

describe('generateSubstackExportAction', () => {
  it('requires curator (or above), resolves a structured-output provider, and returns the generated package', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'post-1', slug: 'my-post', title: 'My Post' }, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })
    getActiveStructuredOutputProviderMock.mockResolvedValue({ name: 'groq' })
    generateSubstackPackageMock.mockResolvedValue({ tags: ['ai'], providerName: 'groq', modelUsed: 'test-model' })

    const result = await generateSubstackExportAction('post-1')

    expect(requireRoleMock).toHaveBeenCalledWith('curator')
    expect(getActiveStructuredOutputProviderMock).toHaveBeenCalled()
    expect(generateSubstackPackageMock).toHaveBeenCalledWith({ name: 'groq' }, expect.objectContaining({ id: 'post-1' }), expect.stringContaining('/blog/my-post'))
    expect(result).toEqual({ tags: ['ai'], providerName: 'groq', modelUsed: 'test-model' })
  })

  it('rejects when the post is not found', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: null, error: null }] })
    requireRoleMock.mockResolvedValue({ user: { id: 'curator-1' }, supabase })

    await expect(generateSubstackExportAction('missing')).rejects.toThrow('Post not found')
  })
})

describe('deleteBlogPostAction', () => {
  it('requires admin and deletes a draft post', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1', status: 'draft' }, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await deleteBlogPostAction('p-1')

    expect(requireRoleMock).toHaveBeenCalledWith('admin')
    const del = supabase._calls.find((c) => c.table === 'blog_posts' && c.method === 'delete')
    expect(del).toBeTruthy()
  })

  it('rejects deleting a post that is already published', async () => {
    const supabase = createFakeSupabase({ blog_posts: [{ data: { id: 'p-1', status: 'published' }, error: null }] })
    requireRoleMock.mockResolvedValue({ supabase })

    await expect(deleteBlogPostAction('p-1')).rejects.toThrow('Only a draft post can be deleted')
  })
})

function fakeGenericFile(name: string, size = 1024) {
  return new File([new Uint8Array(size)], name)
}

describe('importBlogDraftAction', () => {
  it('requires curator (or above)', async () => {
    requireRoleMock.mockRejectedValue(new Error('Forbidden'))
    const formData = new FormData()
    formData.set('file', fakeGenericFile('article.docx'))

    await expect(importBlogDraftAction(formData)).rejects.toThrow('Forbidden')
    expect(requireRoleMock).toHaveBeenCalledWith('curator')
  })

  it('rejects when no file is provided', async () => {
    requireRoleMock.mockResolvedValue({})
    const formData = new FormData()

    await expect(importBlogDraftAction(formData)).rejects.toThrow('No file provided')
    expect(convertDocxImportMock).not.toHaveBeenCalled()
  })

  it('rejects an unsupported extension without calling any converter', async () => {
    requireRoleMock.mockResolvedValue({})
    const formData = new FormData()
    formData.set('file', fakeGenericFile('article.pdf'))

    await expect(importBlogDraftAction(formData)).rejects.toThrow(/Unsupported file type/)
    expect(convertDocxImportMock).not.toHaveBeenCalled()
    expect(convertMarkdownImportMock).not.toHaveBeenCalled()
    expect(convertPlainTextImportMock).not.toHaveBeenCalled()
  })

  it('dispatches a .docx file to convertDocxImport', async () => {
    requireRoleMock.mockResolvedValue({})
    convertDocxImportMock.mockResolvedValue({ title: 't', excerpt: '', stats: {}, body: 'b', warnings: [], imageCount: 0 })
    const formData = new FormData()
    formData.set('file', fakeGenericFile('article.docx'))

    await importBlogDraftAction(formData)

    expect(convertDocxImportMock).toHaveBeenCalledWith(expect.anything(), 'article.docx')
    expect(convertMarkdownImportMock).not.toHaveBeenCalled()
  })

  it('dispatches a .md file to convertMarkdownImport', async () => {
    requireRoleMock.mockResolvedValue({})
    convertMarkdownImportMock.mockReturnValue({ title: 't', excerpt: '', stats: {}, body: 'b', warnings: [], imageCount: 0 })
    const formData = new FormData()
    formData.set('file', fakeGenericFile('notes.md'))

    await importBlogDraftAction(formData)

    expect(convertMarkdownImportMock).toHaveBeenCalledWith(expect.anything(), 'notes.md')
    expect(convertDocxImportMock).not.toHaveBeenCalled()
  })

  it('dispatches a .txt file to convertPlainTextImport', async () => {
    requireRoleMock.mockResolvedValue({})
    convertPlainTextImportMock.mockReturnValue({ title: 't', excerpt: '', stats: {}, body: 'b', warnings: [], imageCount: 0 })
    const formData = new FormData()
    formData.set('file', fakeGenericFile('notes.txt'))

    await importBlogDraftAction(formData)

    expect(convertPlainTextImportMock).toHaveBeenCalledWith(expect.anything(), 'notes.txt')
  })

  it('never touches blog_posts -- importing is a pure conversion, saving is a separate action', async () => {
    const supabase = createFakeSupabase({})
    requireRoleMock.mockResolvedValue({ supabase })
    convertDocxImportMock.mockResolvedValue({ title: 't', excerpt: '', stats: {}, body: 'b', warnings: [], imageCount: 0 })
    const formData = new FormData()
    formData.set('file', fakeGenericFile('article.docx'))

    await importBlogDraftAction(formData)

    expect(supabase._calls.filter((c) => c.table === 'blog_posts')).toEqual([])
  })
})
