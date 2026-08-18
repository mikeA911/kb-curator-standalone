'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { sendChatMessageAction } from '@/app/actions/chat'

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
}

// Same open/close + outside-click + Escape dismissal convention as
// NavDropdown.tsx -- the closest existing "toggle panel" pattern in this
// codebase. No streaming (see M6D design note discussion): sendChatMessageAction
// runs the full tool-calling loop server-side and returns the complete
// reply, same useTransition pending-state pattern used everywhere else
// Server Actions are called from a client component.
export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const message = input.trim()
    if (!message || isPending) return
    setError(null)
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    startTransition(async () => {
      try {
        const result = await sendChatMessageAction(conversationId, message)
        setConversationId(result.conversationId)
        setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message')
      }
    })
  }

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="flex h-[32rem] w-96 flex-col rounded border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
            <span className="text-sm font-medium">Workbench Assistant</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-zinc-400 hover:text-zinc-700">
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-zinc-500">
                Ask about the platform, search the Wiki, or ask me to create a project or workstream.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}>
                <span
                  className={`inline-block max-w-[85%] whitespace-pre-wrap rounded px-2 py-1 ${
                    m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  {m.content}
                </span>
              </div>
            ))}
            {isPending && <p className="text-sm text-zinc-400">Thinking…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-zinc-200 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Assistant…"
              disabled={isPending}
              className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
            />
            <button
              disabled={isPending || !input.trim()}
              className="rounded bg-zinc-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-zinc-800"
        >
          Ask Assistant
        </button>
      )}
    </div>
  )
}
