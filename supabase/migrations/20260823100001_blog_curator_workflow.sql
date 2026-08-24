-- Extend blog_posts so curators can create and edit their own draft posts,
-- while only admins can publish/unpublish/delete (see
-- docs/dev-request-blog-contributor-workflow-and-editorial-placeholders.md).
-- status stays a 2-value enum (draft/published); "ready for review" is
-- represented as a nullable submitted_for_review_at/submitted_by pair per
-- the dev request's own offered simplification, rather than a 3-value
-- status enum.
alter table blog_posts
  add column if not exists last_editor_id uuid references profiles(id) on delete set null,
  add column if not exists submitted_for_review_at timestamptz,
  add column if not exists submitted_by uuid references profiles(id) on delete set null,
  add column if not exists published_by uuid references profiles(id) on delete set null,
  add column if not exists source_reference text;

-- Existing seeded content has no author_id -- last_editor_id starts out
-- matching author_id (null for seed content, matching the dev request's
-- "KB Sandbox editorial seed" attribution rule at the display layer).
-- published_by/published_at are deliberately NOT backfilled for the
-- already-published/seeded rows -- the dev request explicitly forbids
-- attributing migration-generated content to whichever admin happens to
-- touch it first.
update blog_posts set last_editor_id = author_id where last_editor_id is null;

drop policy if exists "blog_posts_admin_all" on blog_posts;

-- Any curator/admin can see any draft (matches wiki_articles_select_staff's
-- read pattern; the dev request's ownership restriction applies to
-- editing, not viewing).
create policy "blog_posts_select_staff" on blog_posts
  for select using (is_curator_or_admin(auth.uid()));

create policy "blog_posts_insert_staff" on blog_posts
  for insert with check (is_curator_or_admin(auth.uid()) and author_id = auth.uid() and status = 'draft');

create policy "blog_posts_update_admin" on blog_posts
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- Stricter than Wiki's wiki_articles_update_staff (20260808220006) on
-- purpose: a curator may update only their own row, and only while it's
-- still unsubmitted -- once submitted for review, editing is blocked
-- until an admin returns it to draft (clears submitted_for_review_at).
-- WITH CHECK still pins status to 'draft' so a curator can never flip
-- status/published_at/published_by through this policy.
create policy "blog_posts_update_own_eligible_draft" on blog_posts
  for update
  using (is_curator_or_admin(auth.uid()) and author_id = auth.uid() and status = 'draft' and submitted_for_review_at is null)
  with check (is_curator_or_admin(auth.uid()) and author_id = auth.uid() and status = 'draft');

create policy "blog_posts_delete_admin" on blog_posts
  for delete using (is_admin(auth.uid()));
