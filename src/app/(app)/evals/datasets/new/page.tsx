'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDatasetAction } from '@/app/actions/eval'

export default function NewEvalDatasetPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await createDatasetAction({ name, description, knowledgeBaseId: null })
      router.push(`/evals/datasets/${result.datasetId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dataset')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold">New evaluation dataset</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="AI Engineering Wiki Benchmark"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={submitting} className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? 'Creating…' : 'Create dataset'}
        </button>
      </form>
    </div>
  )
}
