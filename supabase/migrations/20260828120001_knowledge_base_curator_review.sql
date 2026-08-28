-- Curators can now create a new Knowledge Base directly from the upload
-- flow; the admin page's role shifts from creating KBs to reviewing them.
-- Mirrors wiki_articles' draft -> review -> approved precedent, collapsed
-- to two curator-visible states since creating a KB mid-upload already
-- counts as "submitting" it -- no separate draft-then-submit step. Per
-- Mike, 2026-08-28.
--
-- Orthogonal to the existing lifecycle_status (active/reference/archived,
-- a retention concept) -- a newly curator-created KB is lifecycle_status
-- 'active' (usable right away for uploads) and status 'pending' (awaiting
-- admin review) at the same time.
alter table knowledge_bases add column status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));

-- Existing rows are all admin-created and already trusted -- explicit
-- backfill, not relying on the column default alone, so this is auditable.
update knowledge_bases set status = 'approved';

-- kb_admin_manage's existing `for all` policy
-- (supabase/migrations/20260808190010_rls_policies.sql) already covers
-- admin update (approve/reject) and delete -- only INSERT needs a new
-- policy. Curators (and admins) may insert, but only ever as 'pending' --
-- cannot self-approve.
create policy "kb_curator_insert_pending" on knowledge_bases
  for insert with check (is_curator_or_admin(auth.uid()) and status = 'pending');
