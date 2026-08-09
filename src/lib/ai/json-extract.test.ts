import { describe, it, expect } from 'vitest'
import { extractJsonObject } from './json-extract'

describe('extractJsonObject', () => {
  it('parses clean JSON', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 })
  })

  it('ignores a stray trailing brace after a complete object (observed live from Gemini)', () => {
    const raw = '{\n  "topic": "RAG",\n  "confidence": 0.95\n}\n}\n'
    expect(extractJsonObject(raw)).toEqual({ topic: 'RAG', confidence: 0.95 })
  })

  it('ignores markdown code fences wrapped around the object', () => {
    const raw = '```json\n{"a": 1}\n```'
    expect(extractJsonObject(raw)).toEqual({ a: 1 })
  })

  it('does not get confused by braces inside string values', () => {
    const raw = '{"note": "use { and } carefully"}'
    expect(extractJsonObject(raw)).toEqual({ note: 'use { and } carefully' })
  })

  it('handles nested objects correctly', () => {
    const raw = '{"outer": {"inner": 1}}'
    expect(extractJsonObject(raw)).toEqual({ outer: { inner: 1 } })
  })

  it('throws when there is no JSON object at all', () => {
    expect(() => extractJsonObject('no json here')).toThrow(SyntaxError)
  })
})
