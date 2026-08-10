import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listModels } from '@/lib/ai'
import { env } from '@/lib/env'
import { ProviderDetail } from '@/components/admin/ProviderDetail'

export default async function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: provider } = await supabase.from('ai_providers').select('*').eq('id', id).single()
  if (!provider) notFound()

  const models = await listModels(supabase, { providerId: id })
  const configured = Boolean(env.byName(provider.api_key_env_var))

  return <ProviderDetail provider={provider} models={models} configured={configured} />
}
