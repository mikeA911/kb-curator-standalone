-- Public/anonymous visitor experience. A visitor here is simply `auth.uid()
-- is null` -- no session, no profile row, using Supabase's plain anon API
-- key. This is a different concept from profiles.role = 'anonymous' (a real
-- Supabase Auth anonymous session, wired up in an earlier migration but
-- never actually reachable from any UI) -- that machinery is left untouched
-- and dormant; nothing here creates or depends on an 'anonymous' profile.
--
-- Governing principle: publish a curated VIEW of a project, never the
-- internal project itself. Every new RLS policy below is purely additive
-- (multiple permissive policies on one table OR together in Postgres) --
-- nothing here narrows or replaces an existing policy. Column-level safety
-- (never leaking owner_id/notes/details/published_by on projects, or
-- source_chunk_ids/created_by/approved_by on wiki_versions) is NOT
-- enforced by RLS, which is row-level only -- it's enforced by the
-- dedicated narrow-select query functions in src/lib/projects/public.ts and
-- src/lib/wiki/public.ts, which must never select('*').

-- projects: publication fields --------------------------------------------------
alter table projects add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'internal', 'public'));
alter table projects add column if not exists public_slug text unique;
alter table projects add column if not exists public_profile jsonb;
alter table projects add column if not exists published_at timestamptz;
alter table projects add column if not exists published_by uuid references profiles(id) on delete set null;

-- projects_update_managers (20260810120001, can_manage_project-gated) already
-- covers UPDATEs to these new columns since they're on the same row -- no new
-- UPDATE policy needed for publish/unpublish/save-draft.
create policy "projects_select_public" on projects
  for select using (visibility = 'public' and published_at is not null);

-- wiki_articles: separate publication flag ---------------------------------------
-- Deliberately distinct from status='approved' -- approved means "trusted
-- canonical knowledge", public means "safe for anonymous disclosure". An
-- article can be approved and still never marked public.
alter table wiki_articles add column if not exists is_public boolean not null default false;

create policy "wiki_articles_select_public" on wiki_articles
  for select using (status = 'approved' and is_public = true);

-- Reusable helper so "is this article's current version safe to show
-- anonymously" has one source of truth instead of being duplicated across
-- policies that would otherwise need to re-derive it independently.
create or replace function is_public_wiki_article(article_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from wiki_articles a where a.id = article_id and a.status = 'approved' and a.is_public = true
  );
$$;

-- Scoped to exactly the article's CURRENT version -- never a draft, a
-- pending review revision, or an old superseded-but-once-approved version
-- (tighter than wiki_versions_select_approved_or_staff, which the original
-- Wiki RLS migration's own comment already flags as allowing any
-- historically-approved version; that policy is untouched, staff behavior
-- doesn't change).
create policy "wiki_versions_select_public" on wiki_versions
  for select using (
    id = (select current_version_id from wiki_articles where id = wiki_versions.wiki_article_id)
    and is_public_wiki_article(wiki_article_id)
  );

-- wiki_categories: category names are non-sensitive and already visible to
-- every authenticated user regardless of role -- widen the same read to
-- anon too. No behavior change for anyone already authenticated.
drop policy "wiki_categories_select_authenticated" on wiki_categories;
create policy "wiki_categories_select_public" on wiki_categories
  for select using (true);

-- Deliberately no new RLS on wiki_sources, wiki_relations, project_members,
-- eval_datasets/eval_cases/eval_runs/eval_results, ai_operation_logs,
-- documents, or document_chunks -- none of them already leak to anon (every
-- existing policy on those tables depends on auth.uid(), which is null for
-- a sessionless request), and this milestone's public pages don't need
-- direct read access to any of them: the public project page skips a Wiki
-- cross-link/Sources section, and the public eval summary is hand-authored
-- JSON on projects.public_profile, never a live query against eval_results.
