-- Second-order instance of the same issue fixed in
-- 20260824160001_project_knowledge_visibility_fixes.sql (fix 1): the
-- confidentiality-gating policies on wiki_articles/wiki_versions/
-- project_wiki_articles/project_knowledge_bases all check membership via
-- is_project_member(), which itself is `is_admin(uid) or <real membership>`
-- (20260810120001_project_members.sql) -- a deliberate convenience for
-- general project navigation (an admin can open any project page), but it
-- silently defeats the fix in 160001 for admins specifically: every platform
-- admin still passes as "a member" of every project, so an approved
-- project_private article stayed readable by any admin regardless of real
-- membership. Caught during this feature's own live-verification pass,
-- before testing "platform Admin without project business authority" per
-- the dev request's required test roles.
--
-- Introduces a strict membership check (real project_members row only, no
-- admin bypass) and uses it specifically where confidential content is
-- gated. can_curate_project/can_manage_project (used by the *manage*
-- policies -- attaching/detaching a KB or article) intentionally keep their
-- admin bypass: administering an association is a different, lower-stakes
-- capability than silently reading confidential content, and platform
-- admins legitimately need to manage any project's associations.

create or replace function is_project_member_strict(pid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from project_members pm where pm.project_id = pid and pm.user_id = uid and pm.status = 'active'
  );
$$;

drop policy "project_wiki_articles_select_member" on project_wiki_articles;
create policy "project_wiki_articles_select_member" on project_wiki_articles
  for select using (is_project_member_strict(project_id, auth.uid()));

drop policy "project_knowledge_bases_select_member" on project_knowledge_bases;
create policy "project_knowledge_bases_select_member" on project_knowledge_bases
  for select using (is_project_member_strict(project_id, auth.uid()));

drop policy "wiki_articles_select_approved_or_staff" on wiki_articles;
create policy "wiki_articles_select_approved_or_staff" on wiki_articles
  for select using (
    (status <> 'approved' and is_curator_or_admin(auth.uid()))
    or (status = 'approved' and visibility_scope in ('platform', 'public'))
    or (
      status = 'approved'
      and visibility_scope in ('project_private', 'selected_projects')
      and exists (
        select 1 from project_wiki_articles pwa
        where pwa.wiki_article_id = wiki_articles.id and is_project_member_strict(pwa.project_id, auth.uid())
      )
    )
  );

drop policy "wiki_versions_select_approved_or_staff" on wiki_versions;
create policy "wiki_versions_select_approved_or_staff" on wiki_versions
  for select using (
    (approved_at is null and is_curator_or_admin(auth.uid()))
    or (
      approved_at is not null
      and exists (
        select 1 from wiki_articles wa
        where wa.id = wiki_versions.wiki_article_id
        and (
          wa.visibility_scope in ('platform', 'public')
          or (
            wa.visibility_scope in ('project_private', 'selected_projects')
            and exists (
              select 1 from project_wiki_articles pwa
              where pwa.wiki_article_id = wa.id and is_project_member_strict(pwa.project_id, auth.uid())
            )
          )
        )
      )
    )
  );
