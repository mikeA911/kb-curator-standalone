'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Document, DocumentChunk } from '@/types/database'
import {
  approveChunkAction,
  rejectChunkAction,
  saveChunkDraftAction,
  submitDocumentAction,
  enrichMoreChunks,
} from '@/app/actions/curator'

const REVIEW_STYLES: Record<DocumentChunk['review_status'], string> = {
  pending: 'bg-zinc-100 text-zinc-700',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  filtered: 'bg-zinc-200 text-zinc-600',
  enriching: 'bg-blue-100 text-blue-700',
  draft: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
}

export function ChunkReviewer({ document, chunks }: { document: Document; chunks: DocumentChunk[] }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const visible = chunks.filter((c) => !c.is_filtered)
  const chunk = visible[index]

  const resolvedCount = chunks.filter((c) => ['approved', 'rejected', 'filtered'].includes(c.review_status)).length
  const isComplete = chunks.length > 0 && resolvedCount === chunks.length
  const canSubmit = isComplete && document.processing_status === 'review'

  function run(action: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        setNotes('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  if (document.processing_status === 'failed') {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Processing failed at stage: {document.processing_error?.stage}</p>
        <p className="mt-1">{document.processing_error?.message}</p>
      </div>
    )
  }

  if (chunks.length === 0) {
    return <p className="text-zinc-600">No chunks yet — processing may still be in progress.</p>
  }

  if (!chunk) {
    return <p className="text-zinc-600">All chunks reviewed.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{document.original_filename}</h1>
        <p className="text-sm text-zinc-500">
          {resolvedCount}/{chunks.length} resolved · chunk {index + 1}/{visible.length}
          {chunk.source_page ? ` · page ${chunk.source_page}` : ''}
          {chunk.source_section ? ` · ${chunk.source_section}` : ''}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-200">
          <div
            className="h-1.5 rounded-full bg-zinc-900"
            style={{ width: `${(resolvedCount / chunks.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="text-sm underline disabled:opacity-40"
        >
          ← Previous
        </button>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STYLES[chunk.review_status]}`}>
          {chunk.review_status}
        </span>
        <button
          onClick={() => setIndex((i) => Math.min(visible.length - 1, i + 1))}
          disabled={index === visible.length - 1}
          className="text-sm underline disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto rounded border border-zinc-200 bg-white p-4 text-sm whitespace-pre-wrap">
        {chunk.chunk_text}
      </div>

      {chunk.enrichment_error && (
        <p className="text-sm text-red-600">Enrichment failed: {chunk.enrichment_error.message}</p>
      )}

      {chunk.ai_metadata ? (
        <div className="rounded border border-zinc-200 bg-white p-4 text-sm">
          <p><span className="font-medium">Topic:</span> {chunk.ai_metadata.topic}</p>
          {chunk.ai_metadata.subtopic && <p><span className="font-medium">Subtopic:</span> {chunk.ai_metadata.subtopic}</p>}
          {chunk.ai_metadata.relevance_score !== undefined && (
            <p><span className="font-medium">Relevance:</span> {chunk.ai_metadata.relevance_score}</p>
          )}
          {!!chunk.ai_metadata.key_concepts?.length && (
            <p className="mt-1"><span className="font-medium">Key concepts:</span> {chunk.ai_metadata.key_concepts.join(', ')}</p>
          )}
          {!!chunk.ai_metadata.use_cases?.length && (
            <p className="mt-1"><span className="font-medium">Use cases:</span> {chunk.ai_metadata.use_cases.join(', ')}</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => run(() => enrichMoreChunks(document.id, document.doc_type))}
          disabled={isPending}
          className="self-start rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {isPending ? 'Generating…' : 'Generate metadata'}
        </button>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="notes">Curator notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => run(() => approveChunkAction(chunk.id, document.id, notes || null))}
          disabled={isPending}
          className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => run(() => rejectChunkAction(chunk.id, document.id, notes || null))}
          disabled={isPending}
          className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => run(() => saveChunkDraftAction(chunk.id, document.id, notes || null))}
          disabled={isPending}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Save draft
        </button>
        {canSubmit && (
          <button
            onClick={() => run(() => submitDocumentAction(document.id))}
            disabled={isPending}
            className="ml-auto rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Submit for admin review
          </button>
        )}
      </div>
    </div>
  )
}
