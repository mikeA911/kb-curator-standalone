-- wiki_relations: "related articles" as a simple self-join table -- not a
-- graph store. Directional (from -> to) but the UI treats it as symmetric
-- when rendering "related articles" on either side.
create table if not exists wiki_relations (
  id uuid primary key default gen_random_uuid(),
  from_article_id uuid not null references wiki_articles(id) on delete cascade,
  to_article_id uuid not null references wiki_articles(id) on delete cascade,
  relation_type text not null default 'related',
  created_at timestamptz not null default now(),

  unique (from_article_id, to_article_id),
  constraint wiki_relations_no_self_link check (from_article_id <> to_article_id)
);

create index if not exists wiki_relations_from_idx on wiki_relations(from_article_id);
create index if not exists wiki_relations_to_idx on wiki_relations(to_article_id);

-- wiki_vectors: embeddings for APPROVED wiki versions, kept in a separate
-- table from kb_vectors (source-chunk embeddings) so the two remain
-- distinguishable, per the brief. Written at approval time; no retrieval
-- function/UI yet in this milestone -- this just captures the capability so
-- a future agent/RAG milestone doesn't have to retrofit it.
create table if not exists wiki_vectors (
  id uuid primary key default gen_random_uuid(),
  wiki_version_id uuid not null references wiki_versions(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  embedding_model text not null,
  embedding_dim integer not null,
  created_at timestamptz not null default now(),

  unique (wiki_version_id)
);

create index if not exists wiki_vectors_version_id_idx on wiki_vectors(wiki_version_id);
