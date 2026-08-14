import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KBManagement } from '@/components/admin/KBManagement'
import { CurationQueueManager } from '@/components/admin/CurationQueueManager'
import { UserManagement } from '@/components/admin/UserManagement'
import { AIProvidersList } from '@/components/admin/AIProvidersList'
import { PendingApprovals } from '@/components/admin/PendingApprovals'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { listProviders, listModels } from '@/lib/ai'
import { env } from '@/lib/env'
import { SectionHero } from '@/components/SectionHero'
import { UnpublishedWikiWidget } from '@/components/wiki/UnpublishedWikiWidget'
import { listUnpublishedArticles } from '@/lib/wiki/queries'
import { BrandingSettings } from '@/components/admin/BrandingSettings'
import { getBrandingUrls } from '@/lib/branding'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const [{ data: knowledgeBases }, { data: queue }, { data: profiles }, { data: pendingDocs }, aiProviders, aiModels, unpublishedWikiArticles, brandingUrls] =
    await Promise.all([
      supabase.from('knowledge_bases').select('*').order('name'),
      supabase.from('curation_queue').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('email'),
      supabase.from('documents').select('*').eq('processing_status', 'submitted').order('upload_date'),
      listProviders(supabase),
      listModels(supabase),
      listUnpublishedArticles(supabase),
      getBrandingUrls(supabase),
    ])

  // Checked server-side only -- reports Configured/Missing, never the value.
  const configuredByProvider = Object.fromEntries(aiProviders.map((p) => [p.id, Boolean(env.byName(p.api_key_env_var))]))

  return (
    <div className="flex flex-col gap-6">
      <SectionHero image="/images/sections/admin.png" height="compact" priority />

      <h1 className="text-xl font-semibold">Administration</h1>

      <UnpublishedWikiWidget articles={unpublishedWikiArticles} />

      <AdminTabs
        tabs={[
          { id: 'approvals', label: 'Pending Approvals', content: <PendingApprovals documents={pendingDocs ?? []} /> },
          { id: 'users', label: 'Users', content: <UserManagement profiles={profiles ?? []} knowledgeBases={knowledgeBases ?? []} /> },
          { id: 'kbs', label: 'Knowledge Bases', content: <KBManagement knowledgeBases={knowledgeBases ?? []} /> },
          {
            id: 'queue',
            label: 'Curation Queue',
            content: <CurationQueueManager queue={queue ?? []} knowledgeBases={knowledgeBases ?? []} />,
          },
          {
            id: 'ai',
            label: 'AI Config',
            content: <AIProvidersList providers={aiProviders} models={aiModels} configuredByProvider={configuredByProvider} />,
          },
          { id: 'branding', label: 'Branding', content: <BrandingSettings current={brandingUrls} /> },
        ]}
      />
    </div>
  )
}
