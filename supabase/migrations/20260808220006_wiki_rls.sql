-- Wiki RLS. Approved content is readable by any authenticated user (Wiki
-- serves contextual Help app-wide, not just curators); draft/review content
-- and any mutation is curator/admin only. Approval itself is never granted
-- via these policies -- it happens exclusively through the admin Server
-- Action using the service-role client (see src/app/actions/wiki.ts),
-- mirroring documents' approve-document flow. wiki_versions therefore has no
-- general UPDATE policy at all: rows are inserted once and never mutated by
-- a regular staff session.

-- wiki_categories -------------------------------------------------------------
alter table wiki_categories enable row level security;

create policy "wiki_categories_select_authenticated" on wiki_categories
  for select using (auth.role() = 'authenticated');

create policy "wiki_categories_admin_manage" on wiki_categories
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- wiki_articles -----------------------------------------------------------------
alter table wiki_articles enable row level security;

create policy "wiki_articles_select_approved_or_staff" on wiki_articles
  for select using (status = 'approved' or is_curator_or_admin(auth.uid()));

create policy "wiki_articles_insert_staff" on wiki_articles
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "wiki_articles_update_staff" on wiki_articles
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- wiki_versions -----------------------------------------------------------------
alter table wiki_versions enable row level security;

create policy "wiki_versions_select_approved_or_staff" on wiki_versions
  for select using (approved_at is not null or is_curator_or_admin(auth.uid()));

create policy "wiki_versions_insert_staff" on wiki_versions
  for insert with check (is_curator_or_admin(auth.uid()));

-- No UPDATE policy: approval sets approved_by/approved_at via the
-- service-role admin action only. No DELETE policy: version history is
-- permanent.

-- wiki_sources ------------------------------------------------------------------
alter table wiki_sources enable row level security;

create policy "wiki_sources_select_approved_or_staff" on wiki_sources
  for select using (
    is_curator_or_admin(auth.uid())
    or exists (
      select 1 from wiki_versions v
      where v.id = wiki_sources.wiki_version_id and v.approved_at is not null
    )
  );

create policy "wiki_sources_insert_staff" on wiki_sources
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "wiki_sources_delete_staff" on wiki_sources
  for delete using (is_curator_or_admin(auth.uid()));

-- wiki_relations ----------------------------------------------------------------
alter table wiki_relations enable row level security;

create policy "wiki_relations_select_authenticated" on wiki_relations
  for select using (auth.role() = 'authenticated');

create policy "wiki_relations_manage_staff" on wiki_relations
  for all using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- wiki_vectors ------------------------------------------------------------------
alter table wiki_vectors enable row level security;

create policy "wiki_vectors_staff_all" on wiki_vectors
  for all using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));
