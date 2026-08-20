-- Assistant Onboarding, History & Bounded Context (Stage 1 + 2).
-- Stage 1: last_message_at lets the UI list/resume conversations by recency
-- without a join against chat_messages on every render. Stage 2: a rolling
-- per-conversation summary so a long conversation's provider payload can
-- stay bounded instead of growing unboundedly with every turn.

alter table conversations add column last_message_at timestamptz;

update conversations c
set last_message_at = (
  select max(m.created_at) from chat_messages m where m.conversation_id = c.id
);

-- Kept independent of the Stage 2 summary columns below (which also update
-- this row) so "most recently active" stays accurate even on a turn whose
-- summary refresh is skipped or fails.
create or replace function set_conversation_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger chat_messages_set_conversation_last_message_at
  after insert on chat_messages
  for each row execute function set_conversation_last_message_at();

-- Stage 2: rolling summary. summary_through_message_id marks how much of
-- the conversation the summary already covers (set null, not cascaded,
-- if that message is ever deleted -- there is no delete UI yet, but this
-- keeps a future one from leaving a dangling reference).
alter table conversations add column summary_json jsonb;
alter table conversations add column summary_through_message_id uuid references chat_messages(id) on delete set null;
alter table conversations add column summary_updated_at timestamptz;
alter table conversations add column summary_provider text;
alter table conversations add column summary_model text;
alter table conversations add column summary_version text;
