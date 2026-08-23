import { describe, it, expect } from 'vitest'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'
import { resolveNavigationTarget } from './navigation-resolver'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

function fakeCtx(supabase: unknown): WorkbenchCallerContext {
  return { user: { id: 'user-1' }, profile: {}, supabase } as unknown as WorkbenchCallerContext
}

describe('resolveNavigationTarget', () => {
  it('resolves a wiki_article to its title and /wiki/[slug] route', async () => {
    const supabase = createFakeSupabase({
      wiki_articles: [{ data: { id: 'a1', slug: 'openapi-discovery-workbench-method', title: 'OpenAPI Discovery' }, error: null }],
    })

    const result = await resolveNavigationTarget(fakeCtx(supabase), { kind: 'wiki_article', id: 'openapi-discovery-workbench-method' })

    expect(result).toEqual({ label: 'OpenAPI Discovery', route: '/wiki/openapi-discovery-workbench-method' })
  })

  it('returns null for a wiki_article that does not exist or is not accessible', async () => {
    const supabase = createFakeSupabase({ wiki_articles: [{ data: null, error: null }] })
    const result = await resolveNavigationTarget(fakeCtx(supabase), { kind: 'wiki_article', id: 'missing-slug' })
    expect(result).toBeNull()
  })

  it('resolves a project to its name and /projects/[id] route', async () => {
    const supabase = createFakeSupabase({ projects: [{ data: { id: 'p1', name: 'CareCall Assessment' }, error: null }] })
    const result = await resolveNavigationTarget(fakeCtx(supabase), { kind: 'project', id: 'p1' })
    expect(result).toEqual({ label: 'CareCall Assessment', route: '/projects/p1' })
  })

  it('returns null for an inaccessible/nonexistent project', async () => {
    const supabase = createFakeSupabase({ projects: [{ data: null, error: null }] })
    const result = await resolveNavigationTarget(fakeCtx(supabase), { kind: 'project', id: 'p-hidden' })
    expect(result).toBeNull()
  })

  it('resolves a workstream using its own row for both name and parent project id', async () => {
    const supabase = createFakeSupabase({
      project_workstreams: [{ data: { id: 'w1', project_id: 'p1', name: 'OpenAPI Discovery' }, error: null }],
    })
    const result = await resolveNavigationTarget(fakeCtx(supabase), { kind: 'workstream', id: 'w1' })
    expect(result).toEqual({ label: 'OpenAPI Discovery', route: '/projects/p1/workstreams/w1' })
  })

  it('returns null for an inaccessible/nonexistent workstream', async () => {
    const supabase = createFakeSupabase({ project_workstreams: [{ data: null, error: null }] })
    const result = await resolveNavigationTarget(fakeCtx(supabase), { kind: 'workstream', id: 'w-hidden' })
    expect(result).toBeNull()
  })

  it('resolves an assessment using its own row for both name and parent project id', async () => {
    const supabase = createFakeSupabase({
      system_assessments: [{ data: { id: 'as1', project_id: 'p1', name: 'System Understanding' }, error: null }],
    })
    const result = await resolveNavigationTarget(fakeCtx(supabase), { kind: 'assessment', id: 'as1' })
    expect(result).toEqual({ label: 'System Understanding', route: '/projects/p1/assessments/as1' })
  })

  it('returns null for an inaccessible/nonexistent assessment', async () => {
    const supabase = createFakeSupabase({ system_assessments: [{ data: null, error: null }] })
    const result = await resolveNavigationTarget(fakeCtx(supabase), { kind: 'assessment', id: 'as-hidden' })
    expect(result).toBeNull()
  })

  it('returns null instead of throwing on a query error', async () => {
    const supabase = createFakeSupabase({ projects: [{ data: null, error: new Error('boom') }] })
    const result = await resolveNavigationTarget(fakeCtx(supabase), { kind: 'project', id: 'p1' })
    expect(result).toBeNull()
  })
})
