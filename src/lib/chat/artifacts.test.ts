import { describe, it, expect } from 'vitest'
import { deriveArtifacts, artifactsCount } from './artifacts'

describe('deriveArtifacts', () => {
  it('collects documents, citations, next steps, and created records from structured messages', () => {
    const messages = [
      {
        structured: {
          message: 'Reply',
          documents: [{ label: 'Plan', documentType: 'implementation_plan', artifactId: 'art-1', title: 'Plan', route: '/projects/p1/workstreams/w1' }],
          citations: [{ label: 'Source', sourceType: 'wiki_article' as const, sourceId: 'slug-1', route: '/wiki/slug-1' }],
          nextSteps: [{ label: 'Define scope', status: 'suggested' as const, action: null }],
        },
        createdRecords: [{ kind: 'project' as const, id: 'p1', label: 'CareCall' }],
      },
    ]

    const result = deriveArtifacts(messages)

    expect(result.documents).toEqual([{ label: 'Plan', documentType: 'implementation_plan', artifactId: 'art-1', title: 'Plan', route: '/projects/p1/workstreams/w1', messageIndexes: [0] }])
    expect(result.citations).toEqual([{ label: 'Source', sourceType: 'wiki_article', sourceId: 'slug-1', route: '/wiki/slug-1', messageIndexes: [0] }])
    expect(result.nextSteps).toEqual([{ label: 'Define scope', status: 'suggested', messageIndexes: [0] }])
    expect(result.createdRecords).toEqual([{ kind: 'project', id: 'p1', label: 'CareCall', messageIndexes: [0] }])
    expect(result.externalResources).toEqual([])
  })

  it('dedupes the same document/citation across multiple messages while retaining every originating message index', () => {
    const doc = { label: 'Plan', documentType: 'implementation_plan', artifactId: 'art-1', title: 'Plan', route: '/projects/p1/workstreams/w1' }
    const messages = [{ structured: { message: 'A', documents: [doc] } }, { structured: { message: 'B', documents: [doc] } }]

    const result = deriveArtifacts(messages)

    expect(result.documents).toHaveLength(1)
    expect(result.documents[0].messageIndexes).toEqual([0, 1])
  })

  it('excludes a routine navigation link that does not independently match a citation or document', () => {
    const messages = [{ structured: { message: 'Reply', links: [{ label: 'Open project', route: '/projects/p1' }] } }]

    const result = deriveArtifacts(messages)

    expect(result.documents).toEqual([])
    expect(result.citations).toEqual([])
  })

  it('attributes a link to the matching citation when its route independently qualifies', () => {
    const messages = [
      { structured: { message: 'First', citations: [{ label: 'Source', sourceType: 'wiki_article' as const, sourceId: 'slug-1', route: '/wiki/slug-1' }] } },
      { structured: { message: 'Second', links: [{ label: 'See the article', route: '/wiki/slug-1' }] } },
    ]

    const result = deriveArtifacts(messages)

    expect(result.citations).toHaveLength(1)
    expect(result.citations[0].messageIndexes).toEqual([0, 1])
  })

  it('returns empty groups for messages with no structured payload', () => {
    const result = deriveArtifacts([{}, { structured: { message: 'plain' } }])
    expect(result).toEqual({ documents: [], citations: [], nextSteps: [], createdRecords: [], externalResources: [] })
  })
})

describe('artifactsCount', () => {
  it('sums documents, citations, next steps, and created records but not external resources', () => {
    const collection = {
      documents: [{}] as never,
      citations: [{}, {}] as never,
      nextSteps: [] as never,
      createdRecords: [{}] as never,
      externalResources: [] as never,
    }
    expect(artifactsCount(collection)).toBe(4)
  })
})
