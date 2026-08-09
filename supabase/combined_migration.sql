-- GENERATED CONVENIENCE FILE -- not itself a migration, not maintained by hand.
-- This is supabase/migrations/*.sql concatenated in order (Milestone 1 + Milestone 2 + seeds),
-- for pasting into the Supabase SQL Editor in one shot on a fresh project.
-- The individual files in supabase/migrations/ are the source of truth.

-- Extensions required by the KB Sandbox schema.
create extension if not exists vector;
create extension if not exists pgcrypto;
-- profiles: one row per auth.users, holds role/assignment info used throughout the app.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'curator', 'admin')),
  is_active boolean not null default true,
  assigned_kbs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- knowledge_bases: the top-level domains documents are curated into (fhir, vbc, grants, billing, ...).
create table if not exists knowledge_bases (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- curation_queue: URLs/titles queued up for a curator to pull into the upload flow.
create table if not exists curation_queue (
  id uuid primary key default gen_random_uuid(),
  kb_id text not null references knowledge_bases(id) on delete cascade,
  title text not null,
  url text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kb_id, url)
);
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
-- settings: small typed key/value store for runtime toggles (e.g. active AI provider).
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

insert into settings (key, value)
values ('ai_provider', '"openai"'::jsonb)
on conflict (key) do nothing;
-- ai_operation_logs: lightweight record of every server-side AI provider call.
-- Not a full observability/tracing system (that's a later milestone) -- just enough
-- to answer "what AI calls happened, against what, and did they succeed" today.
create table if not exists ai_operation_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation text not null check (operation in ('generate_text', 'generate_structured', 'embed')),
  provider text not null,
  model text not null,
  document_id uuid references documents(id) on delete set null,
  chunk_id uuid references document_chunks(id) on delete set null,
  requested_by uuid references profiles(id) on delete set null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  success boolean not null,
  error_message text
);

create index if not exists ai_operation_logs_created_at_idx on ai_operation_logs(created_at desc);
create index if not exists ai_operation_logs_document_id_idx on ai_operation_logs(document_id);
-- Helper functions used by RLS policies and by the review workflow.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists knowledge_bases_set_updated_at on knowledge_bases;
create trigger knowledge_bases_set_updated_at before update on knowledge_bases
  for each row execute function set_updated_at();

drop trigger if exists documents_set_updated_at on documents;
create trigger documents_set_updated_at before update on documents
  for each row execute function set_updated_at();

-- SECURITY DEFINER: runs as the function owner (not RLS-restricted), so it can be
-- called from inside RLS policies on `profiles` itself without recursive RLS evaluation.
create or replace function is_admin(uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = uid and role = 'admin' and is_active = true
  );
$$;

create or replace function is_curator_or_admin(uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = uid and role in ('curator', 'admin') and is_active = true
  );
$$;

create or replace function increment_approved_chunks(doc_id uuid)
returns void
language sql security definer set search_path = public as $$
  update documents set approved_chunks = approved_chunks + 1 where id = doc_id;
$$;

create or replace function increment_rejected_chunks(doc_id uuid)
returns void
language sql security definer set search_path = public as $$
  update documents set rejected_chunks = rejected_chunks + 1 where id = doc_id;
$$;

-- Vector similarity search over kb_vectors. Not called from the app yet (no
-- retrieval UI in Milestone 1) but kept so the write side (embedding) and the
-- read side are defined together and don't drift apart the way the old schema did.
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.75,
  match_count int default 10,
  filter_doc_type text default null,
  filter_use_cases text[] default null
)
returns table (
  id uuid,
  content text,
  similarity float,
  metadata jsonb
)
language sql stable as $$
  select
    kb_vectors.id,
    kb_vectors.content,
    1 - (kb_vectors.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'topic', kb_vectors.topic,
      'subtopic', kb_vectors.subtopic,
      'doc_type', kb_vectors.doc_type,
      'source_document', kb_vectors.source_document,
      'source_page', kb_vectors.source_page,
      'tags', kb_vectors.tags
    ) as metadata
  from kb_vectors
  where 1 - (kb_vectors.embedding <=> query_embedding) > match_threshold
    and (filter_doc_type is null or kb_vectors.doc_type = filter_doc_type)
    and (filter_use_cases is null or kb_vectors.use_cases && filter_use_cases)
  order by kb_vectors.embedding <=> query_embedding
  limit match_count;
$$;
-- Row Level Security. Every table the client can reach directly (anon/authenticated
-- key) gets an explicit policy; anything privileged (role changes, KB admin, AI
-- operation logs) is written only by Server Actions using the service-role key,
-- which bypasses RLS by design -- mirroring the old admin-api edge function's model.

-- profiles ------------------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles_select_own_or_staff" on profiles
  for select using (auth.uid() = id or is_curator_or_admin(auth.uid()));

create policy "profiles_insert_self" on profiles
  for insert with check (auth.uid() = id and role = 'user' and is_active = true);

-- No update/delete policy: role, is_active, and assigned_kbs changes go through
-- a service-role Server Action only.

-- knowledge_bases -------------------------------------------------------------
alter table knowledge_bases enable row level security;

create policy "kb_select_authenticated" on knowledge_bases
  for select using (auth.role() = 'authenticated');

create policy "kb_admin_manage" on knowledge_bases
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- curation_queue ----------------------------------------------------------------
alter table curation_queue enable row level security;

create policy "queue_select_authenticated" on curation_queue
  for select using (auth.role() = 'authenticated');

create policy "queue_staff_manage" on curation_queue
  for all using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- documents -----------------------------------------------------------------
alter table documents enable row level security;

create policy "documents_select_staff_or_owner" on documents
  for select using (is_curator_or_admin(auth.uid()) or uploaded_by = auth.uid());

create policy "documents_insert_staff" on documents
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "documents_update_staff" on documents
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

create policy "documents_delete_owner_or_admin" on documents
  for delete using (uploaded_by = auth.uid() or is_admin(auth.uid()));

-- document_chunks -------------------------------------------------------------
alter table document_chunks enable row level security;

create policy "chunks_select_staff" on document_chunks
  for select using (is_curator_or_admin(auth.uid()));

create policy "chunks_insert_staff" on document_chunks
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "chunks_update_staff" on document_chunks
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- kb_vectors ------------------------------------------------------------------
alter table kb_vectors enable row level security;

create policy "vectors_staff_all" on kb_vectors
  for all using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- settings ----------------------------------------------------------------------
alter table settings enable row level security;

create policy "settings_select_staff" on settings
  for select using (is_curator_or_admin(auth.uid()));

create policy "settings_admin_manage" on settings
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ai_operation_logs -------------------------------------------------------------
-- Written only by the service-role client from server-side AI call sites.
alter table ai_operation_logs enable row level security;

create policy "ai_logs_admin_select" on ai_operation_logs
  for select using (is_admin(auth.uid()));
-- Private storage bucket for uploaded source documents. `public = false` means
-- objects are never reachable by a bare public URL -- access always goes through
-- the Storage API (subject to these policies) or a short-lived signed URL that a
-- Server Action mints on demand.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

create policy "documents_bucket_staff_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from profiles
      where id = auth.uid() and role in ('curator', 'admin') and is_active = true
    )
  );

create policy "documents_bucket_staff_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from profiles
      where id = auth.uid() and role in ('curator', 'admin') and is_active = true
    )
  );

create policy "documents_bucket_staff_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from profiles
      where id = auth.uid() and role in ('curator', 'admin') and is_active = true
    )
  );

create policy "documents_bucket_owner_or_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (
      auth.uid() = owner
      or exists (
        select 1 from profiles
        where id = auth.uid() and role = 'admin' and is_active = true
      )
    )
  );
-- Wiki taxonomy: a lookup table rather than a CHECK-constraint enum, so the
-- UI can list categories with display names/ordering instead of hardcoding
-- the six slugs in application code.
create table if not exists wiki_categories (
  id text primary key,
  name text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

insert into wiki_categories (id, name, sort_order) values
  ('foundations', 'Foundations', 1),
  ('knowledge_engineering', 'Knowledge Engineering', 2),
  ('agent_engineering', 'Agent Engineering', 3),
  ('reliability', 'Reliability', 4),
  ('governance', 'Governance', 5),
  ('improvement', 'Improvement', 6)
on conflict (id) do nothing;
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
-- wiki_versions: immutable, versioned article content. Rows are inserted
-- once and never updated except by the admin approve action setting
-- approved_by/approved_at (see RLS in 20260808220006_wiki_rls.sql -- there is
-- no general UPDATE policy for staff, only INSERT). Editing "approved"
-- content always creates a new draft version row; it never mutates the
-- approved one.
--
-- Long-form sections (What it is / Why it matters / How it works /
-- Architecture / When to use / When not to use / Failure modes / Evaluation
-- / Governance considerations / Practical experiment) live in one markdown
-- `content` field rather than one column each -- simplest maintainable
-- representation per the brief. `quick_help`, `implementation_notes`, and
-- `limitations` get their own columns because they're each used differently
-- (quick_help specifically for contextual Help lookups).
create table if not exists wiki_versions (
  id uuid primary key default gen_random_uuid(),
  wiki_article_id uuid not null references wiki_articles(id) on delete cascade,
  version_number integer not null,

  quick_help text not null,
  content text not null,
  implementation_notes text,
  limitations text,

  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'needs_review')),
  last_verified_at timestamptz,

  -- AI-assisted synthesis provenance (null for manually authored versions).
  generated_by text not null default 'human' check (generated_by in ('human', 'ai_assisted')),
  ai_provider text,
  ai_model text,
  ai_generated_at timestamptz,
  source_chunk_ids uuid[],

  created_by uuid references profiles(id) on delete set null,
  approved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,

  unique (wiki_article_id, version_number)
);

create index if not exists wiki_versions_article_id_idx on wiki_versions(wiki_article_id);

alter table wiki_articles
  add constraint wiki_articles_current_version_fk
  foreign key (current_version_id) references wiki_versions(id) on delete set null;
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
-- Wiki RLS. Approved content is readable by any authenticated user (Wiki
-- serves contextual Help app-wide, not just curators); draft/review content
-- and any mutation is curator/admin only. Approval itself is never granted
-- via these policies -- it happens exclusively through the admin Server
-- Action using the service-role client (see src/app/actions/wiki.ts),
-- mirroring documents' approve-document flow. wiki_versions therefore has no
-- general UPDATE policy at all: rows are inserted once and never mutated by
-- a regular staff session.

-- wiki_categories -------------------------------------------------------------
alter table wiki_categories enable row level security;

create policy "wiki_categories_select_authenticated" on wiki_categories
  for select using (auth.role() = 'authenticated');

create policy "wiki_categories_admin_manage" on wiki_categories
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- wiki_articles -----------------------------------------------------------------
alter table wiki_articles enable row level security;

create policy "wiki_articles_select_approved_or_staff" on wiki_articles
  for select using (status = 'approved' or is_curator_or_admin(auth.uid()));

create policy "wiki_articles_insert_staff" on wiki_articles
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "wiki_articles_update_staff" on wiki_articles
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- wiki_versions -----------------------------------------------------------------
alter table wiki_versions enable row level security;

create policy "wiki_versions_select_approved_or_staff" on wiki_versions
  for select using (approved_at is not null or is_curator_or_admin(auth.uid()));

create policy "wiki_versions_insert_staff" on wiki_versions
  for insert with check (is_curator_or_admin(auth.uid()));

-- No UPDATE policy: approval sets approved_by/approved_at via the
-- service-role admin action only. No DELETE policy: version history is
-- permanent.

-- wiki_sources ------------------------------------------------------------------
alter table wiki_sources enable row level security;

create policy "wiki_sources_select_approved_or_staff" on wiki_sources
  for select using (
    is_curator_or_admin(auth.uid())
    or exists (
      select 1 from wiki_versions v
      where v.id = wiki_sources.wiki_version_id and v.approved_at is not null
    )
  );

create policy "wiki_sources_insert_staff" on wiki_sources
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "wiki_sources_delete_staff" on wiki_sources
  for delete using (is_curator_or_admin(auth.uid()));

-- wiki_relations ----------------------------------------------------------------
alter table wiki_relations enable row level security;

create policy "wiki_relations_select_authenticated" on wiki_relations
  for select using (auth.role() = 'authenticated');

create policy "wiki_relations_manage_staff" on wiki_relations
  for all using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- wiki_vectors ------------------------------------------------------------------
alter table wiki_vectors enable row level security;

create policy "wiki_vectors_staff_all" on wiki_vectors
  for all using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));
-- The original schema design never seeded any knowledge_bases -- without at
-- least one, the upload form has nothing to select and no document can be
-- created. Seeding the same four KBs the old app shipped with.
insert into knowledge_bases (id, name, description) values
  ('fhir', 'FHIR', 'FHIR / healthcare interoperability standards'),
  ('vbc', 'Value-Based Care', 'Value-based care models and programs'),
  ('grants', 'Grants', 'Grant funding and program documentation'),
  ('billing', 'Billing', 'Healthcare billing and claims')
on conflict (id) do nothing;
