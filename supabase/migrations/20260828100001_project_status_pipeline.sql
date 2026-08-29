-- Adds an explicit 'review' status value so a project can move through a
-- real Initial Draft -> Working on it -> For Approval -> Approved pipeline,
-- mirroring wiki_articles' existing draft -> review -> approved precedent
-- (supabase/migrations/20260808220002_wiki_articles.sql). 'active' already
-- existed in the check constraint but was never written by any code path
-- (confirmed by grep before this migration) -- it becomes "Working on it".
-- 'completed' is unchanged and keeps meaning "Approved" (approveProject's
-- own target value, per its existing confirm-dialog copy). Per Mike,
-- 2026-08-28: the project detail page's free-text "Status" field was a
-- naming mistake -- it's being replaced with this real, button-driven
-- pipeline; the free-text field moves to the Notes section instead.
alter table projects drop constraint projects_status_check;
alter table projects add constraint projects_status_check
  check (status = any (array['draft'::text, 'active'::text, 'review'::text, 'completed'::text, 'archived'::text]));
