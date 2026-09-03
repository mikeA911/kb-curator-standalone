import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizationPortfolio } from '@/lib/projects/portfolio'
import { OrganizationPortfolio } from '@/components/projects/OrganizationPortfolio'

// Administrator/curator organization portfolio (docs/dev-request-role-aware-
// project-views-and-ember-first-workspace.md, View 1). Gated on the viewer's
// own session-client profile role -- never trust the admin client's reach as
// the authorization boundary, only as the query engine for the safe
// projection getOrganizationPortfolio itself defines.
export default async function ProjectsPortfolioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'curator') redirect('/projects')

  const rows = await getOrganizationPortfolio(createAdminClient(), user.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/projects" className="text-sm underline">
          &larr; My Projects
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Organization Portfolio</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Safe metadata across every Project. Names, counts and dates only -- source content, chats and artifacts stay
          scoped to Project members.
        </p>
      </div>

      <OrganizationPortfolio rows={rows} viewerIsAdmin={profile?.role === 'admin'} />
    </div>
  )
}
