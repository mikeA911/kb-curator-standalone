'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiSourceType } from '@/types/database'
import { linkSourceAction, unlinkSourceAction } from '@/app/actions/wiki'

export interface LinkableSource {
  id: string
  title: string
  knowledge_base_id: string
  current_version_id: string
}

// Project-Aware Knowledge and Assistant Context, Stage 1: replaces the old
// free-text document/chunk-id input (a "proof-of-concept" per the original
// comment here) with the same type-to-filter picker RelatedArticlesManager
// already established. Chunk-level and external sources keep their simpler
// forms -- there's no chunk picker yet, and "external" never had an id to
// begin with -- this only fixes the document case, which is what the smoke
// test and the dev request both call out.
export function SourceManager({ versionId, knowledgeSources }: { versionId: string; knowledgeSources: LinkableSource[] }) {
  const router = useRouter()
  const [sourceType, setSourceType] = useState<WikiSourceType>('document')
  const [query, setQuery] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [chunkId, setChunkId] = useState('')
  const [relationship, setRelationship] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return knowledgeSources.slice(0, 8)
    return knowledgeSources.filter((s) => s.title.toLowerCase().includes(q) || s.knowledge_base_id.toLowerCase().includes(q)).slice(0, 8)
  }, [knowledgeSources, query])

  function selectSource(s: LinkableSource) {
    setQuery(s.title)
    setSelectedSourceId(s.id)
    setOpen(false)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (sourceType === 'chunk' && !chunkId.trim()) {
      setError('Provide a chunk id')
      return
    }
    if (sourceType === 'document' && !selectedSourceId) {
      setError('Pick a source from the list')
      return
    }
    const selectedSource = knowledgeSources.find((s) => s.id === selectedSourceId)
    startTransition(async () => {
      try {
        await linkSourceAction({
          wikiVersionId: versionId,
          sourceType,
          documentId: sourceType === 'document' ? selectedSource?.current_version_id : undefined,
          chunkId: sourceType === 'chunk' ? chunkId.trim() : undefined,
          relationship: relationship || undefined,
          notes: notes || undefined,
        })
        setQuery('')
        setSelectedSourceId(null)
        setChunkId('')
        setRelationship('')
        setNotes('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to link source')
      }
    })
  }

  return (
    <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
      <select
        value={sourceType}
        onChange={(e) => {
          setSourceType(e.target.value as WikiSourceType)
          setQuery('')
          setSelectedSourceId(null)
        }}
        className="rounded border border-zinc-300 px-2 py-1 text-xs"
      >
        <option value="document">Document</option>
        <option value="chunk">Chunk</option>
        <option value="external">External</option>
      </select>

      {sourceType === 'document' && (
        <div className="relative">
          <input
            placeholder="Search sources by title…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedSourceId(null)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="w-56 rounded border border-zinc-300 px-2 py-1 text-xs"
          />
          {open && matches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-56 overflow-auto rounded border border-zinc-200 bg-white text-xs shadow-sm">
              {matches.map((s) => (
                <li key={s.id}>
                  <button type="button" onMouseDown={() => selectSource(s)} className="flex w-full flex-col px-2 py-1.5 text-left hover:bg-zinc-50">
                    <span>{s.title}</span>
                    <span className="text-zinc-400">{s.knowledge_base_id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sourceType === 'chunk' && (
        <input
          placeholder="chunk id"
          value={chunkId}
          onChange={(e) => setChunkId(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1 text-xs"
        />
      )}

      <input
        placeholder="relationship (optional)"
        value={relationship}
        onChange={(e) => setRelationship(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1 text-xs"
      />
      <input
        placeholder={sourceType === 'external' ? 'description' : 'notes (optional)'}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1 text-xs"
      />
      <button disabled={isPending} className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50">
        Add
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  )
}

export function SourceRemoveButton({ sourceId }: { sourceId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await unlinkSourceAction(sourceId)
          router.refresh()
        })
      }
      disabled={isPending}
      className="text-xs text-red-600 underline disabled:opacity-50"
    >
      Remove
    </button>
  )
}
