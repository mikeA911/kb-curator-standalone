-- Launch-slice additions: minimal Blog visuals (cover image) and manual
-- related-article linking (see
-- docs/dev-request-blog-contributor-workflow-and-editorial-placeholders.md).

alter table blog_posts
  add column if not exists cover_image_path text,
  add column if not exists cover_image_alt text;

-- Mirrors wiki_relations (20260808220005_wiki_relations_and_vectors.sql)
-- exactly in shape: directional storage, symmetric display (see
-- src/lib/blog/relations.ts). RLS is deliberately stricter-on-read than
-- wiki_relations_select_authenticated -- Wiki's related-articles UI is
-- never shown to anonymous visitors, but Blog's public article page needs
-- to read relations too, so this is public-select rather than
-- authenticated-only. A relation row is just an id pair, not sensitive
-- content, even when one side is still a draft.
create table if not exists blog_relations (
  id uuid primary key default gen_random_uuid(),
  from_post_id uuid not null references blog_posts(id) on delete cascade,
  to_post_id uuid not null references blog_posts(id) on delete cascade,
  relation_type text not null default 'related',
  created_at timestamptz not null default now(),
  unique (from_post_id, to_post_id),
  constraint blog_relations_no_self_link check (from_post_id <> to_post_id)
);
create index if not exists blog_relations_from_idx on blog_relations(from_post_id);
create index if not exists blog_relations_to_idx on blog_relations(to_post_id);

alter table blog_relations enable row level security;

create policy "blog_relations_select_public" on blog_relations
  for select using (true);

create policy "blog_relations_manage_staff" on blog_relations
  for all using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));
