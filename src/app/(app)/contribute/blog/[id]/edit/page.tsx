import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPostById, listPublishablePostsForLinking } from '@/lib/blog/posts'
import { getBlogMediaUrl } from '@/lib/blog/media'
import { getRelatedPosts } from '@/lib/blog/relations'
import { BlogPostForm } from '@/components/admin/BlogPostForm'

export default async function EditContributedBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'curator' && profile.role !== 'admin')) redirect('/dashboard')

  const post = await getPostById(supabase, id)
  if (!post) notFound()
  // UX-level mirror of the real RLS/Server-Action ownership enforcement --
  // a curator can't even open another curator's draft here, satisfying "a
  // curator cannot edit another curator's unassigned draft by changing a
  // URL or identifier." Admins keep full access, same as /admin/blog.
  if (profile.role === 'curator' && post.author_id !== user.id) notFound()

  const [{ data: profiles }, relatedPosts, linkableCandidates] = await Promise.all([
    supabase.from('profiles').select('id, email'),
    getRelatedPosts(supabase, id, false),
    listPublishablePostsForLinking(supabase, id),
  ])
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email ?? p.id]))
  const coverImageUrl = post.cover_image_path ? getBlogMediaUrl(supabase, post.cover_image_path) : null

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Edit Blog draft</h1>
      <BlogPostForm
        post={post}
        viewerRole={profile.role as 'curator' | 'admin'}
        emailById={emailById}
        returnTo="/contribute/blog"
        coverImageUrl={coverImageUrl}
        relatedPosts={relatedPosts}
        linkableCandidates={linkableCandidates}
      />
    </div>
  )
}
