import { describe, it, expect, vi, beforeEach } from 'vitest'

const resolveNavigationTargetMock = vi.fn()
const resolveDocumentArtifactMock = vi.fn()

vi.mock('./navigation-resolver', () => ({ resolveNavigationTarget: (...args: unknown[]) => resolveNavigationTargetMock(...args) }))
vi.mock('./document-resolver', () => ({ resolveDocumentArtifact: (...args: unknown[]) => resolveDocumentArtifactMock(...args) }))

const { buildPersistedEnvelope, resolveEnvelopeForDisplay } = await import('./envelope-resolution')

beforeEach(() => {
  resolveNavigationTargetMock.mockReset()
  resolveDocumentArtifactMock.mockReset()
})

describe('buildPersistedEnvelope', () => {
  it('keeps only citations verified present in this turn\'s real retrieval', async () => {
    const parsed = {
      schemaVersion: '1.0' as const,
      message: 'Here you go.',
      citations: [
        { label: 'Retrieved', sourceType: 'wiki_article' as const, sourceId: 'real-slug' },
        { label: 'Invented', sourceType: 'wiki_article' as const, sourceId: 'never-retrieved-slug' },
      ],
    }

    const persisted = await buildPersistedEnvelope(
      {} as never,
      parsed,
      { wikiArticleSlugs: new Set(['real-slug']), knowledgeSourceIds: new Set() }
    )

    expect(persisted.citations).toEqual([{ label: 'Retrieved', sourceType: 'wiki_article', sourceId: 'real-slug' }])
  })

  it('checks knowledge_source citations against knowledgeSourceIds, not wikiArticleSlugs', async () => {
    const parsed = {
      schemaVersion: '1.0' as const,
      message: 'Here you go.',
      citations: [
        { label: 'Retrieved source', sourceType: 'knowledge_source' as const, sourceId: 'source-1' },
        { label: 'Invented source', sourceType: 'knowledge_source' as const, sourceId: 'never-retrieved-source' },
      ],
    }

    const persisted = await buildPersistedEnvelope(
      {} as never,
      parsed,
      { wikiArticleSlugs: new Set(), knowledgeSourceIds: new Set(['source-1']) }
    )

    expect(persisted.citations).toEqual([{ label: 'Retrieved source', sourceType: 'knowledge_source', sourceId: 'source-1' }])
  })

  it('drops links that fail to resolve even once, keeping ones that do', async () => {
    resolveNavigationTargetMock.mockImplementation(async (_ctx, target) =>
      target.id === 'real-project' ? { label: 'Real Project', route: '/projects/real-project' } : null
    )
    const parsed = {
      schemaVersion: '1.0' as const,
      message: 'Here you go.',
      links: [
        { label: 'A', target: { kind: 'project' as const, id: 'real-project' } },
        { label: 'B', target: { kind: 'project' as const, id: 'fake-project' } },
      ],
    }

    const persisted = await buildPersistedEnvelope({} as never, parsed, { wikiArticleSlugs: new Set(), knowledgeSourceIds: new Set() })

    expect(persisted.links).toEqual([{ label: 'A', target: { kind: 'project', id: 'real-project' } }])
  })

  it('drops documents whose artifactId does not resolve', async () => {
    resolveDocumentArtifactMock.mockResolvedValue(null)
    const parsed = { schemaVersion: '1.0' as const, message: 'Hi.', documents: [{ label: 'Doc', documentType: 'design_note', artifactId: 'fake' }] }

    const persisted = await buildPersistedEnvelope({} as never, parsed, { wikiArticleSlugs: new Set(), knowledgeSourceIds: new Set() })

    expect(persisted.documents).toBeUndefined()
  })

  it('omits empty optional sections entirely rather than persisting empty arrays', async () => {
    const persisted = await buildPersistedEnvelope(
      {} as never,
      { schemaVersion: '1.0', message: 'Hi.' },
      { wikiArticleSlugs: new Set(), knowledgeSourceIds: new Set() }
    )
    expect(persisted).toEqual({ message: 'Hi.' })
  })
})

describe('resolveEnvelopeForDisplay', () => {
  it('re-resolves persisted link/document/citation references into display-ready routes', async () => {
    resolveNavigationTargetMock.mockImplementation(async (_ctx, target) => {
      if (target.kind === 'project') return { label: 'Real Project', route: '/projects/p1' }
      if (target.kind === 'wiki_article') return { label: 'Article', route: '/wiki/some-slug' }
      return null
    })
    resolveDocumentArtifactMock.mockResolvedValue({ title: 'Design Note', artifactType: 'design_note', route: '/projects/p1/workstreams/w1', workstreamId: 'w1', projectId: 'p1' })

    const persisted = {
      message: 'Hi.',
      links: [{ label: 'A', target: { kind: 'project' as const, id: 'p1' } }],
      documents: [{ label: 'Doc', documentType: 'design_note', artifactId: 'art1' }],
      citations: [{ label: 'Source', sourceType: 'wiki_article' as const, sourceId: 'some-slug' }],
    }

    const verified = await resolveEnvelopeForDisplay({} as never, persisted)

    expect(verified.links).toEqual([{ label: 'A', route: '/projects/p1' }])
    expect(verified.documents).toEqual([{ label: 'Doc', documentType: 'design_note', artifactId: 'art1', title: 'Design Note', route: '/projects/p1/workstreams/w1' }])
    expect(verified.citations).toEqual([{ label: 'Source', sourceType: 'wiki_article', sourceId: 'some-slug', route: '/wiki/some-slug' }])
  })

  it('drops a previously-resolvable reference that has since become inaccessible', async () => {
    resolveNavigationTargetMock.mockResolvedValue(null)
    const persisted = { message: 'Hi.', links: [{ label: 'A', target: { kind: 'project' as const, id: 'p1' } }] }

    const verified = await resolveEnvelopeForDisplay({} as never, persisted)

    expect(verified.links).toBeUndefined()
  })
})
