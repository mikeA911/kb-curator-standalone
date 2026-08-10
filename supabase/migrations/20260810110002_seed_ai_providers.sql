-- Seed the registry with what the app already had (openai, gemini) plus the
-- new Groq provider. Embedding stays on Gemini (matches vector(1536) in
-- kb_vectors/wiki_vectors -- "do not change the vector schema merely to add
-- generation providers"). Generation default moves to Groq's smallest/
-- fastest suggested model since OpenAI credits are exhausted and Gemini
-- quota is limited -- exactly the brief's own "Suggested Immediate
-- Configuration".
insert into ai_providers (name, provider_type, display_name, base_url, api_key_env_var, enabled, supports_model_discovery) values
  ('openai', 'openai', 'OpenAI', null, 'OPENAI_API_KEY', true, true),
  ('gemini', 'gemini', 'Gemini', null, 'GOOGLE_API_KEY', true, false),
  ('groq', 'groq', 'Groq', 'https://api.groq.com/openai/v1', 'GROQ_API_KEY', true, true);

-- openai models -- not default (credits exhausted, per the brief's own
-- motivation for this whole feature), but registered and enabled so they
-- work again the moment credits return.
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_tools)
select id, 'gpt-4o-mini', 'GPT-4o mini', 'generation', false, true, true from ai_providers where name = 'openai';
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, embedding_dimensions)
select id, 'text-embedding-3-small', 'text-embedding-3-small', 'embedding', false, 1536 from ai_providers where name = 'openai';

-- gemini models -- embedding default.
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_reasoning)
select id, 'gemini-3.5-flash', 'Gemini 3.5 Flash', 'generation', false, true, true from ai_providers where name = 'gemini';
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, embedding_dimensions)
select id, 'gemini-embedding-001', 'gemini-embedding-001', 'embedding', true, 1536 from ai_providers where name = 'gemini';

-- groq models -- generation default. Development-candidate models named in
-- the brief; none flagged as already-deprecated at the time of writing.
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_tools)
select id, 'openai/gpt-oss-20b', 'GPT-OSS 20B', 'generation', true, true, true from ai_providers where name = 'groq';
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_tools)
select id, 'openai/gpt-oss-120b', 'GPT-OSS 120B', 'generation', false, true, true from ai_providers where name = 'groq';
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_tools)
select id, 'qwen/qwen3.6-27b', 'Qwen 3.6 27B', 'generation', false, true, true from ai_providers where name = 'groq';
