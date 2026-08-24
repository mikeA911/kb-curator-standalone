import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GovernanceManager } from '@/components/projects/GovernanceManager'
import type { ProjectAuthorityAssignment } from '@/types/database'

// A plain helper, not a component -- React's purity lint rule disallows
// calling an impure function like Date.now() anywhere inside a component's
// own render body (server or client), but a regular function it calls is
// fine.
function annotateExpiry<T extends ProjectAuthorityAssignment>(assignments: T[]): (T & { isExpired: boolean })[] {
  const now = Date.now()
  return assignments.map((a) => ({ ...a, isExpired: Boolean(a.expires_at && new Date(a.expires_at).getTime() < now) }))
}

export default async function ProjectGovernancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase.from('projects').select('id, name, owner_id').eq('id', id).single()
  if (!project) notFound()

  // RLS (is_project_member) already gated the project select above; policies/
  // assignments/members selects are gated the same way, so everything here is
  // only ever what the viewer is legitimately allowed to see.
  const [{ data: members }, { data: policies }, { data: assignments }, { data: viewerProfile }] = await Promise.all([
    supabase.from('project_members').select('*').eq('project_id', id).eq('status', 'active').order('created_at'),
    supabase.from('project_approval_policies').select('*').eq('project_id', id).order('approval_type'),
    supabase
      .from('project_authority_assignments')
      .select('*')
      .eq('project_id', id)
      .order('approval_type')
      .order('granted_at', { ascending: false }),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  const viewerMembership = (members ?? []).find((m) => m.user_id === user.id)
  const canManage = viewerProfile?.role === 'admin' || viewerMembership?.role === 'owner'
  if (!canManage) redirect(`/projects/${id}`)

  // Same narrow admin-client email lookup as members/page.tsx -- id+email
  // only, never role/is_active/anything else.
  const admin = createAdminClient()
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in('id', (members ?? []).map((m) => m.user_id))
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]))

  const assignmentsWithExpiry = annotateExpiry(assignments ?? [])

  return (
    <GovernanceManager
      projectId={id}
      projectName={project.name}
      members={(members ?? []).map((m) => ({ id: m.id, userId: m.user_id, email: emailById.get(m.user_id) ?? m.user_id }))}
      policies={policies ?? []}
      assignments={assignmentsWithExpiry}
    />
  )
}
