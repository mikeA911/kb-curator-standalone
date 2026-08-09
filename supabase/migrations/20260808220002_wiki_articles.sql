-- wiki_articles: stable identity of an article. `knowledge_base_id` is
-- nullable -- unlike documents/chunks, most Wiki articles (the AI-engineering
-- reference taxonomy) aren't scoped to one curation knowledge base. See
-- docs/CURRENT-ARCHITECTURE.md for why this deviates from the Milestone 2 brief.
create table if not exists wiki_articles (
  id uuid primary key default gen_random_uuid(),
  knowledge_base_id text references knowledge_bases(id) on delete set null,
  slug text not null unique,
  title text not null,
  category text not null references wiki_categories(id) on delete restrict,
  short_description text,
  -- FK to wiki_versions added in 20260808220003_wiki_versions.sql once that
  -- table exists (the two tables reference each other).
  current_version_id uuid,
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'archived')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wiki_articles_category_idx on wiki_articles(category);
create index if not exists wiki_articles_status_idx on wiki_articles(status);
create index if not exists wiki_articles_knowledge_base_id_idx on wiki_articles(knowledge_base_id);

drop trigger if exists wiki_articles_set_updated_at on wiki_articles;
create trigger wiki_articles_set_updated_at before update on wiki_articles
  for each row execute function set_updated_at();
