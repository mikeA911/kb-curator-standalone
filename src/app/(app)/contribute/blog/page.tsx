import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listAllPosts } from '@/lib/blog/posts'
import { MyBlogDraftsList } from '@/components/blog/MyBlogDraftsList'

// Curator entry point, separate from /admin -- doc requirement: "Curators
// should not need access to unrelated administration features merely to
// contribute Blog drafts." Mirrors /wiki/new's inline role gate.
export default async function ContributeBlogPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'curator' && profile.role !== 'admin')) redirect('/dashboard')

  const allPosts = await listAllPosts(supabase)
  const myPosts = allPosts.filter((p) => p.author_id === user.id)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <MyBlogDraftsList posts={myPosts} />
    </div>
  )
}
