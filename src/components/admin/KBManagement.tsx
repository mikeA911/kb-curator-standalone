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
      <ul className="flex flex-col gap-2">
        {knowledgeBases.map((kb) => (
          <li key={kb.id} className="flex items-center justify-between rounded border border-zinc-200 bg-white px-4 py-2 text-sm">
            <span><span className="font-medium">{kb.name}</span> <span className="text-zinc-500">({kb.id})</span></span>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => deleteKnowledgeBase(kb.id))}
              className="text-xs text-red-600 underline disabled:opacity-50"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
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
