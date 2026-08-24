// Central, fail-fast environment validation. Import this (not process.env directly)
// wherever a required var is needed, so a missing key fails at startup / first
// import rather than deep inside an async call.

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  // No trailing slash. Falls back to localhost so sitemap/robots/canonical
  // URLs still work in local dev without this set.
  siteUrl: () => (optional('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000').replace(/\/$/, ''),
  openaiApiKey: () => optional('OPENAI_API_KEY'),
  groqApiKey: () => optional('GROQ_API_KEY'),
  // Generic lookup for openai_compatible provider rows, whose env var name
  // is admin-configured (ai_providers.api_key_env_var) rather than known at
  // build time.
  byName: (envVarName: string) => optional(envVarName),
}
