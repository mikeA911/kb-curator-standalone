-- documents: one row per uploaded/curated source document.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  original_filename text not null,
  doc_type text not null references knowledge_bases(id) on delete restrict,
  storage_path text not null, -- private Supabase Storage object path; never a public URL
  file_size bigint,
  mime_type text,
  source_url text,
  upload_date timestamptz not null default now(),
  uploaded_by uuid references profiles(id) on delete set null,

  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'parsing', 'chunking', 'review', 'submitted', 'completed', 'failed')),

  -- Explicit failure modeling: which stage of the pipeline is/was running or failed.
  processing_stage text
    check (processing_stage in ('upload', 'parse', 'chunk', 'enrich', 'embed', 'review', 'completed')),

  -- Structured failure detail: {stage, code, message, detail, occurred_at, retryable}.
  -- Populated whenever processing_status = 'failed'; null otherwise.
  processing_error jsonb,

  total_chunks integer,
  approved_chunks integer not null default 0,
  rejected_chunks integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (doc_type, source_url)
);

create index if not exists documents_doc_type_idx on documents(doc_type);
create index if not exists documents_processing_status_idx on documents(processing_status);
create index if not exists documents_uploaded_by_idx on documents(uploaded_by);

comment on column documents.processing_error is
  'Structured failure detail: {stage, code, message, detail, occurred_at, retryable}. Set when processing_status = failed so a failure is diagnosable and retry-safe without re-deriving it from logs.';
