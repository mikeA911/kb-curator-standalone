'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  sendChatMessageAction,
  listChatModelsAction,
  getChatActivityAction,
  listRecentConversationsAction,
  getConversationMessagesAction,
  getAssistantOverviewAction,
} from '@/app/actions/chat'
import type { ChatModelOption } from '@/lib/ai'
import type { ModelSelection } from '@/lib/chat/loop'
import type { DisplayMessage } from '@/lib/chat/conversations'
import type { Conversation } from '@/types/database'
import { Markdown } from '@/components/shared/Markdown'

type PanelMessage = DisplayMessage & { embeddingModelDisplayName?: string }
type AssistantOverview = Awaited<ReturnType<typeof getAssistantOverviewAction>>

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
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [assistantOverview, setAssistantOverview] = useState<AssistantOverview | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const historyDetailsRef = useRef<HTMLDetailsElement>(null)
  // Synchronous re-entry guard for send()/retry() -- isPending (state) isn't
  // enough on its own, since a second call can read the pre-update isPending
  // value from the current render's closure before React flushes the state
  // change that would disable the button (observed live: a fast double-click
  // or double-Enter could submit the same turn twice).
  const sendingRef = useRef(false)
  // Set the instant the user starts a new conversation, resumes one, or
  // sends a message -- their action always wins over a still-in-flight
  // auto-resume from the effect below (observed live: opening the panel and
  // acting before the delayed history load finished let the load silently
  // replace the active conversation once it resolved).
  const userActedRef = useRef(false)
  // Identifies which performTurn() call owns the pending/sendingRef/activity
  // state. Bumped both at the start of every new turn and whenever the user
  // switches conversations mid-turn (handleResume/handleNewConversation) --
  // a turn whose number no longer matches is stale and must not touch
  // shared state when it resolves, however late. Without this, a slow
  // response from conversation A landed in whichever conversation happened
  // to be displayed by the time it finished (regression: completion from
  // one conversation appearing in another after switching History).
  const turnSeqRef = useRef(0)
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [staleRun, setStaleRun] = useState(false)

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
        // The History list itself is always safe to refresh, independent of
        // whether the active conversation gets auto-resumed below.
        setConversations(list)
        if (userActedRef.current) return
        if (list.length === 0) {
          setShowOnboarding(true)
          return
        }
        const mostRecent = list[0]
        try {
          const msgs = await getConversationMessagesAction(mostRecent.id)
          if (cancelled || userActedRef.current) return
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

  // Shared by send() (which has already pushed the user bubble) and retry()
  // (which must not push a second one for the same failed turn).
  async function performTurn(message: string) {
    const modelSelection: ModelSelection | undefined = selectedModel
      ? { providerName: selectedModel.providerName, modelId: selectedModel.modelId }
      : undefined
    turnSeqRef.current += 1
    const myTurn = turnSeqRef.current
    setIsPending(true)
    setStaleRun(false)
    // Purely informational -- the provider call itself is already bounded
    // (60s per request), so this never invents a failure. It just gives the
    // user a visible way out if a turn is taking unusually long instead of
    // leaving "Thinking..." on screen with no recourse (regression: a
    // completed response only became visible after opening History).
    staleTimerRef.current = setTimeout(() => {
      if (myTurn === turnSeqRef.current) setStaleRun(true)
    }, 30_000)
    try {
      const result = await sendChatMessageAction(conversationId, message, modelSelection)
      // The user may have switched to a different conversation (or started
      // a new one) while this was in flight -- a stale turn's result must
      // never overwrite what's currently displayed.
      if (myTurn !== turnSeqRef.current) return
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
      setLastFailedMessage(null)
    } catch (err) {
      if (myTurn !== turnSeqRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Kept as a durable per-turn failure state (not just a transient
      // banner) so the user can retry the exact same message rather than
      // retyping it -- the user's bubble is already visible and stays put.
      setLastFailedMessage(message)
    } finally {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current)
      if (myTurn === turnSeqRef.current) {
        setIsPending(false)
        setStaleRun(false)
        sendingRef.current = false
      }
    }
  }

  // Recovery action for a turn stuck past the stale threshold: reconcile
  // from the server's own record of the conversation instead of requiring
  // the user to discover the completed reply by opening History. Also
  // invalidates the stuck turn so its eventual (possibly very late)
  // resolution can't re-apply or duplicate anything.
  async function recoverStuckTurn() {
    turnSeqRef.current += 1
    setIsPending(false)
    setStaleRun(false)
    sendingRef.current = false
    if (!conversationId) return
    try {
      const msgs = await getConversationMessagesAction(conversationId)
      setMessages(msgs)
    } catch {
      // Reconciliation is best-effort -- if it fails, the user still has
      // working controls and can simply try again.
    }
  }

  async function send(message: string) {
    if (!message || sendingRef.current) return
    sendingRef.current = true
    userActedRef.current = true
    setError(null)
    setLastFailedMessage(null)
    setInput('')
    setDetailsOpenFor(null)
    setActivity(null)
    setShowOnboarding(false)
    setShowShortWelcome(false)
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    await performTurn(message)
  }

  async function retry() {
    if (!lastFailedMessage || sendingRef.current) return
    sendingRef.current = true
    setError(null)
    setActivity(null)
    await performTurn(lastFailedMessage)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await send(input.trim())
  }

  // Any turn in flight for the conversation being left behind must stop
  // being able to affect what's on screen -- otherwise its late completion
  // (or its now-orphaned isPending/sendingRef) would either disable the
  // conversation the user just switched to, or splice its reply into the
  // wrong conversation's message list once it resolves.
  function abandonInFlightTurn() {
    turnSeqRef.current += 1
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current)
    setIsPending(false)
    setStaleRun(false)
    sendingRef.current = false
  }

  function handleNewConversation() {
    userActedRef.current = true
    abandonInFlightTurn()
    setConversationId(null)
    setMessages([])
    setDetailsOpenFor(null)
    setActivity(null)
    setError(null)
    setLastFailedMessage(null)
    setShowOnboarding(false)
    // Starting a new conversation never replaces prior history -- it only
    // resets local state; the short contextual welcome, not the full
    // greeting, matches "don't repeat the full greeting" (criterion #10).
    setShowShortWelcome(true)
  }

  async function handleResume(conv: Conversation) {
    userActedRef.current = true
    abandonInFlightTurn()
    historyDetailsRef.current?.removeAttribute('open')
    setShowOnboarding(false)
    setShowShortWelcome(false)
    setDetailsOpenFor(null)
    setActivity(null)
    setError(null)
    setLastFailedMessage(null)
    setConversationId(conv.id)
    try {
      const msgs = await getConversationMessagesAction(conv.id)
      setMessages(msgs)
    } catch {
      setMessages([])
    }
  }

  const headerModelLabel = selectedModel ? `${selectedModel.providerDisplayName} · ${selectedModel.modelDisplayName}` : null

  // Lazy-loaded on first open (details' onToggle fires on every open/close,
  // not just the first) so this popover never costs a Server Action call
  // just because the chat panel mounted -- same lazy-load spirit as the
  // model list above.
  function loadAssistantOverviewOnce() {
    if (assistantOverview) return
    getAssistantOverviewAction()
      .then(setAssistantOverview)
      .catch(() => {
        // Best-effort -- the popover just stays empty if this fails.
      })
  }

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
            <details className="relative mt-1" onToggle={loadAssistantOverviewOnce}>
              <summary className="cursor-pointer list-none text-xs text-zinc-400 hover:text-zinc-600">How this Assistant works</summary>
              <div className="absolute left-0 z-10 mt-1 max-h-96 w-80 overflow-y-auto rounded border border-zinc-200 bg-white p-3 text-xs shadow-lg">
                {!assistantOverview && <p className="text-zinc-400">Loading…</p>}
                {assistantOverview && (
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="font-medium text-zinc-800">{assistantOverview.name}</p>
                      <p className="mt-0.5 text-zinc-600">{assistantOverview.purpose}</p>
                    </div>
                    {headerModelLabel && (
                      <p className="text-zinc-500">
                        Currently answering with: <span className="text-zinc-700">{headerModelLabel}</span>
                      </p>
                    )}
                    <p className="text-zinc-500">
                      Prompt version: <span className="text-zinc-700">{assistantOverview.promptVersion}</span>
                    </p>
                    <p className="text-zinc-600">{assistantOverview.plainLanguageExplanation}</p>
                    <p className="text-zinc-500">User → Model → Tools (if needed) → Response</p>
                    <div>
                      <p className="font-medium text-zinc-500">Tools</p>
                      <ul className="mt-0.5 flex flex-col gap-0.5">
                        {assistantOverview.tools.map((t) => (
                          <li key={t.name} className="text-zinc-600">
                            {t.name} — {t.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-500">Guardrails</p>
                      <ul className="mt-0.5 flex flex-col gap-0.5">
                        {assistantOverview.guardrails.map((g) => (
                          <li key={g.label} className="text-zinc-600">
                            {g.label} — {g.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Link href="/agents/workbench-assistant" className="text-zinc-500 underline hover:text-zinc-700">
                      View full Agent flow →
                    </Link>
                  </div>
                )}
              </div>
            </details>
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
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="text-right text-sm">
                  <span className="inline-block max-w-[85%] whitespace-pre-wrap rounded bg-zinc-900 px-2 py-1 text-white">{m.content}</span>
                </div>
              ) : (
                <div key={i} className="text-sm">
                  <div className="inline-block max-w-[95%] rounded bg-zinc-100 px-2 py-1">
                    <Markdown text={m.content} />
                  </div>
                  {m.providerDisplayName && (
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
            {isPending && !staleRun && <p className="text-sm text-zinc-400">{activity ?? (conversationId ? 'Working…' : 'Thinking…')}</p>}
            {isPending && staleRun && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-zinc-400">This is taking longer than expected.</p>
                {conversationId && (
                  <button
                    type="button"
                    onClick={recoverStuckTurn}
                    className="shrink-0 rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50"
                  >
                    Refresh conversation
                  </button>
                )}
              </div>
            )}
            {error && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-red-600">{error}</p>
                {lastFailedMessage && (
                  <button
                    type="button"
                    onClick={retry}
                    disabled={isPending}
                    className="shrink-0 rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
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
