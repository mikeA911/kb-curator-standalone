-- Caught live, testing a non-member platform admin against the new
-- /sources/[id] page (Project-Aware Knowledge and Assistant Context,
-- Stage 2): project_knowledge_bases_manage_curator and
-- project_wiki_articles_manage_curator (Stage 1,
-- 20260824150001_project_wiki_articles_and_kb_detach.sql and
-- 20260824160001_project_knowledge_visibility_fixes.sql) are both
-- `for all using (can_curate_project(project_id, auth.uid()))` -- and
-- can_curate_project has its own `is_admin(uid) or ...` bypass. Postgres
-- combines multiple permissive policies with OR, so this FOR ALL policy
-- doesn't just grant admin/curator the ability to attach/detach (its actual
-- purpose) -- it also incidentally grants them unrestricted SELECT on the
-- junction table, for any project, regardless of real membership. That
-- defeated /sources/[id]'s own access check, which relied on
-- project_knowledge_bases' default RLS-filtered SELECT as its strict-
-- membership gate: a platform admin with no real membership row could
-- still see the junction row (via the FOR ALL bypass) and reach a
-- project_private source's metadata page.
--
-- Fixed by splitting each FOR ALL policy into INSERT/DELETE only -- the
-- only two operations either write path ever performs (attach = insert,
-- detach = delete; neither table is ever updated in place) -- so SELECT is
-- governed solely by *_select_member (is_project_member_strict, no
-- bypass), exactly as intended.

drop policy "project_wiki_articles_manage_curator" on project_wiki_articles;
create policy "project_wiki_articles_insert_curator" on project_wiki_articles
  for insert with check (can_curate_project(project_id, auth.uid()));
create policy "project_wiki_articles_delete_curator" on project_wiki_articles
  for delete using (can_curate_project(project_id, auth.uid()));

drop policy "project_knowledge_bases_manage_curator" on project_knowledge_bases;
create policy "project_knowledge_bases_insert_curator" on project_knowledge_bases
  for insert with check (can_curate_project(project_id, auth.uid()));
create policy "project_knowledge_bases_delete_curator" on project_knowledge_bases
  for delete using (can_curate_project(project_id, auth.uid()));
