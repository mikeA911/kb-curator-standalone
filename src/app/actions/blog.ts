'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createDraftPost, updatePost, publishPost, unpublishPost, deleteDraftPost, getPostById } from '@/lib/blog/posts'

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function createBlogPostAction(input: { title: string; slug: string; excerpt: string; content: string }) {
  const { user, supabase } = await requireRole('admin')
  const post = await createDraftPost(supabase, {
    title: input.title,
    slug: input.slug.trim() || slugify(input.title),
    excerpt: input.excerpt.trim() || null,
    content: input.content,
    authorId: user.id,
  })
  revalidatePath('/admin')
  return { id: post.id }
}

export async function updateBlogPostAction(id: string, input: { title: string; slug: string; excerpt: string; content: string }) {
  const { supabase } = await requireRole('admin')
  await updatePost(supabase, id, {
    title: input.title,
    slug: input.slug.trim() || slugify(input.title),
    excerpt: input.excerpt.trim() || null,
    content: input.content,
  })
  revalidatePath('/admin')
  revalidatePath(`/admin/blog/${id}/edit`)
  revalidatePath('/blog')
}

export async function publishBlogPostAction(id: string) {
  const { supabase } = await requireRole('admin')
  await publishPost(supabase, id)
  const post = await getPostById(supabase, id)
  revalidatePath('/admin')
  revalidatePath(`/admin/blog/${id}/edit`)
  revalidatePath('/blog')
  if (post) revalidatePath(`/blog/${post.slug}`)
}

export async function unpublishBlogPostAction(id: string) {
  const { supabase } = await requireRole('admin')
  const before = await getPostById(supabase, id)
  await unpublishPost(supabase, id)
  revalidatePath('/admin')
  revalidatePath(`/admin/blog/${id}/edit`)
  revalidatePath('/blog')
  if (before) revalidatePath(`/blog/${before.slug}`)
}

export async function deleteBlogPostAction(id: string) {
  const { supabase } = await requireRole('admin')
  await deleteDraftPost(supabase, id)
  revalidatePath('/admin')
}
