'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ApprovalType, ProjectApprovalPolicy, ProjectAuthorityAssignment } from '@/types/database'
import {
  upsertApprovalPolicyAction,
  deleteApprovalPolicyAction,
  grantAuthorityAssignmentAction,
  revokeAuthorityAssignmentAction,
} from '@/app/actions/governance'

const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  technical: 'Technical',
  pricing: 'Pricing',
  commercial: 'Commercial',
  security_compliance: 'Security / Compliance',
  support_commitment: 'Support commitment',
  proposal_release: 'Proposal release',
  customer_acceptance: 'Customer acceptance',
  knowledge_publication: 'Knowledge publication',
  production_change: 'Production change',
}

interface MemberOption {
  id: string
  userId: string
  email: string
}

// isExpired is computed server-side (see governance/page.tsx) rather than
// with Date.now() here -- React's purity lint rule disallows calling an
// impure function anywhere in a component's render body.
type AssignmentWithExpiry = ProjectAuthorityAssignment & { isExpired: boolean }

export function GovernanceManager({
  projectId,
  projectName,
  members,
  policies,
  assignments,
}: {
  projectId: string
  projectName: string
  members: MemberOption[]
  policies: ProjectApprovalPolicy[]
  assignments: AssignmentWithExpiry[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newApprovalType, setNewApprovalType] = useState<ApprovalType | ''>('')
  const [assigneeByType, setAssigneeByType] = useState<Record<string, string>>({})

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  const emailByUserId = new Map(members.map((m) => [m.userId, m.email]))
  const activeAssignmentsByType = new Map<ApprovalType, AssignmentWithExpiry[]>()
  for (const a of assignments) {
    if (a.status !== 'active') continue
    activeAssignmentsByType.set(a.approval_type, [...(activeAssignmentsByType.get(a.approval_type) ?? []), a])
  }
  const availableApprovalTypes = (Object.keys(APPROVAL_TYPE_LABELS) as ApprovalType[]).filter(
    (t) => !policies.some((p) => p.approval_type === t)
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm underline">
          ← {projectName}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Governance</h1>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Approval policy</h2>
        {policies.length === 0 ? (
          <p className="text-sm text-zinc-500">No approval requirements configured for this project.</p>
        ) : (
          <div className="rounded border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Approval type</th>
                  <th className="px-4 py-2 font-medium">Requirement</th>
                  <th className="px-4 py-2 font-medium">Authority</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => {
                  const active = activeAssignmentsByType.get(p.approval_type) ?? []
                  const expired = active.filter((a) => a.isExpired)
                  const missing = p.requirement_status === 'required' && active.length === expired.length
                  return (
                    <tr key={p.id} className="border-b border-zinc-100 last:border-0 align-top">
                      <td className="px-4 py-3">{APPROVAL_TYPE_LABELS[p.approval_type]}</td>
                      <td className="px-4 py-3">
                        <select
                          value={p.requirement_status}
                          disabled={isPending}
                          onChange={(e) =>
                            run(() =>
                              upsertApprovalPolicyAction(projectId, {
                                approvalType: p.approval_type,
                                requirementStatus: e.target.value as 'required' | 'optional' | 'not_applicable',
                              })
                            )
                          }
                          className="rounded border border-zinc-300 px-1.5 py-1 text-xs"
                        >
                          <option value="required">Required</option>
                          <option value="optional">Optional</option>
                          <option value="not_applicable">Not applicable</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {active.length > 0 ? (
                          <ul className="flex flex-col gap-1">
                            {active.map((a) => (
                              <li key={a.id} className="flex items-center gap-2">
                                <span className={expired.includes(a) ? 'text-amber-700' : ''}>
                                  {emailByUserId.get(a.user_id) ?? a.user_id}
                                  {expired.includes(a) ? ' (expired)' : ''}
                                </span>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => {
                                    const reason = prompt('Reason for revoking this authority?')
                                    if (reason === null) return
                                    run(() => revokeAuthorityAssignmentAction(a.id, projectId, reason))
                                  }}
                                  className="text-xs text-red-600 underline disabled:opacity-50"
                                >
                                  Revoke
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className={missing || p.requirement_status === 'required' ? 'font-medium text-amber-700' : 'text-zinc-500'}>
                            Authority needed
                          </span>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <select
                            value={assigneeByType[p.approval_type] ?? ''}
                            onChange={(e) => setAssigneeByType((prev) => ({ ...prev, [p.approval_type]: e.target.value }))}
                            className="rounded border border-zinc-300 px-1.5 py-1 text-xs"
                          >
                            <option value="">Assign…</option>
                            {members.map((m) => (
                              <option key={m.userId} value={m.userId}>
                                {m.email}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={isPending || !assigneeByType[p.approval_type]}
                            onClick={() =>
                              run(async () => {
                                await grantAuthorityAssignmentAction(projectId, {
                                  userId: assigneeByType[p.approval_type],
                                  approvalType: p.approval_type,
                                })
                                setAssigneeByType((prev) => ({ ...prev, [p.approval_type]: '' }))
                              })
                            }
                            className="text-xs underline disabled:opacity-50"
                          >
                            Grant
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => run(() => deleteApprovalPolicyAction(p.id, projectId))}
                          className="text-xs text-red-600 underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-center gap-2">
        <select
          value={newApprovalType}
          onChange={(e) => setNewApprovalType(e.target.value as ApprovalType | '')}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Add an approval type…</option>
          {availableApprovalTypes.map((t) => (
            <option key={t} value={t}>
              {APPROVAL_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isPending || !newApprovalType}
          onClick={() =>
            run(async () => {
              if (!newApprovalType) return
              await upsertApprovalPolicyAction(projectId, { approvalType: newApprovalType, requirementStatus: 'required' })
              setNewApprovalType('')
            })
          }
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
