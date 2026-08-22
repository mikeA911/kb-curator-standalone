-- gemini-3.5-flash was seeded without supports_tools (defaults to false --
-- 20260810110002_seed_ai_providers.sql only set supports_structured_output/
-- supports_reasoning), so listChatCapableModels() silently excluded it from
-- the Assistant's model picker even though GeminiProvider.generateChat()
-- already implements real function-calling (src/lib/ai/gemini-provider.ts).
update ai_models set supports_tools = true
where model_id = 'gemini-3.5-flash'
  and provider_id = (select id from ai_providers where name = 'gemini');
