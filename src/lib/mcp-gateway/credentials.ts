import 'server-only'
import { env } from '@/lib/env'
import type { AuthHeader } from './client'

// Mirrors ai_providers.api_key_env_var's existing "reference the env var
// NAME, never the secret value" indirection (src/lib/ai/registry.ts,
// src/lib/workbench/ai-providers.ts) rather than inventing a new pattern.
// Real secret-vault resolution (short-lived tokens, a Sandz-hosted secrets
// service) is explicitly out of scope -- docs/sandz-edge-deployment-
// requirements-lunch-agent.md's credentials/secrets section is still an
// open question. This resolves only as far as "the app's own .env.local
// happens to hold the value," which is all mock-lunch-agent (auth_method:
// 'none') needs to exercise end-to-end this pass.
export class GatewayCredentialError extends Error {}

export function resolveCredentials(credentialsPolicy: Record<string, unknown>, authMethod: string | null): AuthHeader | null {
  if (!authMethod || authMethod === 'none') return null

  const envVarName = typeof credentialsPolicy.name === 'string' ? credentialsPolicy.name : null
  if (!envVarName) {
    throw new GatewayCredentialError(`auth_method is '${authMethod}' but credentials_policy has no env var name to resolve`)
  }
  const value = env.byName(envVarName)
  if (!value) {
    throw new GatewayCredentialError(`Credential env var '${envVarName}' is not set -- cannot call this integration`)
  }
  return { header: 'Authorization', value: `Bearer ${value}` }
}
