-- Independent default for structured-output tasks (chunk enrichment's
-- topic/subtopic/key_concepts JSON extraction; AI-assisted Wiki draft
-- synthesis) -- separate from the plain generation default (is_default).
--
-- Mirrors is_default's shape rather than adding a fifth model_type value:
-- structured output is a CAPABILITY of a generation model
-- (supports_structured_output, already a column), not a distinct KIND of
-- model the way generation/embedding/speech/multimodal are -- a single row
-- can't simultaneously BE type 'generation' and type 'structured_output',
-- so it doesn't belong in the model_type check constraint. This lets an
-- admin pick, among generation models that support structured output,
-- a different default than whatever's used for plain prose generation
-- (e.g. Wiki synthesis) -- the same bug class as the embedding fix
-- (getActiveProvider() used for a task that actually needed a different
-- purpose-scoped default) but for a capability that hasn't caused a hard
-- failure yet, only an unconfigurable one.
alter table ai_models add column if not exists is_default_structured_output boolean not null default false;

alter table ai_models add constraint ai_models_default_structured_output_requires_capability
  check (not is_default_structured_output or supports_structured_output);

-- At most one row globally -- not scoped by model_type the way
-- ai_models_one_default_per_type is, since structured output isn't a
-- model_type value. Indexing a constant is the standard Postgres pattern
-- for "at most one row where this predicate holds."
create unique index ai_models_one_default_structured_output on ai_models ((true)) where is_default_structured_output;

-- Seed from current state so this ships with zero downtime: whichever
-- model is already the plain generation default AND already supports
-- structured output keeps doing exactly what it does today (chunk
-- enrichment and Wiki synthesis already both work) until an admin
-- deliberately picks something different via the new UI control.
update ai_models set is_default_structured_output = true
where is_default = true and model_type = 'generation' and supports_structured_output = true;
