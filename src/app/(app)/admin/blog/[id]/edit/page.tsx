import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPostById } from '@/lib/blog/posts'
import { BlogPostForm } from '@/components/admin/BlogPostForm'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const post = await getPostById(supabase, id)
  if (!post) notFound()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Edit blog post</h1>
      <BlogPostForm post={post} />
    </div>
  )
}
