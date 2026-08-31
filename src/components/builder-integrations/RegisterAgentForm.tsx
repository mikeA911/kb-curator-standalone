'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BuilderIntegrationKind, BuilderIntegrationRiskClassification, ExternalAgentProtocol } from '@/types/database'
import { registerBuilderIntegrationAction } from '@/app/actions/builder-integrations'
import { KIND_LABELS, RISK_LABELS } from './certification'

interface Option {
  id: string
  label: string
}

const AUTH_METHOD_OPTIONS = [
  { value: '', label: 'Unspecified' },
  { value: 'delegated_user_identity', label: 'Delegated user identity' },
  { value: 'service_identity', label: 'Service identity' },
  { value: 'none', label: 'None' },
]

// Plain labeled textareas for skills/credentials/limits/approval-policy,
// not a deep structured form -- this is demonstration scaffolding for the
// Builder Registry pattern, not a production authoring tool. Each textarea
// maps to one jsonb column on builder_integration_versions; a blank
// textarea stores an empty object/array, never a fabricated default.
export function RegisterAgentForm({ projects }: { projects: Option[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [kind, setKind] = useState<BuilderIntegrationKind>('external_agent')
  const [protocol, setProtocol] = useState<ExternalAgentProtocol>('mcp')
  const [riskClassification, setRiskClassification] = useState<BuilderIntegrationRiskClassification>('read_only')
  const [authMethod, setAuthMethod] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [projectId, setProjectId] = useState('')
  const [skillsText, setSkillsText] = useState('')
  const [credentialsText, setCredentialsText] = useState('')
  const [spendingText, setSpendingText] = useState('')
  const [approvalText, setApprovalText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function parseJsonField<T>(text: string, fallback: T, label: string): T {
    if (!text.trim()) return fallback
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`${label} must be valid JSON (or leave it blank)`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !purpose.trim()) {
      setError('Name and purpose are required')
      return
    }
    setSubmitting(true)
    try {
      const skills = parseJsonField<{ name: string; description: string; provider?: string }[]>(skillsText, [], 'Skills')
      const credentialsPolicy = parseJsonField<Record<string, unknown>>(credentialsText, {}, 'Credentials policy')
      const spendingLimits = parseJsonField<Record<string, unknown>>(spendingText, {}, 'Spending limits')
      const approvalPolicy = parseJsonField<Record<string, unknown>>(approvalText, {}, 'Approval policy')

      const result = await registerBuilderIntegrationAction({
        name,
        purpose,
        kind,
        protocol,
        riskClassification,
        authMethod: authMethod || null,
        endpointUrl: endpointUrl.trim() || null,
        projectId: projectId || null,
        skills,
        credentialsPolicy,
        spendingLimits,
        approvalPolicy,
      })
      router.push(`/agent-registry/${result.integrationId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register integration')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-5">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Purpose</span>
        <textarea
          rows={2}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="e.g. Order lunch for a project team from approved nearby outlets, within a spending limit, with explicit confirmation before any order is placed."
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as BuilderIntegrationKind)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            {(Object.keys(KIND_LABELS) as BuilderIntegrationKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Protocol</span>
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as ExternalAgentProtocol)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="mcp">MCP</option>
            <option value="https">HTTPS</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Risk classification</span>
          <select
            value={riskClassification}
            onChange={(e) => setRiskClassification(e.target.value as BuilderIntegrationRiskClassification)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            {Object.entries(RISK_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Auth method (optional)</span>
          <select value={authMethod} onChange={(e) => setAuthMethod(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
            {AUTH_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Governing project (optional)</span>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
          <option value="">None</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Endpoint URL (optional -- leave blank until actually deployed)</span>
        <input
          value={endpointUrl}
          onChange={(e) => setEndpointUrl(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Skills (JSON array, optional)</span>
        <textarea
          rows={3}
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
          placeholder='[{"name": "jollibee", "description": "Jollibee outlet ordering skill"}]'
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Credentials policy -- references only, never a secret value (JSON object, optional)</span>
        <textarea
          rows={2}
          value={credentialsText}
          onChange={(e) => setCredentialsText(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
          placeholder='{"name": "outlet-pos-token", "storage_location": "Sandz secret store"}'
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Spending limits (JSON object, optional)</span>
          <textarea
            rows={2}
            value={spendingText}
            onChange={(e) => setSpendingText(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
            placeholder='{"perOrderMax": 2500, "currency": "PHP"}'
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Approval policy (JSON object, optional)</span>
          <textarea
            rows={2}
            value={approvalText}
            onChange={(e) => setApprovalText(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
            placeholder='{"requiresHumanConfirmation": true}'
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Registering…' : 'Register'}
      </button>
    </form>
  )
}
