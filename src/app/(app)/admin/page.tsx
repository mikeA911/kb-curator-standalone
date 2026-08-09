import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KBManagement } from '@/components/admin/KBManagement'
import { CurationQueueManager } from '@/components/admin/CurationQueueManager'
import { CuratorAssignment } from '@/components/admin/CuratorAssignment'
import { AIProviderSettings } from '@/components/admin/AIProviderSettings'
import { PendingApprovals } from '@/components/admin/PendingApprovals'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const [{ data: knowledgeBases }, { data: queue }, { data: profiles }, { data: setting }, { data: pendingDocs }] =
    await Promise.all([
      supabase.from('knowledge_bases').select('*').order('name'),
      supabase.from('curation_queue').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('email'),
      supabase.from('settings').select('*').eq('key', 'ai_provider').single(),
      supabase.from('documents').select('*').eq('processing_status', 'submitted').order('upload_date'),
    ])

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-xl font-semibold">Admin</h1>

      <PendingApprovals documents={pendingDocs ?? []} />
      <KBManagement knowledgeBases={knowledgeBases ?? []} />
      <CurationQueueManager queue={queue ?? []} knowledgeBases={knowledgeBases ?? []} />
      <CuratorAssignment profiles={profiles ?? []} knowledgeBases={knowledgeBases ?? []} />
      <AIProviderSettings current={(setting?.value as string) ?? 'openai'} />
    </div>
  )
}
