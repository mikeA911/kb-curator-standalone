import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPublicProjectBySlug } from '@/lib/projects/public'
import { getPublicAssessmentById, listPublicVersions, getPublicAssessmentMatrixForVersion } from '@/lib/projects/public-workstreams'
import { Markdown } from '@/components/shared/Markdown'

const CLASSIFICATION_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  INFERRED: 'bg-amber-100 text-amber-800',
  UNKNOWN: 'bg-zinc-200 text-zinc-600',
}

// Public sibling of (app)/projects/[id]/assessments/[assessmentId]/page.tsx.
// Read-only: no version-management controls, no "Submit a response"/"Resume"
// links (those require an account), and only active/retired versions with
// completed responses are ever reachable here at all -- enforced by RLS,
// not just by this page.
export default async function PublicAssessmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; assessmentId: string }>
  searchParams: Promise<{ version?: string }>
}) {
  const { slug, assessmentId } = await params
  const { version: versionParam } = await searchParams
  const supabase = await createClient()

  const project = await getPublicProjectBySlug(supabase, slug)
  if (!project || !project.public_full_detail) notFound()

  const [assessment, versions] = await Promise.all([getPublicAssessmentById(supabase, assessmentId), listPublicVersions(supabase, assessmentId)])
  if (!assessment || assessment.project_id !== project.id) notFound()

  const targetVersionId = versionParam || assessment.current_version_id || versions[0]?.id
  if (!targetVersionId) notFound()

  const matrix = await getPublicAssessmentMatrixForVersion(supabase, assessmentId, targetVersionId)
  if (!matrix) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/examples/${slug}`} className="text-sm underline">
          &larr; {project.public_profile?.title || project.name}
        </Link>
        <div className="mt-2">
          <h1 className="text-xl font-semibold">{assessment.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Version {matrix.version.version_number} · {matrix.questions.length} question{matrix.questions.length === 1 ? '' : 's'} ·{' '}
            <span className={matrix.version.status === 'active' ? 'text-green-700' : 'text-zinc-500'}>{matrix.version.status}</span>
          </p>
          {assessment.description && <p className="mt-2 max-w-xl text-sm text-zinc-600">{assessment.description}</p>}
        </div>

        {versions.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {versions.map((v) => (
              <Link
                key={v.id}
                href={`/examples/${slug}/assessments/${assessmentId}?version=${v.id}`}
                className={`rounded-full px-2 py-0.5 ${v.id === targetVersionId ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'}`}
              >
                v{v.version_number} ({v.status})
              </Link>
            ))}
          </div>
        )}
      </div>

      <details className="rounded border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500">Instructions given to participants</summary>
        <div className="mt-3">
          <Markdown text={matrix.version.instructions} />
        </div>
      </details>

      <div className="flex flex-col gap-4">
        {matrix.questions.map((q, i) => (
          <div key={q.id} className="rounded border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium">
                {String(i + 1).padStart(2, '0')} &nbsp; {q.title}
              </h2>
              {q.category && <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{q.category}</span>}
            </div>
            <p className="mt-1 text-sm text-zinc-700">{q.question}</p>
            {q.guidance && <p className="mt-1 text-xs italic text-zinc-500">{q.guidance}</p>}

            <ul className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
              {matrix.responses.length === 0 && <li className="text-sm text-zinc-500">No completed responses yet.</li>}
              {matrix.responses.map((r) => {
                const answer = matrix.answerByKey.get(`${q.id}:${r.id}`)
                return (
                  <li key={r.id}>
                    {answer ? (
                      <details>
                        <summary className="cursor-pointer text-sm">
                          <span className="font-medium">{r.participant_label}</span>{' '}
                          {answer.classification && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_STYLES[answer.classification]}`}>
                              {answer.classification}
                            </span>
                          )}
                        </summary>
                        <div className="mt-2 rounded border border-zinc-100 bg-zinc-50 p-3">
                          <Markdown text={answer.answer} />
                          {answer.evidence && (
                            <div className="mt-2 border-t border-zinc-200 pt-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Evidence</p>
                              <Markdown text={answer.evidence} />
                            </div>
                          )}
                        </div>
                      </details>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        <span className="font-medium text-zinc-700">{r.participant_label}</span> — not yet answered
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
