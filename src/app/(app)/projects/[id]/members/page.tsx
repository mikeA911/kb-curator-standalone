import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MembersManager } from '@/components/projects/MembersManager'

export default async function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase.from('projects').select('id, name, owner_id').eq('id', id).single()
  if (!project) notFound()

  // RLS (is_project_member) already gated the project select above; members
  // select is gated the same way, so this list is only ever what the viewer
  // is legitimately allowed to see.
  const { data: members } = await supabase.from('project_members').select('*').eq('project_id', id).order('created_at')

  const { data: viewerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const viewerMembership = (members ?? []).find((m) => m.user_id === user.id)
  const canManage = viewerProfile?.role === 'admin' || viewerMembership?.role === 'owner'
  if (!canManage) redirect(`/projects/${id}`)

  // Member emails are for display only -- project_members itself (fetched
  // above, RLS-checked) is the real authorization boundary. profiles RLS
  // only lets a caller see their own row or staff see everyone, so a
  // consultant-platform-role project owner can't read a co-member's email
  // through the normal client; the admin client here only ever returns
  // id+email, same narrow pattern as resolveUserIdsByEmail in projects.ts.
  const admin = createAdminClient()
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in('id', (members ?? []).map((m) => m.user_id))
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]))

  return (
    <MembersManager
      projectId={id}
      projectName={project.name}
      members={(members ?? []).map((m) => ({ ...m, email: emailById.get(m.user_id) ?? m.user_id }))}
      currentUserId={user.id}
    />
  )
}
