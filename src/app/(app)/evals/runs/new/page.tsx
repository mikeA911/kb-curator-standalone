import { createClient } from '@/lib/supabase/server'
import { RunConfigForm } from '@/components/eval/RunConfigForm'
import { listProviders, listModels } from '@/lib/ai'
import { listActiveGraphs } from '@/lib/graph/queries'

// executeEvalRun runs every case in a dataset sequentially (retrieve ->
// generate -> optional LLM judge = up to 3 AI calls per case), inside the
// same request that creates the run -- fine for the 10-15 case datasets
// this milestone targets, but easily exceeds Vercel's default serverless
// timeout. Raise the ceiling here rather than building a job queue (that's
// a later-milestone change); a much larger dataset would need one.
export const maxDuration = 60

export default async function NewEvalRunPage({
  searchParams,
}: {
  searchParams: Promise<{ dataset?: string }>
}) {
  const { dataset: preselectedDatasetId } = await searchParams
  const supabase = await createClient()

  const [{ data: datasets }, providers, models, graphs] = await Promise.all([
    supabase.from('eval_datasets').select('id, name, status, version').order('created_at', { ascending: false }),
    listProviders(supabase, { enabledOnly: true }),
    listModels(supabase, { enabledOnly: true }),
    listActiveGraphs(supabase),
  ])

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">Run evaluation</h1>
      <RunConfigForm
        datasets={datasets ?? []}
        preselectedDatasetId={preselectedDatasetId}
        providers={providers}
        models={models}
        graphs={graphs}
      />
    </div>
  )
}
