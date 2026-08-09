import { createClient } from '@/lib/supabase/server'
import { DocumentUploader } from '@/components/curator/DocumentUploader'

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ kb?: string; sourceUrl?: string }>
}) {
  const { kb, sourceUrl } = await searchParams
  const supabase = await createClient()
  const { data: knowledgeBases } = await supabase.from('knowledge_bases').select('*').order('name')

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h1 className="text-xl font-semibold">Upload document</h1>
      <DocumentUploader knowledgeBases={knowledgeBases ?? []} defaultKb={kb} defaultSourceUrl={sourceUrl} />
    </div>
  )
}
