import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getArticleBySlug, getLatestVersion, getVersionHistory, listArticlesForLinking } from '@/lib/wiki/queries'
import { getSourcesForVersion, listKnowledgeSourcesForLinking } from '@/lib/wiki/sources'
import { getRelatedArticles } from '@/lib/wiki/relations'
import { getProjectsForArticle } from '@/lib/wiki/project-links'
import { listProjectsForLinking } from '@/lib/projects/queries'
import { Markdown } from '@/components/shared/Markdown'
import { ArticleReviewActions } from '@/components/wiki/ArticleReviewActions'
import { SourceManager, SourceRemoveButton } from '@/components/wiki/SourceManager'
import { RelatedArticlesManager, RelatedArticleRemoveButton } from '@/components/wiki/RelatedArticlesManager'
import { ProjectArticleManager, ProjectArticleRemoveButton } from '@/components/wiki/ProjectArticleManager'

export default async function WikiArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  // /wiki/* lives under the (app) route group, whose own layout
  // (src/app/(app)/layout.tsx) already redirects any signed-out visitor to
  // /login before this page renders at all -- so this page never needs its
  // own is_public-aware branching. A genuinely public reference (the About
  // page's inlined key terms, for example) is kept as plain copy on a
  // public page instead of linking here, rather than adding a second public
  // route for this one case (per Mike, 2026-08-28).
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isStaff = profile?.role === 'curator' || profile?.role === 'admin'
  const isAdmin = profile?.role === 'admin'

  const article = await getArticleBySlug(supabase, slug)
  if (!article) notFound()

  const [version, history, related, linkableArticles, linkedProjects, linkableProjects, linkableSources] = await Promise.all([
    getLatestVersion(supabase, article.id),
    isStaff ? getVersionHistory(supabase, article.id) : Promise.resolve([]),
    getRelatedArticles(supabase, article.id),
    isStaff ? listArticlesForLinking(supabase, article.id) : Promise.resolve([]),
    isStaff ? getProjectsForArticle(supabase, article.id) : Promise.resolve([]),
    isStaff ? listProjectsForLinking(supabase) : Promise.resolve([]),
    isStaff ? listKnowledgeSourcesForLinking(supabase) : Promise.resolve([]),
  ])

  const sources = version ? await getSourcesForVersion(supabase, version.id) : []
  const isPendingDraft = !!version && version.id !== article.current_version_id

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{article.title}</h1>
          {article.short_description && <p className="mt-1 text-zinc-600">{article.short_description}</p>}
        </div>
        {isStaff && (
          <Link href={`/wiki/${article.slug}/edit`} className="shrink-0 rounded border border-zinc-300 px-3 py-1.5 text-sm">
            Edit
          </Link>
        )}
      </div>

      {isPendingDraft && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You&apos;re viewing version {version.version_number} ({article.status}) — a newer draft than the currently
          approved content{article.current_version_id ? '.' : '; nothing has been approved for this article yet.'}
        </p>
      )}

      {!version && <p className="text-zinc-500">No content yet.</p>}

      {version && (
        <>
          <div className="rounded border border-zinc-200 bg-white p-5">
            <p className="mb-4 rounded bg-zinc-50 p-3 text-sm text-zinc-700">
              <span className="font-medium">Quick help: </span>
              {version.quick_help}
            </p>
            {(version.applicable_roles?.length || version.related_routes?.length || version.applicable_version) && (
              <p className="mb-4 text-xs text-zinc-500">
                {version.applicable_roles?.length ? <>Roles: {version.applicable_roles.join(', ')}</> : null}
                {version.applicable_roles?.length && (version.related_routes?.length || version.applicable_version) ? ' · ' : null}
                {version.related_routes?.length ? <>Routes: {version.related_routes.join(', ')}</> : null}
                {version.related_routes?.length && version.applicable_version ? ' · ' : null}
                {version.applicable_version ? <>Version: {version.applicable_version}</> : null}
              </p>
            )}
            <Markdown text={version.content} />
            {version.implementation_notes && (
              <div className="mt-4">
                <h3 className="font-semibold text-zinc-900">Implementation notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{version.implementation_notes}</p>
              </div>
            )}
            {version.limitations && (
              <div className="mt-4">
                <h3 className="font-semibold text-zinc-900">Limitations</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{version.limitations}</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded border border-zinc-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Sources</h3>
              {sources.length === 0 ? (
                <p className="text-sm text-zinc-500">No sources linked.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {sources.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-2 text-zinc-700">
                      <span>
                        {s.document ? `${s.document.original_filename} (${s.document.doc_type})` : null}
                        {s.chunk ? `Chunk #${s.chunk.chunk_index}${s.chunk.source_page ? `, page ${s.chunk.source_page}` : ''}` : null}
                        {s.workstream_artifact ? `Project artifact: ${s.workstream_artifact.title}` : null}
                        {s.source_type === 'external' && 'External source'}
                        {s.relationship && <span className="text-zinc-400"> — {s.relationship}</span>}
                        {s.notes && <span className="block text-xs text-zinc-500">{s.notes}</span>}
                      </span>
                      {isStaff && <SourceRemoveButton sourceId={s.id} />}
                    </li>
                  ))}
                </ul>
              )}
              {isStaff && (
                <div className="mt-3 border-t border-zinc-100 pt-3">
                  <SourceManager versionId={version.id} knowledgeSources={linkableSources} />
                </div>
              )}
            </div>

            <div className="rounded border border-zinc-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Related articles</h3>
              {related.length === 0 ? (
                <p className="text-sm text-zinc-500">None linked.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {related.map((r) =>
                    r.article ? (
                      <li key={r.relationId} className="flex items-center justify-between gap-2">
                        <Link href={`/wiki/${r.article.slug}`} className="underline">
                          {r.article.title}
                        </Link>
                        {isStaff && <RelatedArticleRemoveButton relationId={r.relationId} />}
                      </li>
                    ) : null
                  )}
                </ul>
              )}
              {isStaff && (
                <RelatedArticlesManager
                  articleId={article.id}
                  articles={linkableArticles}
                  excludeSlugs={related.map((r) => r.article?.slug).filter((s): s is string => !!s)}
                />
              )}
            </div>
          </div>

          {isStaff && (
            <div className="rounded border border-zinc-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Projects</h3>
              <p className="mb-2 text-xs text-zinc-500">
                Visibility controls who can see this article; project attachment shows it on a project&apos;s own
                Knowledge list without copying it.
              </p>
              {linkedProjects.length === 0 ? (
                <p className="text-sm text-zinc-500">Not attached to any project.</p>
              ) : (
                <ul className="mb-2 flex flex-col gap-1 text-sm">
                  {linkedProjects.map((l) =>
                    l.project ? (
                      <li key={l.linkId} className="flex items-center justify-between gap-2">
                        <Link href={`/projects/${l.project.id}`} className="underline">
                          {l.project.name}
                        </Link>
                        <ProjectArticleRemoveButton linkId={l.linkId} projectId={l.project.id} />
                      </li>
                    ) : null
                  )}
                </ul>
              )}
              <ProjectArticleManager
                articleId={article.id}
                visibilityScope={article.visibility_scope}
                projects={linkableProjects}
                excludeProjectIds={linkedProjects.map((l) => l.project?.id).filter((id): id is string => !!id)}
              />
            </div>
          )}

          {isStaff && (
            <ArticleReviewActions
              articleId={article.id}
              versionId={version.id}
              status={article.status}
              isAdmin={isAdmin}
              isPublic={article.is_public}
            />
          )}

          {isStaff && history.length > 0 && (
            <div className="rounded border border-zinc-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">Version history</h3>
              <table className="w-full text-sm">
                <thead className="text-left text-zinc-500">
                  <tr>
                    <th className="py-1 pr-4">#</th>
                    <th className="py-1 pr-4">Source</th>
                    <th className="py-1 pr-4">Verification</th>
                    <th className="py-1 pr-4">Created</th>
                    <th className="py-1 pr-4">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((v) => (
                    <tr key={v.id} className="border-t border-zinc-100">
                      <td className="py-1 pr-4">
                        {v.version_number}
                        {v.id === article.current_version_id && (
                          <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-800">current</span>
                        )}
                      </td>
                      <td className="py-1 pr-4">{v.generated_by === 'ai_assisted' ? 'AI-assisted' : 'Human'}</td>
                      <td className="py-1 pr-4">{v.verification_status}</td>
                      <td className="py-1 pr-4">{new Date(v.created_at).toLocaleDateString()}</td>
                      <td className="py-1 pr-4">{v.approved_at ? new Date(v.approved_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
