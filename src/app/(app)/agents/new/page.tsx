import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listAgentTemplates } from '@/lib/agent/queries'
import { listProviders, listModels } from '@/lib/ai'
import { CreateAgentForm } from '@/components/agents/CreateAgentForm'

export default async function NewAgentPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  // Platform-global Agent creation is staff-only (mirrors agents_manage_staff
  // RLS) -- project-scoped creation for project owners is a later UI, not
  // built in this pass (only one global template exists so far).
  if (profile?.role !== 'curator' && profile?.role !== 'admin') redirect('/agents')

  const [templates, providers, models] = await Promise.all([
    listAgentTemplates(supabase),
    listProviders(supabase, { enabledOnly: true }),
    listModels(supabase, { enabledOnly: true }),
  ])

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">New Agent</h1>
      <CreateAgentForm templates={templates} providers={providers} models={models} />
    </div>
  )
}
