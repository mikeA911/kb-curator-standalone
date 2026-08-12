-- ==== supabase/migrations/20260812100001_public_wiki_kb_scoping_fix.sql ====
-- Public AI Engineering Wiki design note (see docs/CURRENT-ARCHITECTURE.md's
-- Public Wiki section): the original public-visibility migration
-- (20260810130001) never checked whether an article's knowledge_base_id
-- belongs to a project-scoped KB before allowing it to be marked public.
-- The design brief is explicit that public eligibility requires "article
-- belongs to platform/global knowledge" as its own condition -- approval +
-- is_public alone isn't enough if the article happens to sit on a
-- project/client-scoped knowledge base. No article is project-scoped today
-- (verified live), but the rule wasn't enforced, so this closes the gap
-- before it can ever matter rather than after.
--
-- wiki_articles_select_public previously duplicated its own inline
-- 'status=approved and is_public=true' condition instead of calling
-- is_public_wiki_article() -- rewritten here to call the helper instead, so
-- there's exactly one source of truth for "is this article safe to show
-- anonymously" (wiki_versions_select_public already depended on the helper
-- and picks up this fix automatically, no change needed there).
create or replace function is_public_wiki_article(article_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from wiki_articles a
    where a.id = article_id
    and a.status = 'approved'
    and a.is_public = true
    and (
      a.knowledge_base_id is null
      or exists (select 1 from knowledge_bases kb where kb.id = a.knowledge_base_id and kb.project_id is null)
    )
  );
$$;

drop policy "wiki_articles_select_public" on wiki_articles;
create policy "wiki_articles_select_public" on wiki_articles
  for select using (is_public_wiki_article(id));
