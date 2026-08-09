import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DocumentRow } from '@/components/curator/DocumentRow'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .order('upload_date', { ascending: false })
    .limit(50)

  const stats = {
    total: documents?.length ?? 0,
    inReview: documents?.filter((d) => d.processing_status === 'review').length ?? 0,
    submitted: documents?.filter((d) => d.processing_status === 'submitted').length ?? 0,
    completed: documents?.filter((d) => d.processing_status === 'completed').length ?? 0,
    failed: documents?.filter((d) => d.processing_status === 'failed').length ?? 0,
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link href="/upload" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Upload document
        </Link>
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
