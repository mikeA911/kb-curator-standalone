import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listWorkstreams } from '@/lib/projects/workstreams'
import { AssessmentCreateForm } from '@/components/projects/AssessmentCreateForm'

export default async function NewAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).single()
  if (!project) notFound()

  const { data: viewerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { data: viewerMembership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  const canCreate = viewerProfile?.role === 'admin' || viewerMembership?.role === 'owner' || viewerMembership?.role === 'curator'
  if (!canCreate) redirect(`/projects/${id}`)

  const workstreams = await listWorkstreams(supabase, id)

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm underline">
          &larr; {project.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">New System Understanding Assessment</h1>
        <p className="mt-1 text-sm text-zinc-500">
          A standardized set of questions every participant/method answers after independently examining the system —
          separate from the engineering artifacts.
        </p>
      </div>
      <AssessmentCreateForm projectId={id} workstreams={workstreams.map((w) => ({ id: w.id, name: w.name }))} />
    </div>
  )
}
