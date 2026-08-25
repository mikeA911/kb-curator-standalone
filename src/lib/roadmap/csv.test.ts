import { describe, it, expect } from 'vitest'
import { buildRoadmapCsv } from './csv'
import type { RoadmapItem } from '@/types/database'

function item(overrides: Partial<RoadmapItem>): RoadmapItem {
  return {
    id: '1',
    item_ref: 'OR-001',
    title: 'Example item',
    item_type: 'Change',
    public_milestone: 'M1',
    priority: 'P1',
    status: 'proposed',
    pilot_position: 'Important',
    decision_next_action: 'Do the thing.',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('buildRoadmapCsv', () => {
  it('produces a header row plus one row per item, comma-joined', () => {
    const csv = buildRoadmapCsv([item({})])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('ID,Request/change,Type,Public milestone,Priority,Status,Pilot position,Decision/next action,Updated')
    expect(lines[1]).toBe('OR-001,Example item,Change,M1,P1,proposed,Important,Do the thing.,2026-01-01T00:00:00Z')
  })

  it('quotes and escapes a field containing a comma', () => {
    const csv = buildRoadmapCsv([item({ title: 'Fix the "Save" button, sometimes' })])
    expect(csv.split('\r\n')[1]).toContain('"Fix the ""Save"" button, sometimes"')
  })

  it('renders null optional fields as empty, not the literal word null', () => {
    const csv = buildRoadmapCsv([item({ public_milestone: null, priority: null, pilot_position: null, decision_next_action: null })])
    expect(csv.split('\r\n')[1]).toBe('OR-001,Example item,Change,,,proposed,,,2026-01-01T00:00:00Z')
  })

  it('returns just the header row for an empty list', () => {
    const csv = buildRoadmapCsv([])
    expect(csv.split('\r\n')).toHaveLength(1)
  })
})
