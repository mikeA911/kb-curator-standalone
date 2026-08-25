'use client'

import { useState } from 'react'
import { ChatPanel } from '@/components/chat/ChatPanel'
import type { Conversation } from '@/types/database'

// Project-Aware Knowledge and Assistant Context, Stage 2. Opening the panel
// always resumes this project's most recent conversation (ChatPanel's own
// auto-resume effect, now project-scoped) -- the list below is for
// visibility and quick access into the panel's own History dropdown to
// switch conversations, not a per-item resume target of its own.
export function ProjectAssistantSection({
  projectId,
  recentConversations,
}: {
  projectId: string
  recentConversations: Conversation[]
}) {
  const [showPanel, setShowPanel] = useState(false)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Ember</h2>
        {!showPanel && (
          <button type="button" onClick={() => setShowPanel(true)} className="text-sm underline">
            Ask Ember about this project
          </button>
        )}
      </div>
      {showPanel ? (
        <ChatPanel projectId={projectId} embedded onClose={() => setShowPanel(false)} />
      ) : recentConversations.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {recentConversations.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setShowPanel(true)} className="underline">
                {c.title || 'Untitled conversation'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No conversations about this project yet.</p>
      )}
    </section>
  )
}
