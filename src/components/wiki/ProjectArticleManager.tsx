'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { WikiVisibilityScope } from '@/types/database'
import {
  linkProjectArticleAction,
  unlinkProjectArticleAction,
  setArticleVisibilityScopeAction,
  attachProjectAndSetVisibilityAction,
} from '@/app/actions/wiki'

export interface LinkableProject {
  id: string
  name: string
}

const VISIBILITY_LABELS: Record<WikiVisibilityScope, string> = {
  project_private: 'Project-private',
  selected_projects: 'Selected projects',
  platform: 'Platform (default)',
  public: 'Public',
}

// Requires at least one attached project -- narrowing to either of these
// before a project is attached lets a non-member curator/admin strand
// themselves (see attachProjectAndSetVisibilityAction's comment).
const REQUIRES_PROJECT: WikiVisibilityScope[] = ['project_private', 'selected_projects']

// Same type-to-filter picker pattern as RelatedArticlesManager: search
// candidates by name, track the real id separately from the display text.
export function ProjectArticleManager({
  articleId,
  visibilityScope,
  projects,
  excludeProjectIds = [],
}: {
  articleId: string
  visibilityScope: WikiVisibilityScope
  projects: LinkableProject[]
  excludeProjectIds?: string[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [firstAttachScope, setFirstAttachScope] = useState<WikiVisibilityScope>('platform')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasLinkedProjects = excludeProjectIds.length > 0

  const candidates = useMemo(() => {
    const excluded = new Set(excludeProjectIds)
    return projects.filter((p) => !excluded.has(p.id))
  }, [projects, excludeProjectIds])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates.slice(0, 8)
    return candidates.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [candidates, query])

  function selectProject(p: LinkableProject) {
    setQuery(p.name)
    setSelectedId(p.id)
    setOpen(false)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedId) return
    startTransition(async () => {
      try {
        // With no project attached yet, do the attach and any requested
        // scope narrowing in one request -- see
        // attachProjectAndSetVisibilityAction's comment for why splitting
        // this into two steps could strand a non-member curator/admin.
        if (!hasLinkedProjects && firstAttachScope !== 'platform') {
          await attachProjectAndSetVisibilityAction(selectedId, articleId, firstAttachScope)
        } else {
          await linkProjectArticleAction(selectedId, articleId)
        }
        setQuery('')
        setSelectedId(null)
        setFirstAttachScope('platform')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to attach project')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-xs">
        <span className="text-zinc-500">Visibility:</span>
        <select
          value={visibilityScope}
          disabled={isPending}
          onChange={(e) =>
            startTransition(async () => {
              await setArticleVisibilityScopeAction(articleId, e.target.value as WikiVisibilityScope)
              router.refresh()
            })
          }
          className="rounded border border-zinc-300 px-1.5 py-1 text-xs"
        >
          {(Object.keys(VISIBILITY_LABELS) as WikiVisibilityScope[]).map((s) => (
            <option key={s} value={s} disabled={REQUIRES_PROJECT.includes(s) && !hasLinkedProjects}>
              {VISIBILITY_LABELS[s]}
            </option>
          ))}
        </select>
        {!hasLinkedProjects && <span className="text-zinc-400">(attach a project below to enable project-private/selected)</span>}
      </label>

      <form onSubmit={handleAdd} className="flex flex-col gap-1 border-t border-zinc-100 pt-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              placeholder="Search projects by name…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedId(null)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              className="w-64 rounded border border-zinc-300 px-2 py-1"
            />
            {open && matches.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-64 overflow-auto rounded border border-zinc-200 bg-white shadow-sm">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseDown={() => selectProject(p)}
                      className="w-full px-2 py-1.5 text-left hover:bg-zinc-50"
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!hasLinkedProjects && (
            <select
              value={firstAttachScope}
              onChange={(e) => setFirstAttachScope(e.target.value as WikiVisibilityScope)}
              className="rounded border border-zinc-300 px-1.5 py-1"
              title="Visibility to set once this project is attached"
            >
              <option value="platform">Keep platform</option>
              <option value="project_private">…and make project-private</option>
              <option value="selected_projects">…and make selected-projects</option>
            </select>
          )}
          <button disabled={isPending || !selectedId} className="rounded bg-zinc-900 px-2 py-1 font-medium text-white disabled:opacity-50">
            Attach
          </button>
        </div>
        {error && <span className="text-red-600">{error}</span>}
      </form>
    </div>
  )
}

export function ProjectArticleRemoveButton({ linkId, projectId }: { linkId: string; projectId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await unlinkProjectArticleAction(linkId, projectId)
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
