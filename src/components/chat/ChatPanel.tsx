'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { sendChatMessageAction, listChatModelsAction, getChatActivityAction } from '@/app/actions/chat'
import type { ChatModelOption } from '@/lib/ai'
import type { ModelSelection } from '@/lib/chat/loop'

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
  providerDisplayName?: string
  modelDisplayName?: string
  toolsUsed?: string[]
  embeddingModelDisplayName?: string
}

function modelKey(m: { providerName: string; modelId: string }): string {
  return `${m.providerName}::${m.modelId}`
}

// Same open/close + outside-click + Escape dismissal convention as
// NavDropdown.tsx -- the closest existing "toggle panel" pattern in this
// codebase. No streaming (see M6D/M6E design note discussion):
// sendChatMessageAction runs the full tool-calling loop server-side and
// returns the complete reply. Pending state is a plain boolean, not
// useTransition -- the activity poll below also calls a Server Action
// concurrently, and empirically that leaves useTransition's `isPending`
// stuck true indefinitely (observed live: the poll kept firing every
// 1.2s well after the reply had already rendered). A manual flag with
// try/finally is immune to whatever transition-lane interaction causes
// that, and behaves identically from the UI's perspective.
export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [models, setModels] = useState<ChatModelOption[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [detailsOpenFor, setDetailsOpenFor] = useState<number | null>(null)
  const [activity, setActivity] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || models.length > 0) return
    listChatModelsAction()
      .then((opts) => {
        setModels(opts)
        const def = opts.find((m) => m.isDefault) ?? opts[0]
        if (def) setSelectedKey(modelKey(def))
      })
      .catch(() => {
        // Model list is a convenience for the picker/header -- if it fails
        // the Assistant still works, just without a visible model identity
        // until the first reply comes back.
      })
  }, [open, models.length])

  useEffect(() => {
    if (!open) return
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [open])

  // Real (not simulated) activity feedback: polls whatever the tool-calling
  // loop has most recently persisted for this conversation. Only possible
  // once a conversationId is known client-side, which happens after the
  // FIRST turn completes -- so the very first message in a session just
  // shows a static "Thinking..." below, and polling kicks in from the
  // second message onward.
  useEffect(() => {
    if (!isPending || !conversationId) return
    const interval = setInterval(() => {
      getChatActivityAction(conversationId)
        .then(setActivity)
        .catch(() => {})
    }, 1200)
    return () => clearInterval(interval)
  }, [isPending, conversationId])

  const selectedModel = models.find((m) => modelKey(m) === selectedKey)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const message = input.trim()
    if (!message || isPending) return
    setError(null)
    setInput('')
    setDetailsOpenFor(null)
    setActivity(null)
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    const modelSelection: ModelSelection | undefined = selectedModel
      ? { providerName: selectedModel.providerName, modelId: selectedModel.modelId }
      : undefined
    setIsPending(true)
    try {
      const result = await sendChatMessageAction(conversationId, message, modelSelection)
      setConversationId(result.conversationId)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.reply,
          providerDisplayName: result.providerDisplayName,
          modelDisplayName: result.modelDisplayName,
          toolsUsed: result.toolsUsed,
          embeddingModelDisplayName: result.embeddingModelDisplayName,
        },
      ])
      // The model that actually served this turn is now known -- if the
      // user hadn't picked one yet, reflect it in the picker/header.
      if (!selectedKey) setSelectedKey(`${result.providerName}::${result.modelId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsPending(false)
    }
  }

  const headerModelLabel = selectedModel ? `${selectedModel.providerDisplayName} · ${selectedModel.modelDisplayName}` : null

  return (
    <div ref={ref} className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="flex h-[32rem] w-96 flex-col rounded border border-zinc-200 bg-white shadow-xl">
          <div className="border-b border-zinc-200 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Workbench Assistant</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-zinc-400 hover:text-zinc-700">
                ✕
              </button>
            </div>
            {models.length > 0 && (
              <select
                value={selectedKey ?? ''}
                onChange={(e) => setSelectedKey(e.target.value)}
                disabled={isPending}
                className="mt-1 w-full rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-xs text-zinc-600"
              >
                {models.map((m) => (
                  <option key={modelKey(m)} value={modelKey(m)}>
                    {m.providerDisplayName} · {m.modelDisplayName}
                    {m.isDefault ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            )}
            {!models.length && headerModelLabel && <p className="mt-0.5 text-xs text-zinc-400">{headerModelLabel}</p>}
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
                {m.role === 'assistant' && m.providerDisplayName && (
                  <div className="mt-0.5">
                    <button
                      type="button"
                      onClick={() => setDetailsOpenFor(detailsOpenFor === i ? null : i)}
                      className="text-xs text-zinc-400 underline hover:text-zinc-600"
                    >
                      Details
                    </button>
                    {detailsOpenFor === i && (
                      <div className="mt-1 rounded border border-zinc-200 bg-zinc-50 p-2 text-left text-xs text-zinc-500">
                        <p>
                          Generated by: {m.providerDisplayName} / {m.modelDisplayName}
                        </p>
                        <p>Workbench tools used: {m.toolsUsed && m.toolsUsed.length > 0 ? m.toolsUsed.join(', ') : 'none'}</p>
                        {m.embeddingModelDisplayName && (
                          <>
                            <p>Knowledge retrieval: Platform Wiki</p>
                            <p>Embedding model: {m.embeddingModelDisplayName}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isPending && <p className="text-sm text-zinc-400">{activity ?? (conversationId ? 'Working…' : 'Thinking…')}</p>}
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
          title="Ask Assistant"
          aria-label="Ask Assistant"
          className="block h-14 w-14 overflow-hidden rounded-full shadow-lg transition-transform hover:scale-105"
        >
          <Image src="/images/assistant-icon.png" alt="" width={56} height={56} priority className="h-full w-full object-cover" />
        </button>
      )}
    </div>
  )
}
