import { createClient } from '@/lib/supabase/server'
import { RunConfigForm } from '@/components/eval/RunConfigForm'

export default async function NewEvalRunPage({
  searchParams,
}: {
  searchParams: Promise<{ dataset?: string }>
}) {
  const { dataset: preselectedDatasetId } = await searchParams
  const supabase = await createClient()

  const { data: datasets } = await supabase
    .from('eval_datasets')
    .select('id, name, status, version')
    .order('created_at', { ascending: false })

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Run evaluation</h1>
      <RunConfigForm datasets={datasets ?? []} preselectedDatasetId={preselectedDatasetId} />
    </div>
  )
}
