-- The gemini provider row was seeded expecting GOOGLE_API_KEY
-- (20260810110002_seed_ai_providers.sql), but the key was actually added to
-- .env.local/Vercel as GEMINI_API_KEY -- same naming mismatch as the
-- earlier Groq/Grok mixup this session. resolveApiKey() in
-- src/lib/ai/registry.ts already looks up whatever name is stored here
-- (env.byName(provider.api_key_env_var)), so updating this one value is
-- sufficient -- no code change needed.
update ai_providers set api_key_env_var = 'GEMINI_API_KEY' where name = 'gemini';
