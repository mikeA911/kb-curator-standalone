-- M5E Part A -- Trending Knowledge. Provisional external material a user
-- believes is worth examining -- deliberately NOT another Wiki category
-- ("what are we watching?" vs Wiki's "what do we currently know?"). A
-- Trending item never becomes canonical knowledge on its own; it can only
-- become one by going through the *existing* Wiki draft/review/approval
-- lifecycle via promoteTrendingToWikiAction, same as every other Wiki edit.

create table trending_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text not null,
  source_name text,
  -- "Why does this matter?" -- required at submission, not optional AI analysis.
  description text not null,
  tags text[] not null default '{}',
  submitted_by uuid references profiles(id) on delete set null,
  -- Nullable: platform-visibility items aren't scoped to any project.
  project_id uuid references projects(id) on delete cascade,
  visibility text not null default 'platform' check (visibility in ('platform', 'project')),
  -- Deliberately not the Wiki's draft/review/approved lifecycle -- Trending
  -- is intentionally a different kind of thing (see module comment above).
  status text not null default 'active' check (status in ('active', 'under_review', 'promoted', 'archived')),
  -- Separate axis from status, same "canonical != public" split as
  -- wiki_articles.is_public (20260810130001_public_visibility.sql) --
  -- unused until a public /trending page exists, costs nothing to have now.
  is_public boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trending_items_set_updated_at before update on trending_items
  for each row execute function set_updated_at();

create index trending_items_status_idx on trending_items(status);
create index trending_items_project_id_idx on trending_items(project_id);

-- Flat comments -- no threading, no reactions. A discussion exists to
-- evaluate the significance of the source, not to be a chat feature.
create table trending_comments (
  id uuid primary key default gen_random_uuid(),
  trending_item_id uuid not null references trending_items(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index trending_comments_trending_item_id_idx on trending_comments(trending_item_id);

-- "This external development may be relevant to this existing knowledge" --
-- explicitly NOT an endorsement. A relationship table rather than an array
-- column so it carries its own audit trail (linked_by/created_at) and can
-- be queried from either direction.
create table trending_wiki_links (
  id uuid primary key default gen_random_uuid(),
  trending_item_id uuid not null references trending_items(id) on delete cascade,
  wiki_article_id uuid not null references wiki_articles(id) on delete cascade,
  linked_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (trending_item_id, wiki_article_id)
);

create index trending_wiki_links_wiki_article_id_idx on trending_wiki_links(wiki_article_id);

-- Provenance: which Trending item (if any) a Wiki version was promoted
-- from. wiki_sources' 'external' source type has no URL column to hold
-- this structurally, so a direct nullable FK is cleaner and queryable.
alter table wiki_versions add column if not exists promoted_from_trending_item_id uuid references trending_items(id) on delete set null;

-- RLS -------------------------------------------------------------------
alter table trending_items enable row level security;
alter table trending_comments enable row level security;
alter table trending_wiki_links enable row level security;

create policy "trending_items_select_visible" on trending_items
  for select using (
    visibility = 'platform'
    or (visibility = 'project' and is_project_member(project_id, auth.uid()))
    or is_public
  );

create policy "trending_items_insert_authenticated" on trending_items
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and (project_id is null or is_project_member(project_id, auth.uid()))
  );

-- Status/is_public changes (review, archive, promote, publish) are a
-- curator/admin action, matching the doc's "Curator: review Trending;
-- archive; initiate Wiki promotion" and "public Trending publication can
-- remain Curator/Admin-controlled" (§17-18).
create policy "trending_items_manage_curator" on trending_items
  for update
  using (
    case when project_id is not null then can_curate_project(project_id, auth.uid())
    else is_curator_or_admin(auth.uid()) end
  )
  with check (
    case when project_id is not null then can_curate_project(project_id, auth.uid())
    else is_curator_or_admin(auth.uid()) end
  );

create policy "trending_comments_select_visible" on trending_comments
  for select using (
    exists (
      select 1 from trending_items t
      where t.id = trending_comments.trending_item_id
      and (t.visibility = 'platform' or (t.visibility = 'project' and is_project_member(t.project_id, auth.uid())) or t.is_public)
    )
  );

create policy "trending_comments_insert_authenticated" on trending_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from trending_items t
      where t.id = trending_comments.trending_item_id
      and (t.visibility = 'platform' or (t.visibility = 'project' and is_project_member(t.project_id, auth.uid())))
    )
  );

create policy "trending_wiki_links_select_visible" on trending_wiki_links
  for select using (
    exists (
      select 1 from trending_items t
      where t.id = trending_wiki_links.trending_item_id
      and (t.visibility = 'platform' or (t.visibility = 'project' and is_project_member(t.project_id, auth.uid())) or t.is_public)
    )
  );

-- Any consultant+ who can see the item can link a Wiki article to it
-- (doc §17: Consultant capability, not curator-only).
create policy "trending_wiki_links_insert_authenticated" on trending_wiki_links
  for insert to authenticated
  with check (
    linked_by = auth.uid()
    and exists (
      select 1 from trending_items t
      where t.id = trending_wiki_links.trending_item_id
      and (t.visibility = 'platform' or (t.visibility = 'project' and is_project_member(t.project_id, auth.uid())))
    )
  );

create policy "trending_wiki_links_delete_own_or_curator" on trending_wiki_links
  for delete using (
    linked_by = auth.uid()
    or exists (
      select 1 from trending_items t
      where t.id = trending_wiki_links.trending_item_id
      and (case when t.project_id is not null then can_curate_project(t.project_id, auth.uid()) else is_curator_or_admin(auth.uid()) end)
    )
  );
