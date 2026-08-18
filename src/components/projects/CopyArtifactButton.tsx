'use client'

import { useState } from 'react'

// Filename-safe slug from the artifact title, e.g. "M5F Architecture &
// Design Note" -> "m5f-architecture-design-note.md".
function slugForFilename(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'artifact'
  )
}

export function CopyArtifactButton({ title, content }: { title: string; content: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard permission can be denied by the browser/OS; the Save .md
      // button is the fallback in that case.
    }
  }

  function handleDownload() {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${slugForFilename(title)}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Save .md
      </button>
    </span>
  )
}
