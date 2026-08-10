import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/types/database'

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

// Every Server Action / Route Handler that mutates data calls one of these
// directly -- proxy.ts only refreshes the session cookie, it does not gate
// routes (see proxy.ts comment). This is the actual enforcement point.
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new AuthError('Not authenticated')
  }

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (error || !profile) {
    throw new AuthError('No profile found for authenticated user')
  }

  if (!profile.is_active) {
    throw new AuthError('Account is deactivated')
  }

  return { user, profile: profile as Profile, supabase }
}

const ROLE_RANK: Record<UserRole, number> = { anonymous: 0, consultant: 1, curator: 2, admin: 3 }

// Pure and exported so the authorization rule itself (e.g. "only admins can
// approve") is unit-testable without a Next.js request context -- see
// src/lib/auth.test.ts and lib/wiki/review.ts's approveArticleAction gate.
export function hasRequiredRole(actual: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum]
}

export async function requireRole(minRole: UserRole) {
  const ctx = await requireUser()
  if (!hasRequiredRole(ctx.profile.role, minRole)) {
    throw new AuthError(`Requires ${minRole} role`)
  }
  return ctx
}
