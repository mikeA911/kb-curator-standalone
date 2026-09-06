-- Working Knowledge & Research Notebooks, Stage 1+2
-- (docs/dev-request-project-scoped-working-knowledge-and-research-notebooks.md).
-- A persistent, Project-scoped research/notes layer Ember can save findings
-- to and later retrieve for conversational continuity -- distinct from
-- approved Wiki/knowledge-base evidence, and never presented as such. Not
-- merged into the Ember role-directed shell work -- its own schema/RLS/tests
-- per the dev request's own instruction.
--
-- No working_knowledge_promotions table -- that's Stage 3 (curation
-- promotion), explicitly deferred; nothing here builds submission/freeze/
-- snapshot logic. trust_status's full six-value domain is still declared now
-- (cheap, forward-compatible) even though only 'working'/'archived'/
-- 'superseded' are reachable via app logic this increment.

create table working_knowledge_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('research_notebook', 'working_note')),
  title text not null,
  objective text,
  content text not null,
  -- 'shared_selected' means specific named recipients via
  -- working_knowledge_shares below; 'shared_project' is a single flag on the
  -- item itself (every active Project member), not a share row per member --
  -- simpler than a literal "Project-wide share marker" row for the same
  -- effective behavior.
  visibility text not null default 'private' check (visibility in ('private', 'shared_selected', 'shared_project')),
  trust_status text not null default 'working' check (trust_status in ('working', 'submitted', 'returned', 'promoted', 'superseded', 'archived')),
  source_conversation_id uuid references conversations(id) on delete set null,
  source_workstream_id uuid references project_workstreams(id) on delete set null,
  source_artifact_id uuid references workstream_artifacts(id) on delete set null,
  synthesis_provider text,
  synthesis_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  refresh_after timestamptz,
  archived_at timestamptz
);

create index working_knowledge_items_project_id_idx on working_knowledge_items(project_id);
create index working_knowledge_items_owner_id_idx on working_knowledge_items(owner_id);

create trigger working_knowledge_items_set_updated_at before update on working_knowledge_items
  for each row execute function set_updated_at();

-- One row per cited web source on a notebook -- bounded excerpt/fingerprint
-- only, never a full page mirror, matching the dev request's copyright/
-- retention guidance.
create table working_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references working_knowledge_items(id) on delete cascade,
  url text not null,
  domain text,
  title text,
  published_date date,
  retrieved_at timestamptz not null default now(),
  excerpt text,
  content_fingerprint text,
  claim_status text check (claim_status in ('unconfirmed', 'corroborated', 'conflicting', 'customer_confirmed')),
  created_at timestamptz not null default now()
);

create index working_knowledge_sources_item_id_idx on working_knowledge_sources(item_id);

-- Named-recipient shares only (visibility='shared_selected'). Revoking flips
-- status + revoked_by/at/reason in place (never deleted); re-sharing after a
-- revoke inserts a fresh row -- same convention as resource_access_grants
-- (20260825100001_project_evidence_access_schema.sql:112-128).
create table working_knowledge_shares (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references working_knowledge_items(id) on delete cascade,
  recipient_user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid references profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_by uuid references profiles(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason text
);

create index working_knowledge_shares_item_id_idx on working_knowledge_shares(item_id);
create index working_knowledge_shares_recipient_idx on working_knowledge_shares(recipient_user_id);

-- The one subtle, acceptance-criteria-critical point: the viewer must be a
-- CURRENTLY ACTIVE Project member on every branch, including the owner's own
-- notebook -- removing the creator's own membership must immediately revoke
-- their own access too (dev request acceptance criterion 7), not just other
-- people's. Uses is_project_member_strict (no is_admin bypass), never plain
-- is_project_member (which silently grants any admin true) -- a platform
-- admin must never see private/shared_project content just by holding that
-- role (acceptance criteria 3, 6).
create or replace function can_view_working_knowledge_item(p_item_id uuid, p_uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from working_knowledge_items i
    where i.id = p_item_id
      and is_project_member_strict(i.project_id, p_uid)
      and (
        i.owner_id = p_uid
        or i.visibility = 'shared_project'
        or exists (
          select 1 from working_knowledge_shares s
          where s.item_id = i.id and s.recipient_user_id = p_uid and s.status = 'active'
        )
      )
  );
$$;

alter table working_knowledge_items enable row level security;
alter table working_knowledge_sources enable row level security;
alter table working_knowledge_shares enable row level security;

create policy "working_knowledge_items_select_visible" on working_knowledge_items
  for select using (can_view_working_knowledge_item(id, auth.uid()));

-- Subquery-free companion, same reason project_notes_select_own exists
-- (20260814120001_project_notes.sql:74-80): can_view_working_knowledge_item
-- re-queries this table internally, whose subquery snapshot doesn't see a
-- row still mid-INSERT, so a plain .insert().select() would otherwise fail
-- RLS for the row it just created.
create policy "working_knowledge_items_select_own" on working_knowledge_items
  for select using (owner_id = auth.uid());

create policy "working_knowledge_items_insert_owner" on working_knowledge_items
  for insert to authenticated
  with check (owner_id = auth.uid() and is_project_member_strict(project_id, auth.uid()));

-- Owner-only edits -- "Project-shared notebooks may initially be
-- owner-editable and read-only to recipients" per the dev request.
create policy "working_knowledge_items_update_owner" on working_knowledge_items
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "working_knowledge_sources_select_visible" on working_knowledge_sources
  for select using (can_view_working_knowledge_item(item_id, auth.uid()));

create policy "working_knowledge_sources_manage_owner" on working_knowledge_sources
  for all using (
    exists (select 1 from working_knowledge_items i where i.id = working_knowledge_sources.item_id and i.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from working_knowledge_items i where i.id = working_knowledge_sources.item_id and i.owner_id = auth.uid())
  );

-- A recipient can see their own grant (so "shared with me" is listable); only
-- the parent item's owner can create/revoke shares.
create policy "working_knowledge_shares_select_owner_or_recipient" on working_knowledge_shares
  for select using (
    recipient_user_id = auth.uid()
    or exists (select 1 from working_knowledge_items i where i.id = working_knowledge_shares.item_id and i.owner_id = auth.uid())
  );

create policy "working_knowledge_shares_manage_owner" on working_knowledge_shares
  for insert to authenticated
  with check (
    granted_by = auth.uid()
    and exists (select 1 from working_knowledge_items i where i.id = working_knowledge_shares.item_id and i.owner_id = auth.uid())
  );

create policy "working_knowledge_shares_revoke_owner" on working_knowledge_shares
  for update using (
    exists (select 1 from working_knowledge_items i where i.id = working_knowledge_shares.item_id and i.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from working_knowledge_items i where i.id = working_knowledge_shares.item_id and i.owner_id = auth.uid())
  );
