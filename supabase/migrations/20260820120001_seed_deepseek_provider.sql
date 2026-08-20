-- Add DeepSeek as a provider. DeepSeek's API is OpenAI-compatible (same
-- chat/completions shape as Groq), so this reuses OpenAICompatibleProvider
-- via provider_type='openai_compatible' -- no new provider class needed.
-- Neither model is made the platform default; both are enabled and
-- selectable (e.g. from the Assistant's model picker) so trying DeepSeek
-- doesn't change anyone else's default behavior.
insert into ai_providers (name, provider_type, display_name, base_url, api_key_env_var, enabled, supports_model_discovery) values
  ('deepseek', 'openai_compatible', 'DeepSeek', 'https://api.deepseek.com/v1', 'DEEPSEEK_API_KEY', true, true);

-- max_output_tokens set on both per the user's own tip ("prevents burning
-- through credits on unexpectedly long outputs") -- runAssistantTurn now
-- reads this per-model cap and passes it to every generateChat call
-- (src/lib/chat/loop.ts), not just for DeepSeek. Raise/clear it later via
-- the admin Provider Detail page if 2048 proves too tight.
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, max_output_tokens, supports_structured_output, supports_tools)
select id, 'deepseek-v4-flash', 'DeepSeek V4 Flash', 'generation', false, 2048, true, true from ai_providers where name = 'deepseek';
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, max_output_tokens, supports_structured_output, supports_tools)
select id, 'deepseek-v4-pro', 'DeepSeek V4 Pro', 'generation', false, 2048, true, true from ai_providers where name = 'deepseek';
