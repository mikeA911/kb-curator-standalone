import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, KnowledgeBase } from '@/types/database'

export async function listActiveKnowledgeBases(supabase: SupabaseClient<Database>): Promise<KnowledgeBase[]> {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('lifecycle_status', 'active')
    // Pending KBs stay selectable -- a curator should be able to keep
    // uploading into one they just created while it awaits admin review.
    // Only rejected ones drop out of the upload picker.
    .neq('status', 'rejected')
    .order('name')
  // Deployment-safe transition: application instances may briefly run
  // before the migration reaches the database. Preserve the previous list
  // during that window rather than failing the Upload/New Project pages.
  if (error && 'code' in error && error.code === '42703') {
    const fallback = await supabase.from('knowledge_bases').select('*').order('name')
    if (fallback.error) throw fallback.error
    return fallback.data ?? []
  }
  if (error) throw error
  return data ?? []
}

// Backs the project page's "attach a knowledge base" picker, Project-Aware
// Knowledge and Assistant Context Stage 1. Unlike listActiveKnowledgeBases
// (used by the wizard's dropdown, which lists every active KB), this
// excludes bases already attached to THIS project -- but since
// project_knowledge_bases is many-to-many, a KB attached to a different
// project is still a valid, intentional reuse pick here.
export async function listAttachableKnowledgeBases(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<KnowledgeBase[]> {
  const { data: linked, error: linkedError } = await supabase
    .from('project_knowledge_bases')
    .select('knowledge_base_id')
    .eq('project_id', projectId)
  if (linkedError) throw linkedError
  const attachedIds = (linked ?? []).map((l) => l.knowledge_base_id)

  // Only admin-approved knowledge can be attached to a project -- a project
  // attaching a KB is a stronger, "this is now trusted project knowledge"
  // signal than just being able to upload more sources into it.
  let query = supabase.from('knowledge_bases').select('*').eq('lifecycle_status', 'active').eq('status', 'approved').order('name')
  if (attachedIds.length > 0) query = query.not('id', 'in', `(${attachedIds.join(',')})`)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// Public-facing synopsis list for the Wiki page (any signed-in user, not
// just curator/admin) -- per Mike, 2026-08-28: users should be able to see
// what knowledge bases exist and what each is used for, without seeing the
// KB's actual content or curator-facing operational fields (status,
// classification, origin). A narrow select() rather than '*' so a future
// column addition doesn't silently leak into this view. RLS
// (kb_select_global_or_member) already scopes this to platform/public KBs
// plus any project-private one the caller is a strict member of -- no extra
// filter needed here for that boundary.
export interface KnowledgeBaseSynopsis {
  id: string
  name: string
  description: string | null
}

export async function listKnowledgeBaseSynopses(supabase: SupabaseClient<Database>): Promise<KnowledgeBaseSynopsis[]> {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('id, name, description')
    .eq('lifecycle_status', 'active')
    .eq('status', 'approved')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function requireActiveKnowledgeBase(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('id')
    .eq('id', id)
    .eq('lifecycle_status', 'active')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('This knowledge base is retained for reference and cannot be used for new work.')
}
