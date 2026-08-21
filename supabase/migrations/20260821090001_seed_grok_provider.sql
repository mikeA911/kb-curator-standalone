-- Add Grok (xAI) as a provider -- distinct from Groq (the existing 'groq'
-- provider, a fast-inference host for open models like GPT-OSS). Easy to
-- confuse; they are unrelated companies/APIs. xAI's API is OpenAI-compatible
-- (same chat/completions shape), so this reuses OpenAICompatibleProvider via
-- provider_type='openai_compatible' -- no new provider class needed.
-- Not made the platform default; enabled and selectable so trying it doesn't
-- change anyone else's default behavior.
insert into ai_providers (name, provider_type, display_name, base_url, api_key_env_var, enabled, supports_model_discovery) values
  ('grok', 'openai_compatible', 'Grok (xAI)', 'https://api.x.ai/v1', 'GROK_API_KEY', true, true);

-- Grok 4.6 per the user's own account console (xAI's flagship, "built for
-- long-horizon agentic coding and real-world knowledge work", 500K context).
-- The model_id string is a best guess from the console's display name --
-- the account had no credits yet to confirm via live model discovery
-- (GET /v1/models returned 403 "no credits or licenses"). Once credits are
-- added, use Admin > Grok > "Refresh Models" to confirm/correct this row.
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, context_window, max_output_tokens, supports_structured_output, supports_tools)
select id, 'grok-4.6', 'Grok 4.6', 'generation', false, 500000, 8192, true, true from ai_providers where name = 'grok';
