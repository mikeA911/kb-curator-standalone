'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectRole, ProjectType } from '@/types/database'
import { createProjectAction } from '@/app/actions/projects'

const TEAM_ROLES: ProjectRole[] = ['curator', 'consultant', 'viewer']

const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  { value: 'learning', label: 'Learning', description: 'Learn an AI technique through a guided experiment.' },
  { value: 'experiment', label: 'Experiment', description: 'Test a technical hypothesis or architecture choice.' },
  { value: 'consulting', label: 'Client / Consulting', description: 'Solve or evaluate an AI use case for a client or engagement.' },
  { value: 'transformation', label: 'Internal Transformation', description: 'Improve an internal workflow or business process.' },
  { value: 'knowledge', label: 'Knowledge', description: 'Build or maintain a curated knowledge base.' },
]

interface Option {
  id: string
  label: string
}

export function ProjectWizard({ knowledgeBases, evalDatasets }: { knowledgeBases: Option[]; evalDatasets: Option[] }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [projectType, setProjectType] = useState<ProjectType | null>(null)
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [details, setDetails] = useState<Record<string, string>>({})
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('')
  const [evalDatasetId, setEvalDatasetId] = useState('')
  const [members, setMembers] = useState<{ email: string; role: ProjectRole }[]>([])
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<ProjectRole>('consultant')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addStagedMember() {
    if (!memberEmail.trim()) return
    setMembers((prev) => [...prev, { email: memberEmail.trim(), role: memberRole }])
    setMemberEmail('')
  }

  function setDetail(key: string, value: string) {
    setDetails((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    if (!projectType || !name) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await createProjectAction({
        name,
        projectType,
        objective,
        details,
        knowledgeBaseId: knowledgeBaseId || null,
        evalDatasetId: evalDatasetId || null,
        members,
      })
      router.push(`/projects/${result.projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex gap-1 text-xs text-zinc-500">
        {['What are you doing?', 'Define the problem', 'Knowledge scope', 'Evaluation', 'Team'].map((label, i) => (
          <div key={label} className={`flex-1 border-b-2 pb-2 ${step === i + 1 ? 'border-zinc-900 font-medium text-zinc-900' : 'border-zinc-200'}`}>
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-2">
          {PROJECT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setProjectType(t.value)}
              className={`rounded border p-3 text-left ${projectType === t.value ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'}`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-sm text-zinc-500">{t.description}</div>
            </button>
          ))}
          <button
            disabled={!projectType}
            onClick={() => setStep(2)}
            className="mt-2 self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Project name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Objective</span>
            <textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
          </label>

          {projectType === 'experiment' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">What is your hypothesis?</span>
                <input onChange={(e) => setDetail('hypothesis', e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">What result would justify the change?</span>
                <input onChange={(e) => setDetail('success_criteria', e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
              </label>
            </>
          )}
          {projectType === 'consulting' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">What business problem are you solving?</span>
                <input onChange={(e) => setDetail('business_problem', e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">What outcome matters?</span>
                <input onChange={(e) => setDetail('target_outcome', e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
              </label>
            </>
          )}
          {projectType === 'transformation' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Current pain point</span>
                <input onChange={(e) => setDetail('pain_point', e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Baseline metric</span>
                <input onChange={(e) => setDetail('baseline_metric', e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
              </label>
            </>
          )}

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="rounded border border-zinc-300 px-4 py-2 text-sm">Back</button>
            <button disabled={!name} onClick={() => setStep(3)} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked readOnly />
            Use Platform Knowledge (AI Engineering Wiki)
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Attach an existing project knowledge base (optional)</span>
            <select value={knowledgeBaseId} onChange={(e) => setKnowledgeBaseId(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
              <option value="">None</option>
              {knowledgeBases.map((kb) => (
                <option key={kb.id} value={kb.id}>{kb.label}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="rounded border border-zinc-300 px-4 py-2 text-sm">Back</button>
            <button onClick={() => setStep(4)} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Benchmark (optional)</span>
            <select value={evalDatasetId} onChange={(e) => setEvalDatasetId(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
              <option value="">No benchmark yet</option>
              {evalDatasets.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="rounded border border-zinc-300 px-4 py-2 text-sm">Back</button>
            <button onClick={() => setStep(5)} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Next</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-600">You become the project Owner automatically. Add anyone else who needs access.</p>
          <div className="flex gap-2">
            <input
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="Existing user's email"
              className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
            />
            <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as ProjectRole)} className="rounded border border-zinc-300 px-3 py-2 text-sm">
              {TEAM_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button type="button" onClick={addStagedMember} className="rounded border border-zinc-300 px-4 py-2 text-sm">
              Add
            </button>
          </div>
          {members.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {members.map((m, i) => (
                <li key={`${m.email}-${i}`} className="flex items-center justify-between rounded border border-zinc-200 px-3 py-1.5">
                  <span>
                    {m.email} <span className="text-zinc-500">— {m.role}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-600 underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setStep(4)} className="rounded border border-zinc-300 px-4 py-2 text-sm">Back</button>
            <button disabled={submitting} onClick={handleSubmit} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
