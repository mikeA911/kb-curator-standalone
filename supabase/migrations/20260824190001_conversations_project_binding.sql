-- Project-Aware Knowledge and Assistant Context, Stage 2: bind a
-- conversation to a project. Nullable -- a general/unbound conversation
-- (project_id null) keeps working exactly as today.
--
-- Immutable once set: a conversation is either general forever, or bound to
-- one project forever. "Changing project context" per the dev request means
-- starting a new conversation, not re-pointing an existing one -- so there's
-- no "transition" action to build; this trigger is the DB-level guarantee
-- that nothing can silently blend two projects' histories into one
-- conversation, by construction rather than by every caller remembering not
-- to.
--
-- conversations_owner/chat_messages_owner RLS (20260818120001_chat_assistant.sql)
-- is deliberately unchanged -- project_id is just a categorization column on
-- the user's own conversation, and nothing in this stage asks for a project
-- curator to see a teammate's chat history.

alter table conversations add column project_id uuid references projects(id) on delete set null;
create index conversations_project_id_idx on conversations(project_id);

create or replace function validate_conversation_project_id_immutable()
returns trigger language plpgsql as $$
begin
  if old.project_id is not null and new.project_id is distinct from old.project_id then
    raise exception 'conversations.project_id cannot be changed once set -- start a new conversation instead';
  end if;
  return new;
end;
$$;

create trigger conversations_project_id_immutable
  before update of project_id on conversations
  for each row execute function validate_conversation_project_id_immutable();

-- Durable "turn in progress" marker so a page refresh mid-turn doesn't lose
-- track of a pending reply -- set at turn start, cleared when the turn
-- resolves either way. Stale (old) values are treated as abandoned by the
-- client, not polled forever; see src/components/chat/ChatPanel.tsx.
alter table conversations add column pending_turn_started_at timestamptz;
