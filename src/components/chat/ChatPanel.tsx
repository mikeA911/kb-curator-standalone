'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import {
  sendChatMessageAction,
  listChatModelsAction,
  getChatActivityAction,
  listRecentConversationsAction,
  getConversationMessagesAction,
} from '@/app/actions/chat'
import type { ChatModelOption } from '@/lib/ai'
import type { ModelSelection } from '@/lib/chat/loop'
import type { DisplayMessage } from '@/lib/chat/conversations'
import type { Conversation } from '@/types/database'

type PanelMessage = DisplayMessage & { embeddingModelDisplayName?: string }

function modelKey(m: { providerName: string; modelId: string }): string {
  return `${m.providerName}::${m.modelId}`
}

// docs/dev-request-assistant-first-use-onboarding-and-history.md's own
// suggested copy -- shown as a client-only bubble, never sent to the server,
// never persisted, so it has no model cost or provenance (Acceptance
// criteria #1-2).
const ONBOARDING_GREETING =
  "Hi! I’m your Workbench Assistant, and I’m excited to explore KB Sandbox with you. We can investigate what you’re trying to accomplish, find the right Workbench method, check what information you already have, search approved platform guidance, and help you create projects or workstreams.\n\nYour Assistant conversations are saved to your account, so you can return to them in future sessions. What would you like to explore first?"

const STARTER_PROMPTS = [
  'Help me choose the right Workbench method.',
  'Show me what KB Sandbox can do.',
  'Help me turn an idea into a project.',
  'Explain what information I need to get started.',
]

const SHORT_WELCOME = "Welcome back — would you like to continue where we left off or start something new?"

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
  const [messages, setMessages] = useState<PanelMessage[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [models, setModels] = useState<ChatModelOption[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [detailsOpenFor, setDetailsOpenFor] = useState<number | null>(null)
  const [activity, setActivity] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showShortWelcome, setShowShortWelcome] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const historyDetailsRef = useRef<HTMLDetailsElement>(null)

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

  // Server-scoped, not a client flag: whether this user has ANY saved
  // conversation is what determines first-use vs. returning, so a reload or
  // a cleared browser cache never re-triggers the full greeting (design
  // doc's "First-use definition"). Runs once per mount, not on every open.
  useEffect(() => {
    if (!open || historyLoaded) return
    let cancelled = false
    listRecentConversationsAction()
      .then(async (list) => {
        if (cancelled) return
        setConversations(list)
        if (list.length === 0) {
          setShowOnboarding(true)
          return
        }
        const mostRecent = list[0]
        try {
          const msgs = await getConversationMessagesAction(mostRecent.id)
          if (cancelled) return
          setConversationId(mostRecent.id)
          setMessages(msgs)
        } catch {
          // Resuming is a convenience -- if it fails, fall back to a blank
          // panel the user can still start chatting in.
        }
      })
      .catch(() => {
        // History is a convenience -- if it fails, the panel still works as
        // a blank slate, just without onboarding or auto-resume.
      })
      .finally(() => {
        if (!cancelled) setHistoryLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, historyLoaded])

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

  async function send(message: string) {
    if (!message || isPending) return
    setError(null)
    setInput('')
    setDetailsOpenFor(null)
    setActivity(null)
    setShowOnboarding(false)
    setShowShortWelcome(false)
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
      // A brand-new conversation was just created -- it belongs at the top
      // of History from now on, without waiting for a full reload.
      setConversations((prev) => (prev.some((c) => c.id === result.conversationId) ? prev : [{ id: result.conversationId } as Conversation, ...prev]))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsPending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await send(input.trim())
  }

  function handleNewConversation() {
    setConversationId(null)
    setMessages([])
    setDetailsOpenFor(null)
    setActivity(null)
    setError(null)
    setShowOnboarding(false)
    // Starting a new conversation never replaces prior history -- it only
    // resets local state; the short contextual welcome, not the full
    // greeting, matches "don't repeat the full greeting" (criterion #10).
    setShowShortWelcome(true)
  }

  async function handleResume(conv: Conversation) {
    historyDetailsRef.current?.removeAttribute('open')
    setShowOnboarding(false)
    setShowShortWelcome(false)
    setDetailsOpenFor(null)
    setActivity(null)
    setError(null)
    setConversationId(conv.id)
    try {
      const msgs = await getConversationMessagesAction(conv.id)
      setMessages(msgs)
    } catch {
      setMessages([])
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
            {historyLoaded && (
              <div className="mt-1 flex items-center justify-between">
                <details ref={historyDetailsRef} className="relative">
                  <summary className="cursor-pointer list-none text-xs text-zinc-400 hover:text-zinc-600">History</summary>
                  <div className="absolute left-0 z-10 mt-1 max-h-48 w-64 overflow-y-auto rounded border border-zinc-200 bg-white p-1 shadow-lg">
                    {conversations.length === 0 && <p className="px-2 py-1 text-xs text-zinc-400">No prior conversations yet.</p>}
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleResume(c)}
                        className={`block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-zinc-100 ${
                          c.id === conversationId ? 'bg-zinc-50 font-medium' : ''
                        }`}
                      >
                        {c.title || 'Untitled conversation'}
                      </button>
                    ))}
                  </div>
                </details>
                <button type="button" onClick={handleNewConversation} className="text-xs text-zinc-400 hover:text-zinc-600">
                  New conversation
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {showOnboarding && messages.length === 0 && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="inline-block max-w-[95%] whitespace-pre-wrap rounded bg-zinc-100 px-2 py-1 text-zinc-800">
                    {ONBOARDING_GREETING}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => send(prompt)}
                      disabled={isPending}
                      className="rounded-full border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {showShortWelcome && messages.length === 0 && <p className="text-sm text-zinc-500">{SHORT_WELCOME}</p>}
            {historyLoaded && !showOnboarding && !showShortWelcome && messages.length === 0 && (
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
