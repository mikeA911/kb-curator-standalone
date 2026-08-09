'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { Document } from '@/types/database'
import { deleteDocumentAction } from '@/app/actions/curator'

const STATUS_STYLES: Record<Document['processing_status'], string> = {
  pending: 'bg-zinc-100 text-zinc-700',
  parsing: 'bg-blue-100 text-blue-700',
  chunking: 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-800',
  submitted: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export function DocumentRow({ document }: { document: Document }) {
  const [isPending, startTransition] = useTransition()
  const [deleted, setDeleted] = useState(false)

  if (deleted) return null

  function handleDelete() {
    if (!confirm(`Delete "${document.original_filename}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteDocumentAction(document.id)
      setDeleted(true)
    })
  }

  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="px-4 py-3">
        {document.processing_status === 'review' ? (
          <Link href={`/review/${document.id}`} className="font-medium underline">
            {document.original_filename}
          </Link>
        ) : (
          <span className="font-medium">{document.original_filename}</span>
        )}
        {document.processing_status === 'failed' && document.processing_error && (
          <p className="mt-1 text-xs text-red-600">
            {document.processing_error.stage}: {document.processing_error.message}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-zinc-600">{document.doc_type}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[document.processing_status]}`}>
          {document.processing_status}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-600">
        {document.approved_chunks}/{document.total_chunks ?? '—'} approved
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-sm text-red-600 underline disabled:opacity-50"
        >
          {isPending ? 'Deleting…' : 'Delete'}
        </button>
      </td>
    </tr>
  )
}
