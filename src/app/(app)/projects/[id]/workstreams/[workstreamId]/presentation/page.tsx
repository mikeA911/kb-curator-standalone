import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPresentation, getPresentationVersion, listSlideComments, listPresentationActions } from '@/lib/workbench/presentations'
import { computeOntologyMapLayout, type OntologyMapLayout } from '@/lib/projects/ontology-map'
import { PresentationViewer } from '@/components/projects/PresentationViewer'
import { PresentationStatusBar } from '@/components/projects/PresentationStatusBar'
import { PresentationActionRegister } from '@/components/projects/PresentationActionRegister'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

export default async function PresentationPage({ params }: { params: Promise<{ id: string; workstreamId: string }> }) {
  const { id, workstreamId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).single()
  const { data: workstream } = await supabase.from('project_workstreams').select('id, name').eq('id', workstreamId).eq('project_id', id).single()
  if (!project || !workstream) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: viewerProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: viewerMembership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  const isAdmin = viewerProfile?.role === 'admin'
  const isActiveMember = isAdmin || !!viewerMembership
  const canCurate = isAdmin || viewerMembership?.role === 'owner' || viewerMembership?.role === 'curator'
  if (!isActiveMember || !viewerProfile) notFound()

  const ctx = { user, profile: viewerProfile, supabase } as unknown as WorkbenchCallerContext
  const presentation = await getPresentation(ctx, workstreamId)
  if (!presentation || !presentation.current_version_id) notFound()

  const [version, comments, actions] = await Promise.all([
    getPresentationVersion(ctx, presentation.current_version_id),
    listSlideComments(ctx, presentation.current_version_id),
    listPresentationActions(ctx, presentation.id),
  ])
  if (!version) notFound()

  // Comment author emails -- narrow safe metadata query via the admin
  // client, same "id+email only, never role/is_active" pattern used
  // throughout this codebase's own member-directory lookups.
  const authorIds = [...new Set(comments.map((c) => c.author_id).filter((x): x is string => !!x))]
  const { data: authorProfiles } =
    authorIds.length > 0 ? await createAdminClient().from('profiles').select('id, email').in('id', authorIds) : { data: [] }
  const authorEmailById = Object.fromEntries((authorProfiles ?? []).map((p) => [p.id, p.email ?? p.id]))

  // computeOntologyMapLayout's module is server-only -- computed here (a
  // Server Component) and passed down as plain data, rather than the
  // client-side PresentationViewer importing that function itself.
  const diagramLayoutBySlideId: Record<string, OntologyMapLayout> = {}
  for (const slide of version.slides) {
    if (slide.type === 'diagram_ref' && slide.diagramData) {
      diagramLayoutBySlideId[slide.id] = computeOntologyMapLayout(slide.diagramData)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/projects/${id}/workstreams/${workstreamId}`} className="text-sm underline">
          &larr; {workstream.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{workstream.name} — Presentation</h1>
        <p className="text-xs text-zinc-500">Version {version.version_number}</p>
      </div>

      <PresentationStatusBar
        projectId={id}
        workstreamId={workstreamId}
        presentationId={presentation.id}
        status={presentation.status}
        canCurate={canCurate}
        scheduledOpenAt={presentation.scheduled_open_at}
      />

      <PresentationViewer
        projectId={id}
        projectName={project.name}
        workstreamId={workstreamId}
        versionId={version.id}
        slides={version.slides}
        diagramLayoutBySlideId={diagramLayoutBySlideId}
        comments={comments}
        authorEmailById={authorEmailById}
        canComment={isActiveMember && presentation.status === 'review_open'}
        canReply={canCurate}
        canProcessFeedback={canCurate}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Action Register</h2>
        <PresentationActionRegister projectId={id} workstreamId={workstreamId} actions={actions} canEditAny={isActiveMember} />
      </section>
    </div>
  )
}
