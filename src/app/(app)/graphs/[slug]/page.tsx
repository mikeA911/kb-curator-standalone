import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getGraphBySlug, listGraphVersions } from '@/lib/graph/queries'
import { ActivateVersionButton } from '@/components/graphs/ActivateVersionButton'
import type { GraphVersionDefinition } from '@/types/database'

export default async function GraphDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const graph = await getGraphBySlug(supabase, slug)
  if (!graph) notFound()

  const versions = await listGraphVersions(supabase, graph.id)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let canManage = false
  if (user) {
    const { data: viewerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (viewerProfile?.role === 'admin') {
      canManage = true
    } else if (graph.project_id === null) {
      canManage = viewerProfile?.role === 'curator'
    } else {
      const { data: viewerMembership } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', graph.project_id)
        .eq('user_id', user.id)
        .maybeSingle()
      canManage = viewerMembership?.role === 'owner'
    }
  }

  const activeVersion = versions.find((v) => v.id === graph.active_version_id)
  const definition = activeVersion?.definition as GraphVersionDefinition | undefined

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/graphs" className="text-sm underline">
          &larr; Graphs
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-xl font-semibold">{graph.name}</h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{graph.status}</span>
        </div>
        {graph.description && <p className="mt-1 text-sm text-zinc-600">{graph.description}</p>}
      </div>

      {definition && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Version {activeVersion!.version_number} (active)
          </h2>
          <div className="rounded border border-zinc-200 bg-white p-4">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-700">
{`retrieve
  ↓
generate
  ↓
evaluate
  ↓
PASS → End
FAIL → diagnose
        ↓
     rewrite_query
        ↓
     retrieve

Max iterations: ${definition.maxIterations}
Required outcome score: ${definition.acceptanceThresholds.requiredOutcomeScore ?? '(none)'}
Required grounding score: ${definition.acceptanceThresholds.requiredGroundingScore ?? '(none)'}
Require expected evidence: ${definition.acceptanceThresholds.requireExpectedEvidence ? 'yes' : 'no'}`}
            </pre>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Versions</h2>
        <div className="rounded border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Version</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Activated</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3">
                    v{v.version_number}
                    {v.id === graph.active_version_id && (
                      <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-800">active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{new Date(v.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-zinc-600">{v.activated_at ? new Date(v.activated_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage && v.id !== graph.active_version_id && (
                      <ActivateVersionButton graphId={graph.id} versionId={v.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
