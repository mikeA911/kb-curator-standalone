import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublishForm } from '@/components/projects/PublishForm'

export default async function ProjectPublishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: viewerProfile }, { data: viewerMembership }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('project_members').select('role').eq('project_id', id).eq('user_id', user.id).maybeSingle(),
  ])
  const canManage = viewerProfile?.role === 'admin' || viewerMembership?.role === 'owner'
  if (!canManage) redirect(`/projects/${id}`)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm underline">
          &larr; {project.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Publish</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Publishing creates a curated public presentation of this project &mdash; never the internal workspace
          itself. Nothing here is visible without signing in until you explicitly publish.
        </p>
      </div>

      <PublishForm
        projectId={project.id}
        visibility={project.visibility}
        publicSlug={project.public_slug}
        publicProfile={project.public_profile}
        isAdmin={viewerProfile?.role === 'admin'}
        publicFullDetail={project.public_full_detail}
      />
    </div>
  )
}
