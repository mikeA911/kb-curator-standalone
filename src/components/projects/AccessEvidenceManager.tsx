'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type {
  EvidenceClassification,
  InformationSensitivity,
  ProjectAccessGroup,
  ProjectAccessGroupMember,
  ResourceAccessAuditLogEntry,
  ResourceAccessGrant,
  ResourceAccessPolicy,
} from '@/types/database'
import type { EvidenceResourceSummary } from '@/lib/projects/evidence-access'
import {
  createAccessGroupAction,
  grantGroupMembershipAction,
  revokeGroupMembershipAction,
  classifyResourceAction,
  revokeResourceAccessAction,
  setProjectInformationSensitivityAction,
} from '@/app/actions/evidence-access'

// Project Evidence Access Controls, Stage 1
// (docs/dev-request-project-evidence-access-controls.md). Same
// mutate-then-router.refresh() pattern as GovernanceManager.tsx.

interface MemberOption {
  id: string
  userId: string
  email: string
}

const CLASSIFICATION_LABELS: Record<EvidenceClassification, string> = {
  project_general: 'Project general',
  internal_confidential: 'Internal confidential',
  commercial_confidential: 'Commercial confidential',
  security_restricted: 'Security restricted',
  customer_confidential: 'Customer confidential',
  customer_visible: 'Customer visible',
}

// Deliberately a second, separate axis from classification above -- "which
// humans can see this" vs. "which AI models may process this" (Shadow AI
// blog, 2026-08-28; see supabase/migrations/20260828170001_information_
// sensitivity_classification.sql). Unclassified (blank) is a real, distinct
// option here -- the enforcement side (src/lib/ai/sensitivity.ts) treats it
// as 'internal', not as "unset means public".
const SENSITIVITY_LABELS: Record<InformationSensitivity, string> = {
  public: 'Public',
  internal: 'Internal',
  confidential: 'Confidential',
  restricted: 'Restricted',
}

const SUGGESTED_GROUP_NAMES = [
  'sales_commercial',
  'finance_pricing',
  'technical_delivery',
  'security_compliance',
  'customer_visible',
  'named_users_only',
]

const EVENT_LABELS: Record<string, string> = {
  resource_classified: 'classified',
  resource_reclassified: 'reclassified',
  group_created: 'created group',
  group_member_granted: 'added to group',
  group_member_revoked: 'removed from group',
  resource_grant_granted: 'granted access',
  resource_grant_revoked: 'revoked access',
}

export function AccessEvidenceManager({
  projectId,
  projectName,
  projectInformationSensitivity,
  members,
  groups,
  groupMembers,
  resources,
  policies,
  grants,
  auditLog,
}: {
  projectId: string
  projectName: string
  projectInformationSensitivity: InformationSensitivity | null
  members: MemberOption[]
  groups: ProjectAccessGroup[]
  groupMembers: ProjectAccessGroupMember[]
  resources: EvidenceResourceSummary[]
  policies: ResourceAccessPolicy[]
  grants: ResourceAccessGrant[]
  auditLog: ResourceAccessAuditLogEntry[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [projectSensitivityDraft, setProjectSensitivityDraft] = useState<InformationSensitivity | ''>(projectInformationSensitivity ?? '')
  const [newGroupName, setNewGroupName] = useState('')
  const [addMemberByGroup, setAddMemberByGroup] = useState<Record<string, string>>({})
  const [openResourceKey, setOpenResourceKey] = useState<string | null>(null)
  const [classificationDraft, setClassificationDraft] = useState<EvidenceClassification>('project_general')
  const [sensitivityDraft, setSensitivityDraft] = useState<InformationSensitivity | ''>('')
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [rationaleDraft, setRationaleDraft] = useState('')

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
  const emailByMemberId = new Map(members.map((m) => [m.id, m.email]))
  const membersByGroupId = new Map<string, ProjectAccessGroupMember[]>()
  for (const gm of groupMembers) {
    if (gm.status !== 'active') continue
    membersByGroupId.set(gm.project_access_group_id, [...(membersByGroupId.get(gm.project_access_group_id) ?? []), gm])
  }

  const policyByResourceKey = new Map(policies.map((p) => [`${p.resource_type}:${p.resource_id}`, p]))
  const grantsByPolicyId = new Map<string, ResourceAccessGrant[]>()
  for (const g of grants) {
    if (g.status !== 'active') continue
    grantsByPolicyId.set(g.resource_access_policy_id, [...(grantsByPolicyId.get(g.resource_access_policy_id) ?? []), g])
  }

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSet(next)
  }

  function openClassify(resourceKey: string, current: ResourceAccessPolicy | undefined) {
    setOpenResourceKey(openResourceKey === resourceKey ? null : resourceKey)
    setClassificationDraft(current?.classification ?? 'project_general')
    setSensitivityDraft(current?.information_sensitivity ?? '')
    setSelectedGroups(new Set())
    setSelectedMembers(new Set())
    setRationaleDraft(current?.rationale ?? '')
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/projects/${projectId}`} className="text-sm underline">
          ← {projectName}
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Access &amp; Evidence</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Project membership grants participation, not universal knowledge access. Classify a source, article, or artifact to
          restrict it to specific access groups or named members -- everything else stays visible to the whole project team,
          same as today.
        </p>
      </div>

      {/* Project-level AI sensitivity ------------------------------------ */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">This project</h2>
        <p className="text-sm text-zinc-500">
          The project&apos;s own name and goal are included in Ember&apos;s system prompt for every message in this project --
          independent of which sources or Wiki articles get retrieved. Classify it the same way as a resource below if the
          project itself (its name, goal, or the fact of its existence) shouldn&apos;t reach every AI model.
        </p>
        <div className="flex items-center gap-2">
          <select
            value={projectSensitivityDraft}
            onChange={(e) => setProjectSensitivityDraft(e.target.value as InformationSensitivity | '')}
            className="w-64 rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">Unclassified (treated as Internal)</option>
            {(Object.keys(SENSITIVITY_LABELS) as InformationSensitivity[]).map((s) => (
              <option key={s} value={s}>
                {SENSITIVITY_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending || projectSensitivityDraft === (projectInformationSensitivity ?? '')}
            onClick={() => run(() => setProjectInformationSensitivityAction(projectId, projectSensitivityDraft || null))}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </section>

      {/* Groups ---------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Access groups</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-zinc-500">No access groups yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => {
              const active = membersByGroupId.get(g.id) ?? []
              const addable = members.filter((m) => !active.some((am) => am.project_member_id === m.id))
              return (
                <div key={g.id} className="rounded border border-zinc-200 bg-white p-3">
                  <p className="font-medium">{g.name}</p>
                  {g.description && <p className="text-sm text-zinc-500">{g.description}</p>}
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {active.length === 0 && <li className="text-zinc-400">No members yet.</li>}
                    {active.map((m) => (
                      <li key={m.id} className="flex items-center gap-2">
                        <span>{emailByMemberId.get(m.project_member_id) ?? m.project_member_id}</span>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            const reason = prompt('Reason for removing this member from the group?')
                            if (reason === null) return
                            run(() => revokeGroupMembershipAction(projectId, m.id, reason))
                          }}
                          className="text-xs text-red-600 underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  {addable.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <select
                        value={addMemberByGroup[g.id] ?? ''}
                        onChange={(e) => setAddMemberByGroup((prev) => ({ ...prev, [g.id]: e.target.value }))}
                        className="rounded border border-zinc-300 px-1.5 py-1 text-xs"
                      >
                        <option value="">Add member…</option>
                        {addable.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.email}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isPending || !addMemberByGroup[g.id]}
                        onClick={() =>
                          run(async () => {
                            await grantGroupMembershipAction(projectId, g.id, addMemberByGroup[g.id])
                            setAddMemberByGroup((prev) => ({ ...prev, [g.id]: '' }))
                          })
                        }
                        className="text-xs underline disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name…"
            list="suggested-group-names"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <datalist id="suggested-group-names">
            {SUGGESTED_GROUP_NAMES.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <button
            type="button"
            disabled={isPending || !newGroupName.trim()}
            onClick={() =>
              run(async () => {
                await createAccessGroupAction(projectId, { name: newGroupName.trim() })
                setNewGroupName('')
              })
            }
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Create group
          </button>
        </div>
      </section>

      {/* Resources --------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Resources</h2>
        {resources.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing attached to this project yet.</p>
        ) : (
          <div className="rounded border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Resource</th>
                  <th className="px-4 py-2 font-medium">Classification</th>
                  <th className="px-4 py-2 font-medium">AI sensitivity</th>
                  <th className="px-4 py-2 font-medium">Access</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => {
                  const key = `${r.resourceType}:${r.resourceId}`
                  const policy = policyByResourceKey.get(key)
                  const activeGrants = policy ? (grantsByPolicyId.get(policy.id) ?? []) : []
                  return (
                    <>
                      <tr key={key} className="border-b border-zinc-100 last:border-0 align-top">
                        <td className="px-4 py-3">
                          <span className="text-xs uppercase text-zinc-400">{r.resourceType.replace('_', ' ')}</span>
                          <br />
                          {r.title}
                        </td>
                        <td className="px-4 py-3">{CLASSIFICATION_LABELS[policy?.classification ?? 'project_general']}</td>
                        <td className="px-4 py-3">
                          {policy?.information_sensitivity ? SENSITIVITY_LABELS[policy.information_sensitivity] : <span className="text-zinc-400">Unclassified</span>}
                        </td>
                        <td className="px-4 py-3">
                          {activeGrants.length === 0 ? (
                            <span className="text-zinc-400">Whole project team</span>
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {activeGrants.map((g) => (
                                <li key={g.id} className="flex items-center gap-2">
                                  <span>
                                    {g.project_access_group_id
                                      ? (groups.find((gr) => gr.id === g.project_access_group_id)?.name ?? 'Unknown group')
                                      : (emailByMemberId.get(g.project_member_id ?? '') ?? 'Unknown member')}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => {
                                      const reason = prompt('Reason for revoking this access?')
                                      if (reason === null) return
                                      run(() => revokeResourceAccessAction(projectId, g.id, reason))
                                    }}
                                    className="text-xs text-red-600 underline disabled:opacity-50"
                                  >
                                    Revoke
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => openClassify(key, policy)} className="text-xs underline">
                            {openResourceKey === key ? 'Close' : 'Classify'}
                          </button>
                        </td>
                      </tr>
                      {openResourceKey === key && (
                        <tr className="border-b border-zinc-100 bg-zinc-50">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="flex flex-col gap-2">
                              <label className="text-xs font-medium text-zinc-500">Classification</label>
                              <select
                                value={classificationDraft}
                                onChange={(e) => setClassificationDraft(e.target.value as EvidenceClassification)}
                                className="w-64 rounded border border-zinc-300 px-2 py-1.5 text-sm"
                              >
                                {(Object.keys(CLASSIFICATION_LABELS) as EvidenceClassification[]).map((c) => (
                                  <option key={c} value={c}>
                                    {CLASSIFICATION_LABELS[c]}
                                  </option>
                                ))}
                              </select>

                              <label className="mt-1 text-xs font-medium text-zinc-500">
                                AI sensitivity -- which AI models may process this (separate from classification above)
                              </label>
                              <select
                                value={sensitivityDraft}
                                onChange={(e) => setSensitivityDraft(e.target.value as InformationSensitivity | '')}
                                className="w-64 rounded border border-zinc-300 px-2 py-1.5 text-sm"
                              >
                                <option value="">Unclassified (treated as Internal)</option>
                                {(Object.keys(SENSITIVITY_LABELS) as InformationSensitivity[]).map((s) => (
                                  <option key={s} value={s}>
                                    {SENSITIVITY_LABELS[s]}
                                  </option>
                                ))}
                              </select>

                              {classificationDraft !== 'project_general' && (
                                <>
                                  <p className="mt-1 text-xs font-medium text-zinc-500">
                                    Grant access to (required -- select at least one group or member)
                                  </p>
                                  <div className="max-h-40 overflow-y-auto rounded border border-zinc-200 bg-white p-2">
                                    {groups.map((g) => (
                                      <label key={g.id} className="flex items-center gap-2 py-0.5 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={selectedGroups.has(g.id)}
                                          onChange={() => toggle(selectedGroups, setSelectedGroups, g.id)}
                                        />
                                        Group: {g.name}
                                      </label>
                                    ))}
                                    {members.map((m) => (
                                      <label key={m.id} className="flex items-center gap-2 py-0.5 text-sm">
                                        <input
                                          type="checkbox"
                                          checked={selectedMembers.has(m.id)}
                                          onChange={() => toggle(selectedMembers, setSelectedMembers, m.id)}
                                        />
                                        {m.email}
                                      </label>
                                    ))}
                                  </div>
                                </>
                              )}

                              <label className="mt-1 text-xs font-medium text-zinc-500">Rationale (optional)</label>
                              <input
                                value={rationaleDraft}
                                onChange={(e) => setRationaleDraft(e.target.value)}
                                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                              />

                              <div>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    run(async () => {
                                      await classifyResourceAction(projectId, {
                                        resourceType: r.resourceType,
                                        resourceId: r.resourceId,
                                        classification: classificationDraft,
                                        informationSensitivity: sensitivityDraft || null,
                                        rationale: rationaleDraft || null,
                                        groupIds: Array.from(selectedGroups),
                                        memberIds: Array.from(selectedMembers),
                                      })
                                      setOpenResourceKey(null)
                                    })
                                  }
                                  className="mt-1 rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                                >
                                  Save classification
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit --------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Audit history</h2>
        {auditLog.length === 0 ? (
          <p className="text-sm text-zinc-500">No access changes recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-zinc-600">
            {auditLog.map((e) => (
              <li key={e.id}>
                {new Date(e.created_at).toLocaleString()} — {emailByUserId.get(e.actor_id ?? '') ?? e.actor_id} {EVENT_LABELS[e.event_type] ?? e.event_type}
                {e.resource_type ? ` (${e.resource_type.replace('_', ' ')})` : ''}
                {e.to_classification ? ` → ${CLASSIFICATION_LABELS[e.to_classification]}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
