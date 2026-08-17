'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectVisibility, PublicProjectProfile } from '@/types/database'
import { savePublicProfileDraftAction, publishProjectAction, unpublishProjectAction, setPublicFullDetailAction } from '@/app/actions/projects'

type BenchmarkRow = { metric: string; baseline: string; variant: string }

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function PublishForm({
  projectId,
  visibility,
  publicSlug,
  publicProfile,
  isAdmin,
  publicFullDetail,
}: {
  projectId: string
  visibility: ProjectVisibility
  publicSlug: string | null
  publicProfile: PublicProjectProfile | null
  isAdmin: boolean
  publicFullDetail: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [title, setTitle] = useState(publicProfile?.title ?? '')
  const [summary, setSummary] = useState(publicProfile?.summary ?? '')
  const [problem, setProblem] = useState(publicProfile?.problem ?? '')
  const [approach, setApproach] = useState(publicProfile?.approach ?? '')
  const [findings, setFindings] = useState(publicProfile?.findings ?? '')
  const [conclusion, setConclusion] = useState(publicProfile?.conclusion ?? '')
  const [benchmarkName, setBenchmarkName] = useState(publicProfile?.benchmarkSummary?.name ?? '')
  const [rows, setRows] = useState<BenchmarkRow[]>(
    publicProfile?.benchmarkSummary?.rows.map((r) => ({ metric: r.metric, baseline: r.baseline ?? '', variant: r.variant ?? '' })) ?? []
  )
  const [relatedSlugs, setRelatedSlugs] = useState((publicProfile?.relatedWikiSlugs ?? []).join(', '))
  const [slug, setSlug] = useState(publicSlug ?? '')

  function buildProfile(): PublicProjectProfile {
    return {
      title: title || undefined,
      summary: summary || undefined,
      problem: problem || undefined,
      approach: approach || undefined,
      findings: findings || undefined,
      conclusion: conclusion || undefined,
      benchmarkSummary:
        benchmarkName && rows.length > 0
          ? { name: benchmarkName, rows: rows.map((r) => ({ metric: r.metric, baseline: r.baseline || undefined, variant: r.variant || undefined })) }
          : undefined,
      relatedWikiSlugs: relatedSlugs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
  }

  function run(action: () => Promise<void>, successMessage: string) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        await action()
        setMessage(successMessage)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  function handleSaveDraft() {
    run(() => savePublicProfileDraftAction(projectId, buildProfile()), 'Draft saved.')
  }

  function handlePublish() {
    const finalSlug = slug.trim() || slugify(title || 'project')
    run(async () => {
      await savePublicProfileDraftAction(projectId, buildProfile())
      await publishProjectAction(projectId, finalSlug)
    }, 'Published.')
  }

  function handleUnpublish() {
    if (!confirm('Unpublish this project? It will no longer be visible without signing in.')) return
    run(() => unpublishProjectAction(projectId), 'Unpublished.')
  }

  function handleToggleFullDetail() {
    const enabling = !publicFullDetail
    if (enabling && !confirm('Expose this project\'s real workstreams, artifacts, and assessment responses to anonymous visitors? This goes beyond the curated summary below.')) return
    run(() => setPublicFullDetailAction(projectId, enabling), enabling ? 'Full data exposure enabled.' : 'Full data exposure disabled.')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded border border-zinc-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium">
            Status: <span className={visibility === 'public' ? 'text-green-700' : 'text-zinc-500'}>{visibility}</span>
          </p>
          {visibility === 'public' && publicSlug && <p className="text-xs text-zinc-500">Live at /examples/{publicSlug}</p>}
        </div>
        {visibility === 'public' ? (
          <button
            disabled={isPending}
            onClick={handleUnpublish}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
          >
            Unpublish
          </button>
        ) : (
          <button
            disabled={isPending}
            onClick={handlePublish}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Publish
          </button>
        )}
      </div>

      {isAdmin && visibility === 'public' && (
        <div className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 p-4">
          <div>
            <p className="text-sm font-medium">
              Full data exposure: <span className={publicFullDetail ? 'text-green-700' : 'text-zinc-500'}>{publicFullDetail ? 'on' : 'off'}</span>
            </p>
            <p className="text-xs text-zinc-600">
              Admin-only. When on, anonymous visitors can browse this project&rsquo;s real workstreams, artifacts, and assessment responses &mdash;
              not just the curated summary below. Every other published project is unaffected.
            </p>
          </div>
          <button
            disabled={isPending}
            onClick={handleToggleFullDetail}
            className={`shrink-0 rounded border px-3 py-1.5 text-sm disabled:opacity-50 ${
              publicFullDetail ? 'border-red-300 text-red-700' : 'border-zinc-300'
            }`}
          >
            {publicFullDetail ? 'Turn off' : 'Turn on'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Public URL slug</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={slugify(title || 'project')} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Summary</span>
          <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Question / Problem</span>
          <textarea rows={2} value={problem} onChange={(e) => setProblem(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Approach</span>
          <textarea rows={3} value={approach} onChange={(e) => setApproach(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Benchmark summary (optional)</span>
          <input
            value={benchmarkName}
            onChange={(e) => setBenchmarkName(e.target.value)}
            placeholder="Benchmark name"
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={row.metric}
                onChange={(e) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, metric: e.target.value } : r)))}
                placeholder="Metric"
                className="flex-1 rounded border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <input
                value={row.baseline}
                onChange={(e) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, baseline: e.target.value } : r)))}
                placeholder="Baseline"
                className="w-28 rounded border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <input
                value={row.variant}
                onChange={(e) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, variant: e.target.value } : r)))}
                placeholder="Variant"
                className="w-28 rounded border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <button type="button" onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-600 underline">
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { metric: '', baseline: '', variant: '' }])}
            className="self-start rounded border border-zinc-300 px-3 py-1 text-xs"
          >
            Add row
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Key finding</span>
          <textarea rows={2} value={findings} onChange={(e) => setFindings(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">What we learned</span>
          <textarea rows={2} value={conclusion} onChange={(e) => setConclusion(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Related public Wiki slugs (comma-separated)</span>
          <input value={relatedSlugs} onChange={(e) => setRelatedSlugs(e.target.value)} className="rounded border border-zinc-300 px-3 py-2 text-sm" />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <button
          disabled={isPending}
          onClick={handleSaveDraft}
          className="self-start rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          Save draft
        </button>
      </div>
    </div>
  )
}
