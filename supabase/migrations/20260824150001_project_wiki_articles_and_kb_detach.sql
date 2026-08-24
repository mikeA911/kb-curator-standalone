-- Project-Aware Knowledge and Assistant Context
-- (docs/dev-request-project-aware-knowledge-and-assistant-context.md),
-- Stage 1: project associations and visibility only -- no conversation
-- binding or Assistant retrieval changes yet, those are Stage 2.
--
-- knowledge_bases.project_id already exists and already covers "a project
-- may attach a knowledge base" (one-to-one); the gap closed here is that
-- there was never a UI to attach/detach one after project creation, and
-- wiki_articles had no project-scoping concept at all.

-- Pre-existing RLS bug this feature ran straight into: kb_manage_project_curator
-- (20260810120001_project_members.sql) required project_id is not null in
-- its USING clause, which means a project curator could never target an
-- *unattached* KB in the first place -- attachKnowledgeBaseAction (and the
-- Project Wizard's own "attach an existing KB" step) has been silently
-- rejected by RLS for any non-admin caller since it was written. Fixed to
-- be symmetric: a curator may target a row that's either currently
-- unattached (to attach it) or already theirs (to edit/detach it), and the
-- result must be either detached or attached to a project they curate.
drop policy "kb_manage_project_curator" on knowledge_bases;
create policy "kb_manage_project_curator" on knowledge_bases
  for all using (project_id is null or can_curate_project(project_id, auth.uid()))
  with check (project_id is null or can_curate_project(project_id, auth.uid()));

-- A single column, not a separate wiki_article_scopes table -- matches this
-- app's existing convention for single-value-per-row config (see
-- knowledge_bases.classification/lifecycle_status). Existing articles
-- default to 'platform', matching current de facto behaviour: every
-- approved article is visible to everyone today.
alter table wiki_articles
  add column if not exists visibility_scope text not null default 'platform'
    check (visibility_scope in ('project_private', 'selected_projects', 'organization', 'platform', 'public'));

-- Serves two purposes: it's the allow-list for project_private/
-- selected_projects articles, and it's how a platform-visibility article
-- gets explicitly associated with a project's own Knowledge display without
-- copying it.
create table if not exists project_wiki_articles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  wiki_article_id uuid not null references wiki_articles(id) on delete cascade,
  relationship text,
  attached_by uuid references profiles(id) on delete set null,
  attached_at timestamptz not null default now(),

  unique (project_id, wiki_article_id)
);

create index if not exists project_wiki_articles_project_id_idx on project_wiki_articles(project_id);
create index if not exists project_wiki_articles_wiki_article_id_idx on project_wiki_articles(wiki_article_id);

alter table project_wiki_articles enable row level security;

create policy "project_wiki_articles_select_member" on project_wiki_articles
  for select using (is_project_member(project_id, auth.uid()));

-- Same bar as workstream_artifacts_insert_consultant: project curators (not
-- just owners) can attach evidence to their own project.
create policy "project_wiki_articles_manage_curator" on project_wiki_articles
  for all using (can_curate_project(project_id, auth.uid()))
  with check (can_curate_project(project_id, auth.uid()));

-- Widen wiki_articles' select policy: an approved, platform/public-visibility
-- article stays visible to everyone (unchanged default behaviour); staff
-- keep full visibility regardless of status/scope (unchanged); a
-- project_private/selected_projects article is now visible only to a
-- member of a project it's explicitly attached to.
drop policy "wiki_articles_select_approved_or_staff" on wiki_articles;
create policy "wiki_articles_select_approved_or_staff" on wiki_articles
  for select using (
    is_curator_or_admin(auth.uid())
    or (status = 'approved' and visibility_scope in ('platform', 'public'))
    or (
      status = 'approved'
      and visibility_scope in ('project_private', 'selected_projects')
      and exists (
        select 1 from project_wiki_articles pwa
        where pwa.wiki_article_id = wiki_articles.id and is_project_member(pwa.project_id, auth.uid())
      )
    )
  );

-- wiki_versions has its own independent select policy (content, not just
-- metadata) -- widening wiki_articles alone would still leave a
-- project-private article's actual approved content directly fetchable by
-- id (e.g. `.from('wiki_versions').select('*').eq('id', ...)`), since the
-- existing policy only checked approved_at, never the parent article's
-- visibility. Joins back through wiki_articles for the same scope check.
drop policy "wiki_versions_select_approved_or_staff" on wiki_versions;
create policy "wiki_versions_select_approved_or_staff" on wiki_versions
  for select using (
    is_curator_or_admin(auth.uid())
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
              where pwa.wiki_article_id = wa.id and is_project_member(pwa.project_id, auth.uid())
            )
          )
        )
      )
    )
  );
