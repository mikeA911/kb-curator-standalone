'use client'

import { useState, useTransition } from 'react'
import type { KnowledgeBase } from '@/types/database'
import { createKnowledgeBase, deleteKnowledgeBase } from '@/app/actions/admin'

export function KBManagement({ knowledgeBases }: { knowledgeBases: KnowledgeBase[] }) {
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const active = knowledgeBases.filter((kb) => kb.lifecycle_status !== 'reference' && kb.lifecycle_status !== 'archived')
  const legacy = knowledgeBases.filter((kb) => kb.lifecycle_status === 'reference' || kb.lifecycle_status === 'archived')

  function renderKnowledgeBase(kb: KnowledgeBase, allowDelete: boolean) {
    return (
      <li key={kb.id} className="flex items-start justify-between gap-3 rounded border border-zinc-200 bg-white px-4 py-3 text-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{kb.name}</span>
            <span className="text-zinc-500">({kb.id})</span>
            {kb.classification && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">{kb.classification}</span>}
            {kb.lifecycle_status && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">{kb.lifecycle_status}</span>}
          </div>
          {kb.description && <p className="mt-1 text-xs text-zinc-500">{kb.description}</p>}
          {kb.origin && <p className="mt-1 text-xs text-zinc-400">Origin: {kb.origin}</p>}
        </div>
        {allowDelete && (
          <button
            disabled={isPending}
            onClick={() => startTransition(() => deleteKnowledgeBase(kb.id))}
            className="text-xs text-red-600 underline disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </li>
    )
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createKnowledgeBase(id, name, description)
        setId('')
        setName('')
        setDescription('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create')
      }
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Knowledge bases</h2>
      <h3 className="text-sm font-medium">Active knowledge bases</h3>
      <ul className="flex flex-col gap-2">{active.map((kb) => renderKnowledgeBase(kb, true))}</ul>
      {legacy.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <h3 className="text-sm font-medium">Legacy knowledge bases</h3>
          <p className="text-xs text-zinc-500">Retained for historical reference. They are unavailable for new uploads, projects, queues, or assignments.</p>
          <ul className="flex flex-col gap-2">{legacy.map((kb) => renderKnowledgeBase(kb, false))}</ul>
        </div>
      )}
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
        <input placeholder="id" value={id} onChange={(e) => setId(e.target.value)} required className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} required className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        <input placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        <button disabled={isPending} className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Add</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
