import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BlogNewDraftChoice } from '@/components/blog/BlogNewDraftChoice'

export default async function NewContributedBlogPostPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'curator' && profile.role !== 'admin')) redirect('/dashboard')

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-xl font-semibold">New Blog draft</h1>
      <BlogNewDraftChoice viewerRole={profile.role as 'curator' | 'admin'} returnTo="/contribute/blog" />
    </div>
  )
}
