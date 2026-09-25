import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listPublishedMethods, listPendingMethods } from '@/lib/workbench/methods'
import { MethodsReview } from '@/components/admin/MethodsReview'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

// Builder Ontology, Part C: published Methods any authenticated (non-
// anonymous) builder can browse and instantiate. A builder sees their own
// draft on its own /methods/[id] page (RLS-gated), not in this browse list.
//
// A platform curator (not just admin) can publish a Method -- same bar as
// decideCapabilityEvaluation (registry.ts), which is reachable from a
// non-admin-gated page (agent-registry/[id]) rather than the admin-only
// /admin page. Methods needs the same real reachability: the pending-review
// queue is ALSO shown here (in addition to the /admin "Methods" tab, which
// only an admin can ever open) so a platform curator has an actual path to
// it, not just a service-layer/RLS bar with nothing pointing at it.
export default async function MethodsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role === 'anonymous') redirect('/dashboard')

  const ctx = { user, profile, supabase } as unknown as WorkbenchCallerContext
  const isStaff = profile.role === 'curator' || profile.role === 'admin'
  const [methods, pendingMethods] = await Promise.all([listPublishedMethods(ctx), isStaff ? listPendingMethods(ctx) : Promise.resolve([])])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Methods</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Reusable process another builder&apos;s workstream demonstrated -- browse and instantiate into a fresh workstream of your own.
        </p>
      </div>

      {methods.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {methods.map((m) => (
            <li key={m.id} className="rounded border border-zinc-200 bg-white p-4">
              <Link href={`/methods/${m.id}`} className="font-medium underline">
                {m.name}
              </Link>
              {m.description && <p className="mt-1 text-sm text-zinc-600">{m.description}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No published methods yet.</p>
      )}

      {isStaff && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Pending review</h2>
          <MethodsReview methods={pendingMethods} />
        </section>
      )}
    </div>
  )
}
