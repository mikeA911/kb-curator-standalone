import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CreateWorkstreamForm } from '@/components/projects/CreateWorkstreamForm'

export default async function NewWorkstreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).single()
  if (!project) notFound()

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm underline">
          &larr; {project.name}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">New Workstream</h1>
      </div>
      <CreateWorkstreamForm projectId={id} />
    </div>
  )
}
