'use client'

import { useState, useTransition } from 'react'
import { importBlogDraftAction } from '@/app/actions/blog'

interface ImportResult {
  title: string
  excerpt: string
  stats: { headings: number; links: number; listItems: number; tables: number }
  body: string
  warnings: { message: string }[]
  imageCount: number
}

// "Select document -> Convert -> Review preview and warnings -> Edit ->
// Save draft" (docs/dev-request-blog-document-import-for-non-technical-
// authors.md). This component only does the Convert step -- it hands the
// result to BlogPostForm (via BlogNewDraftChoice) for review/edit/save,
// reusing the exact same editor, Preview, validation, and save flow a
// manually authored draft uses. Nothing is saved here; importing never
// creates a Blog record.
export function BlogImportForm({ onImported, onCancel }: { onImported: (result: ImportResult) => void; onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConvert() {
    if (!file) {
      setError('Choose a file first.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('file', file)
        const result = await importBlogDraftAction(formData)
        onImported(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to convert the document')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4">
      <div>
        <label htmlFor="blog-import-file" className="text-sm font-medium">
          Import a document
        </label>
        <p className="mt-1 text-xs text-zinc-500">Supported formats: .docx, .md, .markdown, .txt (up to 10MB).</p>
      </div>
      <input
        id="blog-import-file"
        type="file"
        accept=".docx,.md,.markdown,.txt"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
        aria-describedby="blog-import-status"
      />
      <div id="blog-import-status" role="status" aria-live="polite" className="text-sm">
        {error && <p className="text-red-600">{error}</p>}
        {isPending && <p className="text-zinc-500">Converting…</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending || !file}
          onClick={handleConvert}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Convert
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-zinc-300 px-4 py-2 text-sm">
          Back
        </button>
      </div>
    </div>
  )
}
