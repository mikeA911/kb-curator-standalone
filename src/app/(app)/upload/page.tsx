import { createClient } from '@/lib/supabase/server'
import { DocumentUploader } from '@/components/curator/DocumentUploader'
import { DocumentRow } from '@/components/curator/DocumentRow'
import { SourcesPipelineDiagram } from '@/components/curator/SourcesPipelineDiagram'
import { listActiveKnowledgeBases } from '@/lib/knowledge-bases'

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ kb?: string; sourceUrl?: string }>
}) {
  const { kb, sourceUrl } = await searchParams
  const supabase = await createClient()
  const [knowledgeBases, { data: documents }] = await Promise.all([
    listActiveKnowledgeBases(supabase),
    supabase.from('documents').select('*').order('upload_date', { ascending: false }).limit(50),
  ])

  const stats = {
    total: documents?.length ?? 0,
    inReview: documents?.filter((d) => d.processing_status === 'review').length ?? 0,
    submitted: documents?.filter((d) => d.processing_status === 'submitted').length ?? 0,
    completed: documents?.filter((d) => d.processing_status === 'completed').length ?? 0,
    failed: documents?.filter((d) => d.processing_status === 'failed').length ?? 0,
  }
  const activeDefaultKb = knowledgeBases.some((item) => item.id === kb) ? kb : undefined

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Sources &amp; Curation</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Source material enters here, gets parsed and chunked, and only becomes retrievable evidence or synthesized
          Wiki knowledge once a curator has reviewed and approved it.
        </p>
      </div>

      <SourcesPipelineDiagram />

      <div className="max-w-xl">
        <DocumentUploader knowledgeBases={knowledgeBases} defaultKb={activeDefaultKb} defaultSourceUrl={sourceUrl} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Object.entries(stats).map(([label, value]) => (
          <div key={label} className="rounded border border-zinc-200 bg-white p-4">
            <div className="text-2xl font-semibold">{value}</div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Document</th>
              <th className="px-4 py-2 font-medium">KB</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Chunks</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(documents ?? []).map((doc) => (
              <DocumentRow key={doc.id} document={doc} />
            ))}
            {(documents ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
