-- kb_vectors: approved chunks, embedded and denormalized for downstream RAG retrieval.
create table if not exists kb_vectors (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references document_chunks(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,

  -- Initial embedding profile: vector(1536), matching OpenAI text-embedding-3-small.
  -- This is a starting configuration, not a permanent architectural constraint --
  -- embedding_model/embedding_dim record provenance per row so switching the default
  -- embedding model/dimension later is an additive migration (new column + re-embed job),
  -- not a silent mismatch against rows already in this column.
  embedding vector(1536),
  embedding_model text not null,
  embedding_dim integer not null,

  doc_type text not null references knowledge_bases(id) on delete restrict,
  topic text,
  subtopic text,
  use_cases text[],
  key_concepts text[],
  relevance_score numeric,
  curator_notes text,
  source_document text,
  source_page integer,
  source_url text,
  domain text,
  curator_name text,
  tags text[],
  chunk_index integer,
  word_count integer,

  approved_date timestamptz not null default now(),
  approved_by uuid references profiles(id) on delete set null,
  last_updated timestamptz not null default now(),

  unique (chunk_id)
);

create index if not exists kb_vectors_document_id_idx on kb_vectors(document_id);
create index if not exists kb_vectors_doc_type_idx on kb_vectors(doc_type);
create index if not exists kb_vectors_embedding_idx
  on kb_vectors using ivfflat (embedding vector_cosine_ops) with (lists = 100);
