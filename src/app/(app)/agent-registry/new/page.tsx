import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RegisterAgentForm } from '@/components/builder-integrations/RegisterAgentForm'

export default async function NewAgentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role === 'anonymous') redirect('/dashboard')

  const { data: projects } = await supabase.from('projects').select('id, name').order('name')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Register</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Any signed-in builder can self-register an external agent or MCP server as a draft. Certification (Experimental →
          Sandbox Tested → Security Reviewed → Outlet Accepted → Production Approved) is reviewed and advanced by KB
          Sandbox staff; deciding which Projects may use it is yours to manage once registered.
        </p>
      </div>
      <RegisterAgentForm projects={(projects ?? []).map((p) => ({ id: p.id, label: p.name }))} />
    </div>
  )
}
