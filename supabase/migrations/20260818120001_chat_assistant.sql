-- M6D: Conversational Workbench Assistant (M5F Phase E). Personal chat
-- history between one user and the Assistant, plus provenance columns on
-- the three tables the Assistant's existing MCP tools (Phase D) actually
-- create rows in.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_id_idx on conversations(user_id);

create trigger conversations_set_updated_at before update on conversations
  for each row execute function set_updated_at();

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  -- Denormalized from conversations.user_id -- keeps RLS a direct column
  -- check on both tables instead of a subquery/join, and sidesteps the
  -- INSERT...RETURNING-visibility gotcha a security-definer helper function
  -- would otherwise hit (see project_notes_select_own's comment for why
  -- that pattern exists elsewhere in this schema).
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text,
  -- Present on an assistant message that requested one or more tool calls.
  tool_calls jsonb,
  -- Present on a 'tool' role message: which call this is the result of.
  tool_call_id text,
  tool_name text,
  created_at timestamptz not null default now()
);

create index chat_messages_conversation_id_idx on chat_messages(conversation_id);

-- RLS ------------------------------------------------------------------
-- Deliberately NO is_admin(uid) OR ... bypass on either table, unlike every
-- other table in this schema -- chat history is personal enough that this
-- is an intentional exception, not an oversight. Nothing in the M5F design
-- note requires admin visibility into another user's conversations.
alter table conversations enable row level security;
alter table chat_messages enable row level security;

create policy "conversations_owner" on conversations
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "chat_messages_owner" on chat_messages
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- withLogging (src/lib/ai/logging.ts) needs to record the new generateChat
-- operation. Purely additive, same drop-and-recreate pattern used elsewhere
-- in this schema for widening a check constraint.
alter table ai_operation_logs drop constraint ai_operation_logs_operation_check;
alter table ai_operation_logs add constraint ai_operation_logs_operation_check
  check (operation in ('generate_text', 'generate_structured', 'generate_chat', 'embed'));

-- Provenance -------------------------------------------------------------
-- Additive, default 'ui' so no existing row's meaning changes. Only on the
-- three tables the Assistant's write tools (create_project,
-- create_workstream, attach_workstream_artifact -- src/lib/mcp/tools.ts)
-- actually create rows in, not a speculative blanket migration.
alter table projects add column created_via text not null default 'ui';
alter table projects add column assistant_prompt_version text;
alter table projects add column assistant_conversation_id uuid references conversations(id) on delete set null;

alter table project_workstreams add column created_via text not null default 'ui';
alter table project_workstreams add column assistant_prompt_version text;
alter table project_workstreams add column assistant_conversation_id uuid references conversations(id) on delete set null;

alter table workstream_artifacts add column created_via text not null default 'ui';
alter table workstream_artifacts add column assistant_prompt_version text;
alter table workstream_artifacts add column assistant_conversation_id uuid references conversations(id) on delete set null;
