import { describe, it, expect } from 'vitest'
import { hasRequiredRole } from './auth'

// This is the exact rule requireRole('admin') enforces before
// approveArticleAction (Wiki approval) or approveDocument runs -- see
// src/app/actions/wiki.ts. Testing it here avoids mocking Next's cookies()/
// request context just to prove "only admins can approve."
describe('hasRequiredRole', () => {
  it('rejects a curator against an admin-only gate', () => {
    expect(hasRequiredRole('curator', 'admin')).toBe(false)
  })

  it('allows an admin through an admin-only gate', () => {
    expect(hasRequiredRole('admin', 'admin')).toBe(true)
  })

  it('allows a curator through a curator-only gate', () => {
    expect(hasRequiredRole('curator', 'curator')).toBe(true)
  })

  it('rejects a consultant against a curator-only gate', () => {
    expect(hasRequiredRole('consultant', 'curator')).toBe(false)
  })

  it('rejects an anonymous session against a consultant-only gate', () => {
    expect(hasRequiredRole('anonymous', 'consultant')).toBe(false)
  })

  // OL-007: 'member' sits between anonymous and consultant -- this is the
  // exact rule createProject/registerBuilderIntegration now enforce
  // (hasRequiredRole(profile.role, 'consultant')) to exclude a member the
  // same way the tightened projects_insert_self/builder_integrations_
  // insert_own RLS policies do.
  it('rejects a member against a consultant-only gate', () => {
    expect(hasRequiredRole('member', 'consultant')).toBe(false)
  })

  it('allows a member through a member-only gate', () => {
    expect(hasRequiredRole('member', 'member')).toBe(true)
  })

  it('rejects an anonymous session against a member-only gate', () => {
    expect(hasRequiredRole('anonymous', 'member')).toBe(false)
  })

  it('allows a consultant through a member-only gate (ranks above it)', () => {
    expect(hasRequiredRole('consultant', 'member')).toBe(true)
  })
})
