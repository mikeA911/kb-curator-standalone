import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAgentBySlug } from '@/lib/agent/queries'
import { AskQuestionForm } from '@/components/agents/AskQuestionForm'

// A live question runs the full graph (retrieve -> generate -> evaluate,
// up to maxIterations retries) inside this request -- same reasoning as
// evals/runs/new/page.tsx's maxDuration override.
export const maxDuration = 60

export default async function RunAgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const agent = await getAgentBySlug(supabase, slug)
  if (!agent) notFound()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/agents/${agent.slug}`} className="text-sm underline">
          &larr; {agent.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Ask {agent.name}</h1>
      </div>
      <AskQuestionForm />
    </div>
  )
}
