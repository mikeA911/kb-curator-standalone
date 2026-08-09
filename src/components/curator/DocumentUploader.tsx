'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { KnowledgeBase } from '@/types/database'
import { uploadAndProcessDocument } from '@/app/actions/curator'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const MAX_SIZE = 50 * 1024 * 1024

export function DocumentUploader({
  knowledgeBases,
  defaultKb,
  defaultSourceUrl,
}: {
  knowledgeBases: KnowledgeBase[]
  defaultKb?: string
  defaultSourceUrl?: string
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState(defaultKb ?? knowledgeBases[0]?.id ?? '')
  const [sourceUrl, setSourceUrl] = useState(defaultSourceUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [stage, setStage] = useState<string | null>(null)

  function validateFile(f: File): string | null {
    if (f.size > MAX_SIZE) return 'File exceeds 50MB limit'
    if (!ALLOWED_TYPES.includes(f.type)) return 'Unsupported file type (pdf, docx, txt only)'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError('Please choose a file')
      return
    }
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    if (!docType) {
      setError('Please select a knowledge base')
      return
    }

    setSubmitting(true)
    setStage('Uploading and parsing…')
    try {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('docType', docType)
      if (sourceUrl) formData.set('sourceUrl', sourceUrl)

      const result = await uploadAndProcessDocument(formData)
      router.push(`/review/${result.documentId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setSubmitting(false)
      setStage(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="kb">Knowledge base</label>
        <select
          id="kb"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full rounded border border-zinc-300 px-3 py-2"
        >
          {knowledgeBases.map((kb) => (
            <option key={kb.id} value={kb.id}>{kb.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="file">File (pdf, docx, txt — max 50MB)</label>
        <input
          id="file"
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="sourceUrl">Source URL (optional)</label>
        <input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="w-full rounded border border-zinc-300 px-3 py-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {stage && <p className="text-sm text-zinc-600">{stage}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Processing…' : 'Upload and process'}
      </button>
    </form>
  )
}
