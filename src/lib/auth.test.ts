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

  it('rejects a plain user against a curator-only gate', () => {
    expect(hasRequiredRole('user', 'curator')).toBe(false)
  })
})
