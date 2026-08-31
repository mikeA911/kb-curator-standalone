import { describe, expect, it } from 'vitest'
import { BUILDER_LIFECYCLE, FEATURED_SHOWCASES, SCHOOL_LAB_STEPS, SHOWCASE_STAGES, type ShowcaseStatus } from './journey'

const VALID_STATUSES: ShowcaseStatus[] = ['Live demonstrated', 'Pilot demonstrated', 'Prototype', 'Concept']

function allCards() {
  const byId = new Map([...FEATURED_SHOWCASES, ...SHOWCASE_STAGES.flatMap((stage) => stage.cards)].map((card) => [card.id, card]))
  return [...byId.values()]
}

describe('showcase journey content', () => {
  it('forms one ordered five-stage progression', () => {
    expect(SHOWCASE_STAGES.map((stage) => stage.step)).toEqual([1, 2, 3, 4, 5])
    expect(SHOWCASE_STAGES.map((stage) => stage.id)).toEqual(['know', 'apply', 'connect', 'build', 'learn'])
  })

  it('uses unique card ids within the progressive catalogue', () => {
    const ids = SHOWCASE_STAGES.flatMap((stage) => stage.cards.map((card) => card.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every card a proof-oriented outcome and audience', () => {
    for (const card of SHOWCASE_STAGES.flatMap((stage) => stage.cards)) {
      expect(card.outcome.trim().length).toBeGreaterThan(0)
      expect(card.audiences.length).toBeGreaterThan(0)
      expect(card.capabilities.length).toBeGreaterThan(0)
    }
  })

  it('keeps featured cards focused and includes the verified HR story', () => {
    expect(FEATURED_SHOWCASES).toHaveLength(3)
    expect(FEATURED_SHOWCASES[0]).toMatchObject({ id: 'one-document-two-views', status: 'Live demonstrated' })
  })

  it('shows complete builder and school progressions', () => {
    expect(BUILDER_LIFECYCLE[0]).toBe('Business problem')
    expect(BUILDER_LIFECYCLE.at(-1)).toBe('Available to Ember')
    expect(SCHOOL_LAB_STEPS[0]).toBe('Learn the foundations')
    expect(SCHOOL_LAB_STEPS.at(-1)).toBe('Demonstrate it through Ember')
  })

  it('only uses defined status values', () => {
    for (const card of allCards()) {
      expect(VALID_STATUSES).toContain(card.status)
    }
  })

  it('only links to safe internal routes or external https destinations', () => {
    for (const card of allCards()) {
      if (!card.href) continue
      expect(card.href.startsWith('/') || card.href.startsWith('https://')).toBe(true)
    }
  })

  it('discloses synthetic data on every card that reproduces HR walkthrough content', () => {
    const hrCard = FEATURED_SHOWCASES.find((card) => card.id === 'one-document-two-views')
    expect(hrCard?.disclosure).toMatch(/synthetic/i)
  })

  it('never gives a Concept card a live destination, so it cannot be mistaken for a working link', () => {
    for (const card of allCards()) {
      if (card.status === 'Concept') {
        expect(card.href).toBeUndefined()
      }
    }
  })
})

