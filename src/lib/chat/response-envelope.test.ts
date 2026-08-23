import { describe, it, expect } from 'vitest'
import { AssistantResponseEnvelopeSchema, PersistedAssistantEnvelopeSchema, PRESENT_RESPONSE_TOOL, PRESENT_RESPONSE_TOOL_NAME } from './response-envelope'

describe('AssistantResponseEnvelopeSchema', () => {
  it('accepts a minimal envelope with only schemaVersion and message', () => {
    const result = AssistantResponseEnvelopeSchema.safeParse({ schemaVersion: '1.0', message: 'Hello.' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty message', () => {
    expect(AssistantResponseEnvelopeSchema.safeParse({ schemaVersion: '1.0', message: '' }).success).toBe(false)
  })

  it('fails closed on an unsupported schema version', () => {
    expect(AssistantResponseEnvelopeSchema.safeParse({ schemaVersion: '2.0', message: 'Hello.' }).success).toBe(false)
  })

  it('accepts each optional section individually', () => {
    const base = { schemaVersion: '1.0' as const, message: 'Hello.' }
    expect(AssistantResponseEnvelopeSchema.safeParse({ ...base, quickSummary: 'Short.' }).success).toBe(true)
    expect(
      AssistantResponseEnvelopeSchema.safeParse({
        ...base,
        requirements: [{ label: 'A repo', status: 'available', importance: 'required' }],
      }).success
    ).toBe(true)
    expect(
      AssistantResponseEnvelopeSchema.safeParse({
        ...base,
        links: [{ label: 'Read more', target: { kind: 'wiki_article', id: 'some-slug' } }],
      }).success
    ).toBe(true)
    expect(
      AssistantResponseEnvelopeSchema.safeParse({
        ...base,
        documents: [{ label: 'Plan', documentType: 'implementation_plan', artifactId: 'artifact-1' }],
      }).success
    ).toBe(true)
    expect(
      AssistantResponseEnvelopeSchema.safeParse({
        ...base,
        citations: [{ label: 'Source', sourceType: 'wiki_article', sourceId: 'some-slug' }],
      }).success
    ).toBe(true)
    expect(
      AssistantResponseEnvelopeSchema.safeParse({
        ...base,
        nextSteps: [{ label: 'Define scope', status: 'suggested', action: null }],
      }).success
    ).toBe(true)
    expect(AssistantResponseEnvelopeSchema.safeParse({ ...base, suggestedPrompts: ['Try this'] }).success).toBe(true)
  })

  it('rejects an unsupported navigation target kind', () => {
    const result = AssistantResponseEnvelopeSchema.safeParse({
      schemaVersion: '1.0',
      message: 'Hello.',
      links: [{ label: 'X', target: { kind: 'source', id: 'y' } }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a nextSteps action that is not null', () => {
    const result = AssistantResponseEnvelopeSchema.safeParse({
      schemaVersion: '1.0',
      message: 'Hello.',
      nextSteps: [{ label: 'Do it', status: 'ready', action: 'run_now' }],
    })
    expect(result.success).toBe(false)
  })

  it('enforces max item counts', () => {
    const tooManyPrompts = Array.from({ length: 5 }, (_, i) => `prompt ${i}`)
    const result = AssistantResponseEnvelopeSchema.safeParse({ schemaVersion: '1.0', message: 'Hello.', suggestedPrompts: tooManyPrompts })
    expect(result.success).toBe(false)
  })

  it('enforces max string lengths', () => {
    const result = AssistantResponseEnvelopeSchema.safeParse({ schemaVersion: '1.0', message: 'x'.repeat(8001) })
    expect(result.success).toBe(false)
  })
})

describe('PersistedAssistantEnvelopeSchema', () => {
  it('accepts a minimal persisted envelope', () => {
    expect(PersistedAssistantEnvelopeSchema.safeParse({ message: 'Hi.' }).success).toBe(true)
  })

  it('rejects malformed jsonb that does not match the shape at all', () => {
    expect(PersistedAssistantEnvelopeSchema.safeParse({ notMessage: 'oops' }).success).toBe(false)
    expect(PersistedAssistantEnvelopeSchema.safeParse('just a string').success).toBe(false)
    expect(PersistedAssistantEnvelopeSchema.safeParse(null).success).toBe(false)
  })
})

describe('PRESENT_RESPONSE_TOOL', () => {
  it('is named present_assistant_response and its parameters match the envelope schema', () => {
    expect(PRESENT_RESPONSE_TOOL.name).toBe(PRESENT_RESPONSE_TOOL_NAME)
    expect(PRESENT_RESPONSE_TOOL.name).toBe('present_assistant_response')
    expect(PRESENT_RESPONSE_TOOL.parameters).toBeTruthy()
  })
})
