-- document_chunks: retrieval units produced by parsing + chunking a document.
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null,
  chunk_size integer,

  -- Provenance: where this chunk actually came from in the source document,
  -- and which parser produced it. Preserved so a Wiki article (later milestone)
  -- can link back to the exact page/section/parser that grounded it.
  source_page integer,
  source_section text,
  parser text not null check (parser in ('pdf', 'docx', 'text')),
  char_start integer,
  char_end integer,

  ai_metadata jsonb,
  confidence_score numeric,

  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected', 'filtered', 'enriching', 'draft', 'failed')),

  -- Explicit failure modeling for the enrichment step (mirrors documents.processing_error).
  enrichment_error jsonb,

  curator_notes text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,

  is_filtered boolean not null default false,
  filtered_reason text,

  metadata_edited boolean not null default false,
  metadata_edited_by uuid references profiles(id) on delete set null,
  metadata_edited_at timestamptz,

  created_at timestamptz not null default now(),

  unique (document_id, chunk_index)
);

create index if not exists document_chunks_document_id_idx on document_chunks(document_id);
create index if not exists document_chunks_review_status_idx on document_chunks(review_status);

comment on column document_chunks.enrichment_error is
  'Structured failure detail: {code, message, occurred_at}. Set when an AI enrichment call fails, instead of silently degrading to a placeholder metadata object.';
