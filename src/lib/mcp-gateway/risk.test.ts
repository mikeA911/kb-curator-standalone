import { describe, it, expect } from 'vitest'
import { classifyToolRisk, isReadLikeToolName, requiresConfirmation } from './risk'

describe('isReadLikeToolName', () => {
  it('recognizes every read-like prefix', () => {
    for (const name of ['get_menu', 'find_available_outlets', 'check_delivery_area', 'list_things', 'prepare_order', 'search_orders']) {
      expect(isReadLikeToolName(name)).toBe(true)
    }
  })

  it('rejects write-shaped names', () => {
    for (const name of ['place_order', 'cancel_order', 'submit_payment', 'create_ticket']) {
      expect(isReadLikeToolName(name)).toBe(false)
    }
  })
})

describe('classifyToolRisk', () => {
  it('trusts a read_only version for every tool, even a write-shaped name', () => {
    expect(classifyToolRisk('read_only', 'place_order')).toBe('read_only')
  })

  it('auto-classifies a read-like tool name as read_only even under a riskier version ceiling', () => {
    expect(classifyToolRisk('consequential_write', 'get_menu')).toBe('read_only')
    expect(classifyToolRisk('consequential_write', 'prepare_order')).toBe('read_only')
  })

  it('falls back to the version-level classification for a write-shaped tool name', () => {
    expect(classifyToolRisk('consequential_write', 'place_order')).toBe('consequential_write')
    expect(classifyToolRisk('reversible_write', 'cancel_order')).toBe('reversible_write')
  })
})

describe('requiresConfirmation', () => {
  it('gates everything except read_only', () => {
    expect(requiresConfirmation('read_only')).toBe(false)
    expect(requiresConfirmation('reversible_write')).toBe(true)
    expect(requiresConfirmation('consequential_write')).toBe(true)
    expect(requiresConfirmation('administrative')).toBe(true)
  })
})
