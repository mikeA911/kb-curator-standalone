'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiSourceType } from '@/types/database'
import { linkSourceAction, unlinkSourceAction } from '@/app/actions/wiki'

// Deliberately minimal: a curator pastes a document/chunk id (visible in the
// curator review UI) rather than a full picker widget -- proof-of-concept
// provenance linking, not a polished evidence browser, per the brief's scope.
// Only the add-form lives here; the read-only source list (with remove
// buttons via SourceRemoveButton) is rendered once by the article page --
// having both components render their own copy of the list was a redundant
// duplicate display, not a data bug.
export function SourceManager({ versionId }: { versionId: string }) {
  const router = useRouter()
  const [sourceType, setSourceType] = useState<WikiSourceType>('chunk')
  const [refId, setRefId] = useState('')
  const [relationship, setRelationship] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (sourceType !== 'external' && !refId.trim()) {
      setError('Provide a document or chunk id')
      return
    }
    startTransition(async () => {
      try {
        await linkSourceAction({
          wikiVersionId: versionId,
          sourceType,
          documentId: sourceType === 'document' ? refId.trim() : undefined,
          chunkId: sourceType === 'chunk' ? refId.trim() : undefined,
          relationship: relationship || undefined,
          notes: notes || undefined,
        })
        setRefId('')
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
      <select value={sourceType} onChange={(e) => setSourceType(e.target.value as WikiSourceType)} className="rounded border border-zinc-300 px-2 py-1 text-xs">
        <option value="chunk">Chunk</option>
        <option value="document">Document</option>
        <option value="external">External</option>
      </select>
      {sourceType !== 'external' && (
        <input
          placeholder={`${sourceType} id`}
          value={refId}
          onChange={(e) => setRefId(e.target.value)}
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
