import { describe, it, expect, vi, beforeEach } from 'vitest'

const resolveNavigationTargetMock = vi.fn()
const resolveDocumentArtifactMock = vi.fn()

vi.mock('./navigation-resolver', () => ({ resolveNavigationTarget: (...args: unknown[]) => resolveNavigationTargetMock(...args) }))
vi.mock('./document-resolver', () => ({ resolveDocumentArtifact: (...args: unknown[]) => resolveDocumentArtifactMock(...args) }))

const { resolveCreatedRecord, extractCreatedRecordRef } = await import('./created-records')

beforeEach(() => {
  resolveNavigationTargetMock.mockReset()
  resolveDocumentArtifactMock.mockReset()
})

describe('extractCreatedRecordRef', () => {
  it('extracts a project ref from a create_project tool result', () => {
    expect(extractCreatedRecordRef('create_project', JSON.stringify({ projectId: 'p1' }))).toEqual({ kind: 'project', id: 'p1' })
  })

  it('extracts a workstream ref from a create_workstream tool result', () => {
    expect(extractCreatedRecordRef('create_workstream', JSON.stringify({ workstreamId: 'w1' }))).toEqual({ kind: 'workstream', id: 'w1' })
  })

  it('extracts a workstream_artifact ref from a successful attach_workstream_artifact tool result', () => {
    expect(extractCreatedRecordRef('attach_workstream_artifact', JSON.stringify({ attached: true, artifactId: 'art1' }))).toEqual({
      kind: 'workstream_artifact',
      id: 'art1',
    })
  })

  it('returns null for a tool error result', () => {
    expect(extractCreatedRecordRef('create_project', JSON.stringify({ error: 'refused' }))).toBeNull()
  })

  it('returns null for an unrelated tool', () => {
    expect(extractCreatedRecordRef('search_wiki', JSON.stringify({ articles: [] }))).toBeNull()
  })

  it('returns null for malformed JSON rather than throwing', () => {
    expect(extractCreatedRecordRef('create_project', 'not json')).toBeNull()
  })
})

describe('resolveCreatedRecord', () => {
  it('resolves a project/workstream ref via the navigation resolver', async () => {
    resolveNavigationTargetMock.mockResolvedValue({ label: 'CareCall Assessment', route: '/projects/p1' })
    const result = await resolveCreatedRecord({} as never, { kind: 'project', id: 'p1' })
    expect(resolveNavigationTargetMock).toHaveBeenCalledWith({}, { kind: 'project', id: 'p1' })
    expect(result).toEqual({ kind: 'project', id: 'p1', label: 'CareCall Assessment' })
  })

  it('resolves a workstream_artifact ref via the document resolver, using its title as the label', async () => {
    resolveDocumentArtifactMock.mockResolvedValue({ title: 'Design Note', artifactType: 'design_note', route: '/projects/p1/workstreams/w1', workstreamId: 'w1', projectId: 'p1' })
    const result = await resolveCreatedRecord({} as never, { kind: 'workstream_artifact', id: 'art1' })
    expect(resolveDocumentArtifactMock).toHaveBeenCalledWith({}, 'art1')
    expect(result).toEqual({ kind: 'workstream_artifact', id: 'art1', label: 'Design Note' })
  })

  it('returns null when the underlying resolver cannot resolve the record', async () => {
    resolveNavigationTargetMock.mockResolvedValue(null)
    const result = await resolveCreatedRecord({} as never, { kind: 'workstream', id: 'w-gone' })
    expect(result).toBeNull()
  })
})
