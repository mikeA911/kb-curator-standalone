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
  openaiApiKey: () => optional('OPENAI_API_KEY'),
  googleApiKey: () => optional('GOOGLE_API_KEY'),
}
