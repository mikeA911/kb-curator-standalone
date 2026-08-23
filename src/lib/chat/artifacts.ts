import type { VerifiedAssistantEnvelope } from './response-envelope'
import type { ResolvedCreatedRecord } from './created-records'

// Pure derivation, factored out of ChatPanel.tsx so it's unit-testable
// (matching this codebase's convention that derivation logic lives in
// lib/, not components -- see toDisplayMessages in conversations.ts).
// Operates only on already-loaded message state; no I/O, no new
// persistence -- restoring/clearing the panel is just re-running this over
// whatever `messages` ChatPanel already has.

export interface ArtifactSource {
  structured?: VerifiedAssistantEnvelope
  createdRecords?: ResolvedCreatedRecord[]
}

export interface ArtifactDocumentEntry {
  label: string
  documentType: string
  artifactId: string
  title: string
  route: string | null
  messageIndexes: number[]
}

export interface ArtifactCitationEntry {
  label: string
  sourceType: 'wiki_article'
  sourceId: string
  route: string
  messageIndexes: number[]
}

export interface ArtifactNextStepEntry {
  label: string
  status: string
  messageIndexes: number[]
}

export interface ArtifactCreatedRecordEntry {
  kind: string
  id: string
  label: string
  messageIndexes: number[]
}

export interface ArtifactsCollection {
  documents: ArtifactDocumentEntry[]
  // Includes structured.citations plus any links[] entry whose route also
  // independently matches a citation/document elsewhere in the
  // conversation (docs/dev-request-structured-assistant-responses-and-
  // artifacts-panel.md's "independently qualifies" rule) -- a routine
  // navigation link is otherwise excluded entirely, staying attached only
  // to the response that proposed it.
  citations: ArtifactCitationEntry[]
  nextSteps: ArtifactNextStepEntry[]
  createdRecords: ArtifactCreatedRecordEntry[]
  // Scaffolded, always empty this phase -- no schema field currently
  // produces third-party URLs (see the dev-request doc's own scope note).
  externalResources: []
}

export function deriveArtifacts(messages: ArtifactSource[]): ArtifactsCollection {
  const documentsByKey = new Map<string, ArtifactDocumentEntry>()
  const citationsByKey = new Map<string, ArtifactCitationEntry>()
  const nextStepsByKey = new Map<string, ArtifactNextStepEntry>()
  const createdRecordsByKey = new Map<string, ArtifactCreatedRecordEntry>()

  messages.forEach((message, index) => {
    for (const doc of message.structured?.documents ?? []) {
      const key = doc.artifactId
      const existing = documentsByKey.get(key)
      if (existing) existing.messageIndexes.push(index)
      else documentsByKey.set(key, { ...doc, messageIndexes: [index] })
    }

    for (const citation of message.structured?.citations ?? []) {
      const key = `${citation.sourceType}:${citation.sourceId}`
      const existing = citationsByKey.get(key)
      if (existing) existing.messageIndexes.push(index)
      else citationsByKey.set(key, { ...citation, messageIndexes: [index] })
    }

    for (const step of message.structured?.nextSteps ?? []) {
      const key = `${step.label}:${step.status}`
      const existing = nextStepsByKey.get(key)
      if (existing) existing.messageIndexes.push(index)
      else nextStepsByKey.set(key, { label: step.label, status: step.status, messageIndexes: [index] })
    }

    for (const record of message.createdRecords ?? []) {
      const key = `${record.kind}:${record.id}`
      const existing = createdRecordsByKey.get(key)
      if (existing) existing.messageIndexes.push(index)
      else createdRecordsByKey.set(key, { ...record, messageIndexes: [index] })
    }
  })

  // Second pass: a link only becomes part of the collection if its route
  // independently matches a citation/document already collected above --
  // routes are canonical, so string equality is enough to detect "this is
  // the same destination," without needing the link's original {kind,id}
  // (which VerifiedAssistantEnvelope deliberately doesn't retain).
  const knownRoutes = new Set([...documentsByKey.values()].map((d) => d.route).filter((r): r is string => r !== null))
  for (const citation of citationsByKey.values()) knownRoutes.add(citation.route)

  messages.forEach((message, index) => {
    for (const link of message.structured?.links ?? []) {
      if (!knownRoutes.has(link.route)) continue
      const matchingCitation = [...citationsByKey.values()].find((c) => c.route === link.route)
      if (matchingCitation && !matchingCitation.messageIndexes.includes(index)) matchingCitation.messageIndexes.push(index)
    }
  })

  return {
    documents: [...documentsByKey.values()],
    citations: [...citationsByKey.values()],
    nextSteps: [...nextStepsByKey.values()],
    createdRecords: [...createdRecordsByKey.values()],
    externalResources: [],
  }
}

export function artifactsCount(collection: ArtifactsCollection): number {
  return collection.documents.length + collection.citations.length + collection.nextSteps.length + collection.createdRecords.length
}
