import 'server-only'
import { SignJWT } from 'jose'
import { env } from '@/lib/env'

// Short-lived signed delegation tokens (Agent Gateway, delegated_user_identity
// auth method) -- docs/dev-request-agent-gateway-remote-mcp-delegation-and-
// audit.md's ยง1, now real for the live OrderLunch MCP Showcase registration.
// HS256 shared secret first, per Mike's own sequencing -- JWKS/asymmetric
// signing only once a second consumer exists to justify it (explicitly out
// of scope here, same as key rotation/revocation).

export class DelegationSigningError extends Error {}

export interface DelegationClaims {
  userId: string
  projectId: string
  // Real tool names only, never the gw__<slug>__ namespaced form -- the
  // remote server has no concept of KBS's own namespacing.
  tools: string[]
  roles: string[]
}

// Deliberately generic, not hardcoded to one integration -- read from that
// integration's own credentials_policy (see resolveCredentials in
// credentials.ts), same "policy describes HOW to authenticate, never a
// secret value" convention as everywhere else credentials_policy is used.
export interface DelegationConfig {
  secretEnvVar: string
  issuer: string
  audience: string
}

// Short enough that a leaked token is useless shortly after (one Gateway
// round trip, generous); no refresh mechanism -- a fresh token is minted
// per outbound call (see credentials.ts), never cached or reused, including
// across the discovery call and any subsequent real tool call in the same
// turn.
const TOKEN_TTL_SECONDS = 90

export async function mintDelegationToken(claims: DelegationClaims, config: DelegationConfig): Promise<string> {
  const secret = env.byName(config.secretEnvVar)
  if (!secret) {
    throw new DelegationSigningError(`Delegation signing secret env var '${config.secretEnvVar}' is not set -- cannot mint a delegation token`)
  }

  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ project_id: claims.projectId, tools: claims.tools, roles: claims.roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .setJti(crypto.randomUUID())
    .sign(new TextEncoder().encode(secret))
}

// The one tool this pass hardcodes a name for: OrderLunch's own spec names
// advance_order_state as "test operator only." Generalizing this into a
// real per-tool-role requirement (a DB column, a naming convention) is
// future work for a second delegated integration, not needed for one.
const TEST_OPERATOR_ONLY_TOOLS = new Set(['advance_order_state'])

export function isTestOperatorOnlyTool(realToolName: string): boolean {
  return TEST_OPERATOR_ONLY_TOOLS.has(realToolName)
}

// Confirmed with Mike: test_operator is granted only to a platform admin
// who also holds an active membership on the Project in question -- no new
// authorization concept, reuses a role already trusted with sensitive
// platform actions elsewhere.
export function computeDelegationRoles(input: { projectRole: string | null; platformRole: string; isProjectMember: boolean }): string[] {
  const roles: string[] = []
  if (input.projectRole) roles.push(input.projectRole)
  if (input.platformRole === 'admin' && input.isProjectMember) roles.push('test_operator')
  return roles
}
