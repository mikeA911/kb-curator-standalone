'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProjectNoteAction } from '@/app/actions/project-notes'
import type { ProjectNoteRecipientType } from '@/types/database'

export interface ProjectMemberOption {
  userId: string
  email: string
}

export function ProjectNoteForm({
  projectId,
  members,
  prefillContextType,
  prefillContextId,
  prefillRecipientUserId,
}: {
  projectId: string
  members: ProjectMemberOption[]
  prefillContextType?: string
  prefillContextId?: string
  // Member Directory's "Send note" link (docs/dev-request-role-aware-
  // project-views-and-ember-first-workspace.md, View 2) -- pre-addresses
  // this form to one member rather than requiring the sender to find them
  // again in the dropdown. Only honored when it's actually in `members`
  // (an active member of this project), otherwise falls back to the
  // ordinary default.
  prefillRecipientUserId?: string
}) {
  const router = useRouter()
  const prefillIsValidMember = !!prefillRecipientUserId && members.some((m) => m.userId === prefillRecipientUserId)
  const [recipientType, setRecipientType] = useState<ProjectNoteRecipientType>(prefillIsValidMember ? 'user' : 'project_team')
  const [recipientUserId, setRecipientUserId] = useState(prefillIsValidMember ? prefillRecipientUserId! : (members[0]?.userId ?? ''))
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (recipientType === 'user' && !recipientUserId) {
      setError('Choose who this note is addressed to')
      return
    }
    startTransition(async () => {
      try {
        const { noteId } = await createProjectNoteAction({
          projectId,
          recipientType,
          recipientUserId: recipientType === 'user' ? recipientUserId : null,
          subject,
          body,
          contextType: prefillContextType ?? null,
          contextId: prefillContextId ?? null,
        })
        router.push(`/projects/${projectId}/notes/${noteId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send note')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
      {prefillContextType && (
        <p className="text-xs text-zinc-500">
          Attached to: {prefillContextType} · {prefillContextId}
        </p>
      )}
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">To</span>
          <select
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value as ProjectNoteRecipientType)}
            className="rounded border border-zinc-300 px-3 py-2"
          >
            <option value="project_team">Whole project team</option>
            <option value="user">A specific member</option>
            <option value="curator">Any curator</option>
            <option value="admin">Any admin</option>
          </select>
        </label>
        {recipientType === 'user' && (
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Member</span>
            <select
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.email}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Note</span>
        <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} className="rounded border border-zinc-300 px-3 py-2" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={isPending} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {isPending ? 'Sending…' : 'Send note'}
      </button>
    </form>
  )
}
