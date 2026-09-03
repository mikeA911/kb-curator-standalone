import 'server-only'
import { env } from '@/lib/env'
import { mintDelegationToken } from './delegation'
import type { AuthHeader } from './client'

// Mirrors ai_providers.api_key_env_var's existing "reference the env var
// NAME, never the secret value" indirection (src/lib/ai/registry.ts,
// src/lib/workbench/ai-providers.ts) rather than inventing a new pattern.
// Real secret-vault resolution (a Sandz-hosted secrets service) is still an
// open question (docs/sandz-edge-deployment-requirements-lunch-agent.md) --
// this resolves only as far as "the app's own env vars hold the value,"
// which covers service_identity (a static shared secret) and now
// delegated_user_identity (a signing secret used to mint a fresh token per
// call, never itself sent to the remote server).
export class GatewayCredentialError extends Error {}

// Only present for delegated_user_identity -- resolveCredentials mints the
// token itself, so it needs the caller/Project/grant context that a static
// env-var lookup never did.
export interface DelegationRequestContext {
  userId: string
  projectId: string
  tools: string[]
  roles: string[]
}

export async function resolveCredentials(
  credentialsPolicy: Record<string, unknown>,
  authMethod: string | null,
  delegation?: DelegationRequestContext
): Promise<AuthHeader[]> {
  if (!authMethod || authMethod === 'none') return []

  if (authMethod === 'delegated_user_identity') {
    if (!delegation) {
      throw new GatewayCredentialError('auth_method is delegated_user_identity but no caller/Project context was provided to mint a token')
    }
    const secretEnvVar = typeof credentialsPolicy.delegationSecretEnvVar === 'string' ? credentialsPolicy.delegationSecretEnvVar : null
    const issuer = typeof credentialsPolicy.delegationIssuer === 'string' ? credentialsPolicy.delegationIssuer : null
    const audience = typeof credentialsPolicy.delegationAudience === 'string' ? credentialsPolicy.delegationAudience : null
    if (!secretEnvVar || !issuer || !audience) {
      throw new GatewayCredentialError(
        'auth_method is delegated_user_identity but credentials_policy is missing delegationSecretEnvVar/delegationIssuer/delegationAudience'
      )
    }

    const token = await mintDelegationToken(
      { userId: delegation.userId, projectId: delegation.projectId, tools: delegation.tools, roles: delegation.roles },
      { secretEnvVar, issuer, audience }
    )
    const headers: AuthHeader[] = [{ header: 'Authorization', value: `Bearer ${token}` }]

    // A second, always-static header some integrations require alongside
    // the per-call delegation token -- e.g. the live OrderLunch server's
    // x-gateway-api-key. Optional and generic: any integration can declare
    // it via credentials_policy without the Gateway hardcoding this one
    // integration's name.
    const gatewayApiKeyEnvVar = typeof credentialsPolicy.gatewayApiKeyHeaderEnvVar === 'string' ? credentialsPolicy.gatewayApiKeyHeaderEnvVar : null
    const gatewayApiKeyHeaderName = typeof credentialsPolicy.gatewayApiKeyHeaderName === 'string' ? credentialsPolicy.gatewayApiKeyHeaderName : 'x-gateway-api-key'
    if (gatewayApiKeyEnvVar) {
      const key = env.byName(gatewayApiKeyEnvVar)
      if (!key) {
        throw new GatewayCredentialError(`Gateway API key env var '${gatewayApiKeyEnvVar}' is not set -- cannot call this integration`)
      }
      headers.push({ header: gatewayApiKeyHeaderName, value: key })
    }

    return headers
  }

  const envVarName = typeof credentialsPolicy.name === 'string' ? credentialsPolicy.name : null
  if (!envVarName) {
    throw new GatewayCredentialError(`auth_method is '${authMethod}' but credentials_policy has no env var name to resolve`)
  }
  const value = env.byName(envVarName)
  if (!value) {
    throw new GatewayCredentialError(`Credential env var '${envVarName}' is not set -- cannot call this integration`)
  }
  return [{ header: 'Authorization', value: `Bearer ${value}` }]
}
