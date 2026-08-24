import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface ProjectWithMissingAuthority {
  id: string
  name: string
  missingApprovalTypes: string[]
}

// A "required" policy with zero active, non-expired assignments is a gap --
// mirrors listProjectsWithDraftUpdates's shape (src/lib/projects/queries.ts):
// simple separate queries + a JS join, not one combined SQL query, since RLS
// already scopes both tables to what the caller (a curator/admin viewing the
// dashboard) can see.
export async function listProjectsWithMissingAuthorities(supabase: SupabaseClient<Database>): Promise<ProjectWithMissingAuthority[]> {
  const [{ data: policies, error: policyError }, { data: assignments, error: assignmentError }] = await Promise.all([
    supabase.from('project_approval_policies').select('project_id, approval_type').eq('requirement_status', 'required'),
    supabase.from('project_authority_assignments').select('project_id, approval_type, status, expires_at').eq('status', 'active'),
  ])
  if (policyError) throw policyError
  if (assignmentError) throw assignmentError

  const now = Date.now()
  const coveredKeys = new Set(
    (assignments ?? [])
      .filter((a) => !a.expires_at || new Date(a.expires_at).getTime() > now)
      .map((a) => `${a.project_id}:${a.approval_type}`)
  )

  const gapsByProject = new Map<string, string[]>()
  for (const p of policies ?? []) {
    if (coveredKeys.has(`${p.project_id}:${p.approval_type}`)) continue
    gapsByProject.set(p.project_id, [...(gapsByProject.get(p.project_id) ?? []), p.approval_type])
  }
  if (gapsByProject.size === 0) return []

  const { data: projects, error: projectError } = await supabase.from('projects').select('id, name').in('id', [...gapsByProject.keys()])
  if (projectError) throw projectError

  return (projects ?? []).map((proj) => ({ id: proj.id, name: proj.name, missingApprovalTypes: gapsByProject.get(proj.id) ?? [] }))
}
