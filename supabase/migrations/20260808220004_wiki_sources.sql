-- wiki_sources: links a Wiki version to its supporting evidence. At least
-- one of document_id/chunk_id is required for document/chunk-derived
-- sources; 'external' sources (e.g. a citation with no document in this KB)
-- carry neither.
create table if not exists wiki_sources (
  id uuid primary key default gen_random_uuid(),
  wiki_version_id uuid not null references wiki_versions(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  chunk_id uuid references document_chunks(id) on delete set null,
  source_type text not null default 'chunk' check (source_type in ('document', 'chunk', 'external')),
  relationship text,
  notes text,
  created_at timestamptz not null default now(),

  constraint wiki_sources_evidence_required check (
    source_type = 'external' or document_id is not null or chunk_id is not null
  )
);

create index if not exists wiki_sources_version_id_idx on wiki_sources(wiki_version_id);
create index if not exists wiki_sources_document_id_idx on wiki_sources(document_id);
create index if not exists wiki_sources_chunk_id_idx on wiki_sources(chunk_id);
