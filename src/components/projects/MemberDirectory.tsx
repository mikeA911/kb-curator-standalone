import Link from 'next/link'
import type { BusinessFunction, ProjectRole } from '@/types/database'

const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Owner',
  curator: 'Curator',
  consultant: 'Consultant',
  viewer: 'Viewer',
}

const BUSINESS_FUNCTION_LABELS: Record<BusinessFunction, string> = {
  business_development_sales: 'Business Development / Sales',
  finance_pricing: 'Finance / Pricing',
  legal_commercial: 'Legal / Commercial',
  customer_support: 'Customer Support',
  delivery_consulting: 'Delivery / Consulting',
  architecture_engineering: 'Architecture / Engineering',
  security_compliance: 'Security / Compliance',
  customer_representative: 'Customer Representative',
  project_governance: 'Project Governance',
  other: 'Other',
}

export interface DirectoryMember {
  membershipId: string
  userId: string
  email: string | null
  role: ProjectRole
  businessFunction: BusinessFunction | null
}

// Read-only active-member directory for the main Project page (docs/dev-
// request-role-aware-project-views-and-ember-first-workspace.md, View 2).
// Distinct from /projects/[id]/members, which is manage-only (add/remove/
// change role, owner or admin only) -- this is visible to every active
// member and offers only Send note, reusing the existing Project Notes flow
// rather than inventing a new messaging surface.
export function MemberDirectory({ projectId, members, viewerUserId }: { projectId: string; members: DirectoryMember[]; viewerUserId: string }) {
  if (members.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Members</h2>
      <ul className="flex flex-col gap-1.5">
        {members.map((m) => (
          <li key={m.membershipId} className="flex items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span>
                {m.email ?? m.userId}
                {m.userId === viewerUserId && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">{ROLE_LABELS[m.role]}</span>
              {m.businessFunction && <span className="text-xs text-zinc-400">{BUSINESS_FUNCTION_LABELS[m.businessFunction]}</span>}
            </div>
            {m.userId !== viewerUserId && (
              <Link href={`/projects/${projectId}/notes?to=${m.userId}`} className="shrink-0 text-xs underline">
                Send note
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
