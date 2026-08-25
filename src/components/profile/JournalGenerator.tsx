'use client'

import { useState, useTransition } from 'react'
import { previewJournalAction, type JournalPreviewResult } from '@/app/actions/journal'

type JournalRange = 'last_30_days' | 'last_6_months' | 'this_year' | 'custom'
type JournalDetail = 'brief' | 'standard' | 'detailed'
type JournalStyle = 'reflective' | 'factual'

interface FormState {
  range: JournalRange
  from: string
  to: string
  includeRelatedActivity: boolean
  detail: JournalDetail
  style: JournalStyle
}

const DEFAULT_FORM: FormState = {
  range: 'last_30_days',
  from: '',
  to: '',
  includeRelatedActivity: true,
  detail: 'standard',
  style: 'reflective',
}

const RANGE_OPTIONS: [JournalRange, string][] = [
  ['last_30_days', 'Last 30 days'],
  ['last_6_months', 'Last 6 months'],
  ['this_year', 'This year'],
  ['custom', 'Custom range'],
]

export function JournalGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [excludedConversationIds, setExcludedConversationIds] = useState<Set<string>>(new Set())
  const [excludedProjectIds, setExcludedProjectIds] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<JournalPreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDownloading, setIsDownloading] = useState(false)

  function generate() {
    setError(null)
    startTransition(async () => {
      try {
        const preview = await previewJournalAction({
          range: form.range,
          from: form.range === 'custom' ? form.from : undefined,
          to: form.range === 'custom' ? form.to : undefined,
          includeRelatedActivity: form.includeRelatedActivity,
          detail: form.detail,
          style: form.style,
          excludedConversationIds: [...excludedConversationIds],
          excludedProjectIds: [...excludedProjectIds],
        })
        setResult(preview)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate journal preview.')
      }
    })
  }

  async function download() {
    if (!result) return
    setIsDownloading(true)
    setError(null)
    try {
      const res = await fetch('/profile/journal/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
      if (!res.ok) throw new Error('Failed to generate the document.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kb-sandbox-journal-${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download the document.')
    } finally {
      setIsDownloading(false)
    }
  }

  function toggleSet(set: Set<string>, setter: (next: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  const canGenerate = form.range !== 'custom' || (form.from && form.to)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4 text-sm">
        <div>
          <div className="font-medium">Date range</div>
          <div className="mt-2 flex flex-wrap gap-3">
            {RANGE_OPTIONS.map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5">
                <input type="radio" name="range" checked={form.range === value} onChange={() => setForm((f) => ({ ...f, range: value }))} />
                {label}
              </label>
            ))}
          </div>
          {form.range === 'custom' && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={form.from}
                onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                className="rounded border border-zinc-300 px-2 py-1"
              />
              <span className="text-zinc-400">to</span>
              <input
                type="date"
                value={form.to}
                onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                className="rounded border border-zinc-300 px-2 py-1"
              />
            </div>
          )}
        </div>

        <div>
          <div className="font-medium">Include</div>
          <p className="mt-1 text-zinc-500">
            Your Assistant conversations, and your own project, workstream, artifact, and note activity, are always included.
          </p>
          <label className="mt-2 flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={form.includeRelatedActivity}
              onChange={(e) => setForm((f) => ({ ...f, includeRelatedActivity: e.target.checked }))}
            />
            Related activity by others in projects I&apos;m an active member of
          </label>
        </div>

        <div className="flex gap-8">
          <div>
            <div className="font-medium">Detail</div>
            <div className="mt-2 flex flex-col gap-1">
              {(['brief', 'standard', 'detailed'] as JournalDetail[]).map((value) => (
                <label key={value} className="flex items-center gap-1.5 capitalize">
                  <input type="radio" name="detail" checked={form.detail === value} onChange={() => setForm((f) => ({ ...f, detail: value }))} />
                  {value}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="font-medium">Style</div>
            <div className="mt-2 flex flex-col gap-1">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="style" checked={form.style === 'reflective'} onChange={() => setForm((f) => ({ ...f, style: 'reflective' }))} />
                Reflective journal
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="style" checked={form.style === 'factual'} onChange={() => setForm((f) => ({ ...f, style: 'factual' }))} />
                Factual activity summary
              </label>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={isPending || !canGenerate}
          className="w-fit rounded border border-zinc-300 px-3 py-1.5 hover:border-zinc-400 disabled:opacity-50"
        >
          {isPending ? 'Generating preview…' : result ? 'Regenerate preview' : 'Generate preview'}
        </button>

        {error && <p className="text-red-600">{error}</p>}
      </div>

      {result && (
        <div className="flex flex-col gap-4 rounded border border-zinc-200 bg-white p-4 text-sm">
          <div className="text-zinc-500">
            {result.rangeLabel} · Generated using {result.providerDisplayName} / {result.modelDisplayName}. This preview is private and
            does not become Assistant memory.
          </div>
          {result.truncated && (
            <p className="italic text-zinc-500">This period included more content than could be included -- some items were omitted.</p>
          )}

          <Section title="Narrative" body={result.content.narrative || 'Nothing recorded for this period.'} />
          <BulletSection title="Projects & Themes" items={result.content.projectsAndThemes} />
          <BulletSection title="Decisions & Milestones" items={result.content.decisionsAndMilestones} />
          <BulletSection title="Lessons & Changed Assumptions" items={result.content.lessonsAndChangedAssumptions} />
          <BulletSection title="Open Questions" items={result.content.openQuestions} />
          <BulletSection title="Items to Revisit" items={result.content.itemsToRevisit} />

          {result.relatedActivity.length > 0 && (
            <div>
              <div className="font-medium">Activity Around Me and My Projects</div>
              <ul className="mt-1 list-disc pl-5 text-zinc-700">
                {result.relatedActivity.map((item) => (
                  <li key={item.id}>{item.line}</li>
                ))}
              </ul>
            </div>
          )}

          {(result.conversations.length > 0 || result.projects.length > 0) && (
            <div>
              <div className="font-medium">Exclude before downloading</div>
              {result.conversations.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1">
                  {result.conversations.map((c) => (
                    <li key={c.id} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={excludedConversationIds.has(c.id)}
                        onChange={() => toggleSet(excludedConversationIds, setExcludedConversationIds, c.id)}
                      />
                      <span className={excludedConversationIds.has(c.id) ? 'text-zinc-400 line-through' : ''}>
                        {c.title} -- {new Date(c.date).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {result.projects.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {result.projects.map((p) => (
                    <li key={p.id} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={excludedProjectIds.has(p.id)}
                        onChange={() => toggleSet(excludedProjectIds, setExcludedProjectIds, p.id)}
                      />
                      <span className={excludedProjectIds.has(p.id) ? 'text-zinc-400 line-through' : ''}>{p.name}</span>
                    </li>
                  ))}
                </ul>
              )}
              {(excludedConversationIds.size > 0 || excludedProjectIds.size > 0) && (
                <button
                  type="button"
                  onClick={generate}
                  disabled={isPending}
                  className="mt-2 rounded border border-zinc-300 px-3 py-1 text-xs hover:border-zinc-400"
                >
                  Regenerate without excluded items
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={download}
            disabled={isDownloading}
            className="w-fit rounded border border-zinc-300 px-3 py-1.5 hover:border-zinc-400 disabled:opacity-50"
          >
            {isDownloading ? 'Preparing document…' : 'Download DOCX'}
          </button>
        </div>
      )}
    </div>
  )
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      <p className="mt-1 whitespace-pre-wrap text-zinc-700">{body}</p>
    </div>
  )
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      {items.length === 0 ? (
        <p className="mt-1 italic text-zinc-500">None recorded.</p>
      ) : (
        <ul className="mt-1 list-disc pl-5 text-zinc-700">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
