-- Follow-up to 20260824150001_project_wiki_articles_and_kb_detach.sql, fixing
-- four issues raised in review before this feature went any further live.
-- Nothing in production depends on the shapes being changed here yet
-- (verified live: zero knowledge_bases.project_id attachments, zero
-- project_wiki_articles rows), so this is a correction, not a data migration.
--
-- 1. wiki_articles/wiki_versions' select policies gave is_curator_or_admin an
--    unconditional bypass, so any platform curator/admin could read an
--    approved project_private article regardless of project membership --
--    directly contradicting this feature's own live-verification plan
--    ("confirm a non-member curator account cannot see it") and the dev
--    request's explicit requirement that "platform Admin access does not
--    automatically constitute customer authorization." The bypass is now
--    scoped to unapproved content only (the actual reason it existed: so
--    curators can review drafts/pending versions before publication).
--    Emergency admin access to approved private content is intentionally
--    NOT built here -- it needs its own audited path, not a silent bypass.
--
-- 2. `organization` was a selectable visibility_scope value with no
--    organization/membership model behind it (this schema has no
--    organizations table at all). After fix 1 it would become a silent,
--    invisible-to-everyone dead state. Removed until an actual organization
--    boundary exists to enforce it against.
--
-- 3. project_private and selected_projects were identical labels over the
--    same project_wiki_articles junction -- nothing stopped a project_private
--    article from being attached to five projects. Enforced with triggers:
--    project_private allows at most one linked project.
--
-- 4. knowledge_bases.project_id is one-to-one, which cannot express the
--    reuse case this feature exists to support (the same Zadara/Sandz KB
--    serving more than one authorized project) -- and the dev request's own
--    suggested data model calls for project_knowledge_bases explicitly.
--    Added as a real many-to-many junction, matching project_wiki_articles.
--    The legacy column is left in place (dropping it is a separate concern)
--    but Stage 1 code no longer reads or writes it.

-- --- Fix 1: staff bypass scoped to unapproved content only ------------------

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
        where pwa.wiki_article_id = wiki_articles.id and is_project_member(pwa.project_id, auth.uid())
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
              where pwa.wiki_article_id = wa.id and is_project_member(pwa.project_id, auth.uid())
            )
          )
        )
      )
    )
  );

-- --- Fix 2: defer 'organization' until an org boundary actually exists -----

alter table wiki_articles drop constraint wiki_articles_visibility_scope_check;
alter table wiki_articles add constraint wiki_articles_visibility_scope_check
  check (visibility_scope in ('project_private', 'selected_projects', 'platform', 'public'));

-- --- Fix 3: project_private means exactly one associated project -----------

create or replace function validate_project_wiki_article_link_scope()
returns trigger language plpgsql set search_path = public as $$
declare
  scope text;
  existing_links int;
begin
  select visibility_scope into scope from wiki_articles where id = new.wiki_article_id;
  if scope = 'project_private' then
    select count(*) into existing_links from project_wiki_articles where wiki_article_id = new.wiki_article_id;
    if existing_links >= 1 then
      raise exception 'A project_private Wiki article may be attached to only one project -- use selected_projects to attach it to more than one';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists project_wiki_articles_validate_scope on project_wiki_articles;
create trigger project_wiki_articles_validate_scope
  before insert on project_wiki_articles
  for each row execute function validate_project_wiki_article_link_scope();

create or replace function validate_wiki_article_scope_change()
returns trigger language plpgsql set search_path = public as $$
declare
  linked_projects int;
begin
  if new.visibility_scope = 'project_private' and old.visibility_scope is distinct from new.visibility_scope then
    select count(*) into linked_projects from project_wiki_articles where wiki_article_id = new.id;
    if linked_projects > 1 then
      raise exception 'Cannot set visibility to project_private while attached to % projects -- detach down to one first', linked_projects;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists wiki_articles_validate_scope_change on wiki_articles;
create trigger wiki_articles_validate_scope_change
  before update of visibility_scope on wiki_articles
  for each row execute function validate_wiki_article_scope_change();

-- --- Fix 4: knowledge base <-> project becomes many-to-many ----------------

create table if not exists project_knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  knowledge_base_id text not null references knowledge_bases(id) on delete cascade,
  purpose text,
  attached_by uuid references profiles(id) on delete set null,
  attached_at timestamptz not null default now(),

  unique (project_id, knowledge_base_id)
);

create index if not exists project_knowledge_bases_project_id_idx on project_knowledge_bases(project_id);
create index if not exists project_knowledge_bases_kb_id_idx on project_knowledge_bases(knowledge_base_id);

alter table project_knowledge_bases enable row level security;

create policy "project_knowledge_bases_select_member" on project_knowledge_bases
  for select using (is_project_member(project_id, auth.uid()));

-- Same bar as project_wiki_articles_manage_curator: project curators (not
-- just owners) can attach or detach knowledge for their own project.
create policy "project_knowledge_bases_manage_curator" on project_knowledge_bases
  for all using (can_curate_project(project_id, auth.uid()))
  with check (can_curate_project(project_id, auth.uid()));

-- Same rule as the legacy knowledge_bases_active_project_attachment trigger
-- (20260824120001_knowledge_base_classification.sql), re-enforced on the new
-- write path: only an active KB may be attached to a project.
create or replace function validate_project_kb_attachment_active()
returns trigger language plpgsql set search_path = public as $$
begin
  perform require_active_knowledge_base(new.knowledge_base_id);
  return new;
end;
$$;

drop trigger if exists project_knowledge_bases_require_active_kb on project_knowledge_bases;
create trigger project_knowledge_bases_require_active_kb
  before insert or update of knowledge_base_id on project_knowledge_bases
  for each row execute function validate_project_kb_attachment_active();

-- No-op safety net: no knowledge_bases.project_id attachment exists in
-- production as of this migration, but this keeps a future environment that
-- does have one from silently losing it.
insert into project_knowledge_bases (project_id, knowledge_base_id, attached_at)
select project_id, id, coalesce(updated_at, now())
from knowledge_bases
where project_id is not null
on conflict (project_id, knowledge_base_id) do nothing;
