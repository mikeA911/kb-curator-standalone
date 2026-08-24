'use client'

import { useState } from 'react'
import { BlogPostForm } from '@/components/admin/BlogPostForm'
import { BlogImportForm } from '@/components/blog/BlogImportForm'

interface ImportResult {
  title: string
  excerpt: string
  stats: { headings: number; links: number; listItems: number; tables: number }
  body: string
  warnings: { message: string }[]
  imageCount: number
}

// "On the new Blog draft page, offer two clear choices: 1. Start writing
// ... 2. Import a document" (docs/dev-request-blog-document-import-for-
// non-technical-authors.md). The choice is made once, up front, before any
// content exists in either path -- which is also what makes "existing
// unsaved editor content must not be overwritten without confirmation"
// true without needing a confirm dialog: there is never a case where
// manual content already exists when an import result arrives, since
// choosing Import replaces the blank editor, not an already-written one.
export function BlogNewDraftChoice({ viewerRole, returnTo }: { viewerRole: 'curator' | 'admin'; returnTo: string }) {
  const [mode, setMode] = useState<'choice' | 'write' | 'import'>('choice')
  const [imported, setImported] = useState<ImportResult | null>(null)

  if (mode === 'choice') {
    return (
      <div className="flex gap-3">
        <button type="button" onClick={() => setMode('write')} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Start writing
        </button>
        <button type="button" onClick={() => setMode('import')} className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium">
          Import a document
        </button>
      </div>
    )
  }

  if (mode === 'import' && !imported) {
    return <BlogImportForm onImported={setImported} onCancel={() => setMode('choice')} />
  }

  return (
    <BlogPostForm
      viewerRole={viewerRole}
      returnTo={returnTo}
      initialTitle={imported?.title}
      initialExcerpt={imported?.excerpt}
      initialBody={imported?.body}
      importSummary={imported ?? undefined}
    />
  )
}
