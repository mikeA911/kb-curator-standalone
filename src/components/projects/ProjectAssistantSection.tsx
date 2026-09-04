'use client'

import { useState } from 'react'
import { ChatPanel } from '@/components/chat/ChatPanel'
import type { Conversation } from '@/types/database'

// Project-Aware Knowledge and Assistant Context, Stage 2. Opening the panel
// always resumes this project's most recent conversation (ChatPanel's own
// auto-resume effect, now project-scoped) -- the list below is for
// visibility and quick access into the panel's own History dropdown to
// switch conversations, not a per-item resume target of its own.
//
// Real cross-project leak found live 2026-09-04: ChatPanel's history/context
// effects only run once per mounted instance (see EmberHome.tsx's own
// comment on this) -- they don't re-fire just because the projectId prop
// changes on an already-mounted instance. Navigating client-side from one
// Project's page to another (without a full reload) left the SAME panel
// instance showing the previous Project's conversation, since React
// reconciles this component in place rather than remounting it. Fixed the
// same way EmberHome.tsx already handles its own project switcher:
// key={projectId} forces a clean remount, and a fresh mount is what
// actually re-runs the history/context fetch for the new Project.
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
        <ChatPanel key={projectId} projectId={projectId} embedded onClose={() => setShowPanel(false)} />
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
