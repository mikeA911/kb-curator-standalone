import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// Project-Aware Knowledge and Assistant Context, Stage 2 -- the "accessible
// destination" a knowledge_source citation/link resolves to
// (navigation-resolver.ts's knowledge_source case). Deliberately minimal:
// title, current version metadata, originating knowledge base.
//
// knowledge_sources_select_staff_or_owner_or_project_member (RLS) alone is
// NOT enough of a gate here: it intentionally keeps its pre-existing
// unconditional curator/admin bypass (needed for the curation/upload
// workflow elsewhere), which would let a non-member curator/admin navigate
// straight to a project_private source's metadata page even though the
// actual chunk content stays correctly blocked -- caught live, testing a
// non-member admin against the Zadara source. This page adds its own
// explicit check for a project_private/selected_projects knowledge base:
// at least one project_knowledge_bases row for it must be visible to the
// caller, and that junction table's own RLS has no such bypass (same
// pattern as project_wiki_articles gating a private Wiki article).
export default async function KnowledgeSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: source } = await supabase
    .from('knowledge_sources')
    .select('id, title, source_url, publisher, knowledge_base_id, current_version_id, lifecycle_status')
    .eq('id', id)
    .maybeSingle()
  if (!source) notFound()

  const { data: knowledgeBase } = await supabase
    .from('knowledge_bases')
    .select('id, name, visibility_scope')
    .eq('id', source.knowledge_base_id)
    .maybeSingle()
  if (!knowledgeBase) notFound()

  if (knowledgeBase.visibility_scope === 'project_private' || knowledgeBase.visibility_scope === 'selected_projects') {
    const { data: membership } = await supabase
      .from('project_knowledge_bases')
      .select('id')
      .eq('knowledge_base_id', knowledgeBase.id)
      .limit(1)
    if (!membership || membership.length === 0) notFound()
  }

  const { data: version } = source.current_version_id
    ? await supabase
        .from('documents')
        .select('version_number, change_note, upload_date, original_filename')
        .eq('id', source.current_version_id)
        .maybeSingle()
    : { data: null }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{source.title}</h1>
        {source.publisher && <p className="mt-1 text-sm text-zinc-500">{source.publisher}</p>}
      </div>

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-zinc-500">Knowledge base:</dt>
          <dd>{knowledgeBase?.name ?? source.knowledge_base_id}</dd>
        </div>
        {version && (
          <div className="flex gap-2">
            <dt className="text-zinc-500">Current version:</dt>
            <dd>
              #{version.version_number} ({version.original_filename}, uploaded {new Date(version.upload_date).toLocaleDateString()})
              {version.change_note && <span className="text-zinc-500"> -- {version.change_note}</span>}
            </dd>
          </div>
        )}
        {source.source_url && (
          <div className="flex gap-2">
            <dt className="text-zinc-500">Source URL:</dt>
            <dd>
              <a href={source.source_url} target="_blank" rel="noreferrer" className="underline">
                {source.source_url}
              </a>
            </dd>
          </div>
        )}
        {source.lifecycle_status !== 'active' && (
          <div className="flex gap-2">
            <dt className="text-zinc-500">Status:</dt>
            <dd>{source.lifecycle_status}</dd>
          </div>
        )}
      </dl>

      <Link href="/upload" className="text-sm underline">
        Back to sources
      </Link>
    </div>
  )
}
