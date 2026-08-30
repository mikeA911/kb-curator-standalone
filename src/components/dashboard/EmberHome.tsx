'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChatPanel } from '@/components/chat/ChatPanel'
import type { MemberProjectOption } from '@/lib/projects/queries'

export interface RecentConversationRow {
  id: string
  title: string | null
  projectId: string | null
  projectName: string | null
}

// Ember-first home for ordinary members (docs/dev-request-role-aware-
// project-views-and-ember-first-workspace.md, View 3). Reuses ChatPanel's
// existing project-bound mode exactly as ProjectAssistantSection.tsx does --
// this is a new home surface for choosing which Project to bind to, not a
// new chat engine. `key={selectedProjectId}` forces a clean remount on every
// switch: ChatPanel's own effects only fetch projectContext/history once per
// mounted instance, so changing the projectId prop on a live instance would
// not actually re-scope it -- the remount is what gives "start a new
// conversation, no carried-over evidence" when the Project changes.
export function EmberHome({
  projects,
  recentConversations,
  initialProjectId,
}: {
  projects: MemberProjectOption[]
  recentConversations: RecentConversationRow[]
  initialProjectId?: string
}) {
  const router = useRouter()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId && projects.some((p) => p.id === initialProjectId) ? initialProjectId : null
  )
  const [showPanel, setShowPanel] = useState(false)

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null

  function selectProject(id: string | null) {
    setSelectedProjectId(id)
    router.replace(id ? `/dashboard?ember=${id}` : '/dashboard', { scroll: false })
  }

  function openWithConversation(conv: RecentConversationRow) {
    selectProject(conv.projectId)
    setShowPanel(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Hi, ready to get started?</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Ask Ember about a Project&rsquo;s own knowledge, or ask a general platform question.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-zinc-700">Project</span>
            <select
              value={selectedProjectId ?? ''}
              onChange={(e) => selectProject(e.target.value || null)}
              className="rounded border border-zinc-300 px-2 py-1 text-sm"
            >
              <option value="">General platform guidance</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
            Using: {selectedProject ? selectedProject.name : 'General platform guidance'}
          </span>
        </div>

        {showPanel ? (
          <ChatPanel key={selectedProjectId ?? 'general'} projectId={selectedProjectId ?? undefined} embedded onClose={() => setShowPanel(false)} />
        ) : (
          <button type="button" onClick={() => setShowPanel(true)} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
            Ask Ember
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recent conversations</h2>
        {recentConversations.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {recentConversations.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => openWithConversation(c)} className="underline">
                  {c.title || 'Untitled conversation'}
                </button>
                <span className="ml-1 text-zinc-400">({c.projectName ?? 'General'})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No conversations yet.</p>
        )}
      </div>

      <Link href="/projects" className="self-start text-sm underline">
        Explore workspace &rarr;
      </Link>
    </div>
  )
}
