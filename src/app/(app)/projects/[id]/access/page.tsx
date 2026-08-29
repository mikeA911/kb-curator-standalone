import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth'
import { listAccessGroups, listProjectResources, listResourcePolicies, listAuditLog } from '@/lib/projects/evidence-access'
import { AccessEvidenceManager } from '@/components/projects/AccessEvidenceManager'

// Project Evidence Access Controls, Stage 1 -- owner-only page (platform
// admin via can_manage_project's existing bypass). Same authorization gate
// as governance/page.tsx: this is administrative visibility into which
// evidence is restricted and to whom, not the evidence content itself
// (RLS -- has_evidence_access, zero bypass -- is what actually gates
// content, independent of who can reach this page).
export default async function ProjectAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireUser()
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('id, name, information_sensitivity').eq('id', id).single()
  if (!project) notFound()

  const { data: viewerMembership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', ctx.user.id)
    .maybeSingle()
  const canManage = ctx.profile.role === 'admin' || viewerMembership?.role === 'owner'
  if (!canManage) redirect(`/projects/${id}`)

  const { data: members } = await supabase.from('project_members').select('*').eq('project_id', id).eq('status', 'active').order('created_at')

  const [{ groups, members: groupMembers }, resources, { policies, grants }, auditLog] = await Promise.all([
    listAccessGroups(ctx, id),
    listProjectResources(ctx, id),
    listResourcePolicies(ctx, id),
    listAuditLog(ctx, id),
  ])

  // Same narrow admin-client email lookup as members/governance pages --
  // id+email only, never role/is_active/anything else.
  const admin = createAdminClient()
  const { data: profiles } = await admin.from('profiles').select('id, email').in('id', (members ?? []).map((m) => m.user_id))
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]))

  return (
    <AccessEvidenceManager
      projectId={id}
      projectName={project.name}
      projectInformationSensitivity={project.information_sensitivity}
      members={(members ?? []).map((m) => ({ id: m.id, userId: m.user_id, email: emailById.get(m.user_id) ?? m.user_id }))}
      groups={groups}
      groupMembers={groupMembers}
      resources={resources}
      policies={policies}
      grants={grants}
      auditLog={auditLog}
    />
  )
}
