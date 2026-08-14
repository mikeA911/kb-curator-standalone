import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, ProjectNote, ProjectNoteStatus } from '@/types/database'

export interface ProjectNoteWithAuthor extends ProjectNote {
  author: { id: string; email: string | null } | null
  recipientUser: { id: string; email: string | null } | null
}

// Two plain queries rather than an embedded select -- same reasoning as
// listComments (src/lib/trending/queries.ts): the hand-written Database
// type's Relationships: [] degrades an embedded select's type inference.
async function withAuthors(
  supabase: SupabaseClient<Database>,
  notes: ProjectNote[]
): Promise<ProjectNoteWithAuthor[]> {
  if (notes.length === 0) return []

  const profileIds = [
    ...new Set(
      notes.flatMap((n) => [n.author_id, n.recipient_user_id]).filter((id): id is string => !!id)
    ),
  ]
  const { data: profiles, error } =
    profileIds.length > 0
      ? await supabase.from('profiles').select('id, email').in('id', profileIds)
      : { data: [], error: null }
  if (error) throw error

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  return notes.map((n) => ({
    ...n,
    author: n.author_id ? (byId.get(n.author_id) ?? null) : null,
    recipientUser: n.recipient_user_id ? (byId.get(n.recipient_user_id) ?? null) : null,
  }))
}

export async function listProjectNotes(
  supabase: SupabaseClient<Database>,
  projectId: string,
  filter: { status?: ProjectNoteStatus } = {}
): Promise<ProjectNoteWithAuthor[]> {
  let query = supabase.from('project_notes').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
  if (filter.status) query = query.eq('status', filter.status)
  const { data, error } = await query
  if (error) throw error
  return withAuthors(supabase, data ?? [])
}

export async function getProjectNote(supabase: SupabaseClient<Database>, noteId: string): Promise<ProjectNoteWithAuthor | null> {
  const { data, error } = await supabase.from('project_notes').select('*').eq('id', noteId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const [withAuthor] = await withAuthors(supabase, [data])
  return withAuthor
}

export interface ProjectNoteReplyWithAuthor {
  id: string
  note_id: string
  author_id: string | null
  body: string
  created_at: string
  author: { id: string; email: string | null } | null
}

export async function listNoteReplies(supabase: SupabaseClient<Database>, noteId: string): Promise<ProjectNoteReplyWithAuthor[]> {
  const { data: replies, error } = await supabase
    .from('project_note_replies')
    .select('id, note_id, author_id, body, created_at')
    .eq('note_id', noteId)
    .order('created_at', { ascending: true })
  if (error) throw error
  if (!replies || replies.length === 0) return []

  const authorIds = [...new Set(replies.map((r) => r.author_id).filter((id): id is string => !!id))]
  const { data: authors, error: authorsError } =
    authorIds.length > 0 ? await supabase.from('profiles').select('id, email').in('id', authorIds) : { data: [], error: null }
  if (authorsError) throw authorsError

  const byId = new Map((authors ?? []).map((a) => [a.id, a]))
  return replies.map((r) => ({ ...r, author: r.author_id ? (byId.get(r.author_id) ?? null) : null }))
}

// Deliberately narrow -- only notes authored by or directly addressed to
// this user, status='open'. Not everything a curator merely has oversight
// visibility into (can_view_project_note is broader); this is "Notes for
// You" on the Workbench, which should read as genuinely personal.
export async function listNotesForUser(supabase: SupabaseClient<Database>, userId: string): Promise<ProjectNoteWithAuthor[]> {
  const { data, error } = await supabase
    .from('project_notes')
    .select('*')
    .eq('status', 'open')
    .or(`author_id.eq.${userId},and(recipient_type.eq.user,recipient_user_id.eq.${userId})`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return withAuthors(supabase, data ?? [])
}
