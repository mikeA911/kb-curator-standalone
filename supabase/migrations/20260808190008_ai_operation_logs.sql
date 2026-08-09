-- ai_operation_logs: lightweight record of every server-side AI provider call.
-- Not a full observability/tracing system (that's a later milestone) -- just enough
-- to answer "what AI calls happened, against what, and did they succeed" today.
create table if not exists ai_operation_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation text not null check (operation in ('generate_text', 'generate_structured', 'embed')),
  provider text not null,
  model text not null,
  document_id uuid references documents(id) on delete set null,
  chunk_id uuid references document_chunks(id) on delete set null,
  requested_by uuid references profiles(id) on delete set null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  success boolean not null,
  error_message text
);

create index if not exists ai_operation_logs_created_at_idx on ai_operation_logs(created_at desc);
create index if not exists ai_operation_logs_document_id_idx on ai_operation_logs(document_id);
