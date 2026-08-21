import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KBManagement } from '@/components/admin/KBManagement'
import { CurationQueueManager } from '@/components/admin/CurationQueueManager'
import { UserManagement } from '@/components/admin/UserManagement'
import { AIProvidersList } from '@/components/admin/AIProvidersList'
import { ModelAssignmentsSummary } from '@/components/admin/ModelAssignmentsSummary'
import { PendingApprovals } from '@/components/admin/PendingApprovals'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { listProviders, listModels, listChatCapableModels, listStructuredOutputCapableModels, toRoleOption } from '@/lib/ai'
import { env } from '@/lib/env'
import { SectionHero } from '@/components/SectionHero'
import { UnpublishedWikiWidget } from '@/components/wiki/UnpublishedWikiWidget'
import { listUnpublishedArticles } from '@/lib/wiki/queries'
import { BrandingSettings } from '@/components/admin/BrandingSettings'
import { getBrandingUrls } from '@/lib/branding'
import { BlogPostsList } from '@/components/admin/BlogPostsList'
import { listAllPosts } from '@/lib/blog/posts'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const [
    { data: knowledgeBases },
    { data: queue },
    { data: profiles },
    { data: pendingDocs },
    aiProviders,
    aiModels,
    unpublishedWikiArticles,
    brandingUrls,
    conversationalOptions,
    structuredOutputOptions,
    blogPosts,
  ] = await Promise.all([
    supabase.from('knowledge_bases').select('*').order('name'),
    supabase.from('curation_queue').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').order('email'),
    supabase.from('documents').select('*').eq('processing_status', 'submitted').order('upload_date'),
    listProviders(supabase),
    listModels(supabase),
    listUnpublishedArticles(supabase),
    getBrandingUrls(supabase),
    listChatCapableModels(supabase),
    listStructuredOutputCapableModels(supabase),
    listAllPosts(supabase),
  ])

  // Checked server-side only -- reports Configured/Missing, never the value.
  const configuredByProvider = Object.fromEntries(aiProviders.map((p) => [p.id, Boolean(env.byName(p.api_key_env_var))]))

  const currentConversationalModel = aiModels.find((m) => m.model_type === 'generation' && m.is_default)
  const currentStructuredOutputModel = aiModels.find((m) => m.is_default_structured_output)

  return (
    <div className="flex flex-col gap-6">
      <SectionHero image="/images/sections/admin.png" height="compact" priority />

      <h1 className="text-xl font-semibold">Administration</h1>

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
            content: (
              <div className="flex flex-col gap-4">
                <ModelAssignmentsSummary
                  conversational={{
                    current: currentConversationalModel ? toRoleOption(currentConversationalModel, aiProviders) : null,
                    options: conversationalOptions,
                  }}
                  structuredOutput={{
                    current: currentStructuredOutputModel ? toRoleOption(currentStructuredOutputModel, aiProviders) : null,
                    options: structuredOutputOptions,
                  }}
                />
                <AIProvidersList providers={aiProviders} models={aiModels} configuredByProvider={configuredByProvider} />
              </div>
            ),
          },
          { id: 'branding', label: 'Branding', content: <BrandingSettings current={brandingUrls} /> },
          { id: 'blog', label: 'Blog', content: <BlogPostsList posts={blogPosts} /> },
        ]}
      />

      <UnpublishedWikiWidget articles={unpublishedWikiArticles} />
    </div>
  )
}
