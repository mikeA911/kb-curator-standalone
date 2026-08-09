'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { CurationQueueItem, KnowledgeBase } from '@/types/database'
import { addCurationQueueItem, deleteCurationQueueItem } from '@/app/actions/admin'

export function CurationQueueManager({ queue, knowledgeBases }: { queue: CurationQueueItem[]; knowledgeBases: KnowledgeBase[] }) {
  const [kbId, setKbId] = useState(knowledgeBases[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await addCurationQueueItem(kbId, title, url)
        setTitle('')
        setUrl('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add')
      }
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Curation queue</h2>
      <ul className="flex flex-col gap-2">
        {queue.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded border border-zinc-200 bg-white px-4 py-2 text-sm">
            <span>
              {item.title} <span className="text-zinc-500">({item.kb_id})</span> — {item.status}
            </span>
            <div className="flex items-center gap-3">
              {item.status !== 'completed' && (
                <Link href={`/upload?kb=${item.kb_id}&sourceUrl=${encodeURIComponent(item.url)}`} className="text-xs underline">
                  Curate
                </Link>
              )}
              <button
                disabled={isPending}
                onClick={() => startTransition(() => deleteCurationQueueItem(item.id))}
                className="text-xs text-red-600 underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <select value={kbId} onChange={(e) => setKbId(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
          {knowledgeBases.map((kb) => (
            <option key={kb.id} value={kb.id}>{kb.name}</option>
          ))}
        </select>
        <input placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        <input placeholder="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm" />
        <button disabled={isPending} className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Add</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
