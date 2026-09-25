import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMethod } from '@/lib/workbench/methods'
import { Markdown } from '@/components/shared/Markdown'
import { InstantiateMethodForm } from '@/components/projects/InstantiateMethodForm'
import { PublishMethodButton } from '@/components/admin/PublishMethodButton'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

export default async function MethodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role === 'anonymous') redirect('/dashboard')

  const ctx = { user, profile, supabase } as unknown as WorkbenchCallerContext
  // getMethod relies on RLS (methods_select_published_or_own_draft) for
  // visibility -- a published Method, the caller's own draft, or a
  // curator/admin can see it; anyone else gets null here, same as it not
  // existing.
  const method = await getMethod(ctx, id)
  if (!method) notFound()

  const canPublish = (profile.role === 'curator' || profile.role === 'admin') && method.status === 'draft'

  // Instantiation needs an owner/curator role on the TARGET project -- same
  // bar as instantiateMethodAsWorkstream's own check, so this list is
  // pre-filtered to only projects that will actually succeed.
  let instantiableProjects: { id: string; name: string }[] = []
  if (method.status === 'published') {
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'curator'])
    const projectIds = [...new Set((memberships ?? []).map((m) => m.project_id))]
    if (projectIds.length > 0) {
      const { data: projects } = await supabase.from('projects').select('id, name').in('id', projectIds).order('name')
      instantiableProjects = projects ?? []
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{method.name}</h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700">{method.status}</span>
        </div>
        {method.description && <p className="mt-2 text-sm text-zinc-600">{method.description}</p>}
      </div>

      {canPublish && <PublishMethodButton methodId={method.id} />}

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Requirements</h2>
          {method.requirements ? <Markdown text={method.requirements} /> : <p className="text-sm text-zinc-500">Not specified.</p>}

          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Evidence</h2>
          {method.evidence ? <Markdown text={method.evidence} /> : <p className="text-sm text-zinc-500">Not specified.</p>}

          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Deliverables</h2>
          {method.deliverables ? <Markdown text={method.deliverables} /> : <p className="text-sm text-zinc-500">Not specified.</p>}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Guardrails</h2>
          {method.guardrails ? <Markdown text={method.guardrails} /> : <p className="text-sm text-zinc-500">Not specified.</p>}

          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Review points</h2>
          {method.review_points ? <Markdown text={method.review_points} /> : <p className="text-sm text-zinc-500">Not specified.</p>}
        </div>
      </section>

      {method.status === 'published' && <InstantiateMethodForm methodId={method.id} projects={instantiableProjects} />}
    </div>
  )
}
