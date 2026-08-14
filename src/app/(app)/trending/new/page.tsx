import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TrendingSubmitForm } from '@/components/trending/TrendingSubmitForm'

export default async function NewTrendingItemPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only projects this user actually belongs to -- scoping a Trending item
  // to a project the submitter isn't a member of would be meaningless (RLS
  // would also reject it at insert time).
  const { data: memberships } = await supabase.from('project_members').select('project_id').eq('user_id', user.id)
  const projectIds = (memberships ?? []).map((m) => m.project_id)
  const { data: projects } =
    projectIds.length > 0
      ? await supabase.from('projects').select('id, name').in('id', projectIds).order('name')
      : { data: [] }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1 className="text-xl font-semibold">Submit to Trending</h1>
      <TrendingSubmitForm projects={projects ?? []} />
    </div>
  )
}
