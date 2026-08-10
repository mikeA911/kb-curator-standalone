-- GENERATED CONVENIENCE FILE -- not itself a migration, not maintained by hand.
-- This is supabase/migrations/*.sql concatenated in order, for pasting into the
-- Supabase SQL Editor in one shot on a fresh project.
-- The individual files in supabase/migrations/ are the source of truth.

-- ==== supabase/migrations/20260808190001_extensions.sql ====
-- Extensions required by the KB Sandbox schema.
create extension if not exists vector;
create extension if not exists pgcrypto;


-- ==== supabase/migrations/20260808190002_profiles.sql ====
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


-- ==== supabase/migrations/20260808190003_knowledge_bases_and_queue.sql ====
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


-- ==== supabase/migrations/20260808190004_documents.sql ====
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


-- ==== supabase/migrations/20260808190005_document_chunks.sql ====
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


-- ==== supabase/migrations/20260808190006_kb_vectors.sql ====
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


-- ==== supabase/migrations/20260808190007_settings.sql ====
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


-- ==== supabase/migrations/20260808190008_ai_operation_logs.sql ====
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


-- ==== supabase/migrations/20260808190009_functions.sql ====
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


-- ==== supabase/migrations/20260808190010_rls_policies.sql ====
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


-- ==== supabase/migrations/20260808190011_storage.sql ====
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


-- ==== supabase/migrations/20260808220001_wiki_categories.sql ====
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


-- ==== supabase/migrations/20260808220002_wiki_articles.sql ====
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


-- ==== supabase/migrations/20260808220003_wiki_versions.sql ====
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


-- ==== supabase/migrations/20260808220004_wiki_sources.sql ====
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


-- ==== supabase/migrations/20260808220005_wiki_relations_and_vectors.sql ====
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


-- ==== supabase/migrations/20260808220006_wiki_rls.sql ====
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


-- ==== supabase/migrations/20260809100001_seed_knowledge_bases.sql ====
-- The original schema design never seeded any knowledge_bases -- without at
-- least one, the upload form has nothing to select and no document can be
-- created. Seeding the same four KBs the old app shipped with.
insert into knowledge_bases (id, name, description) values
  ('fhir', 'FHIR', 'FHIR / healthcare interoperability standards'),
  ('vbc', 'Value-Based Care', 'Value-based care models and programs'),
  ('grants', 'Grants', 'Grant funding and program documentation'),
  ('billing', 'Billing', 'Healthcare billing and claims')
on conflict (id) do nothing;


-- ==== supabase/migrations/20260809110001_eval_datasets_and_cases.sql ====
-- eval_datasets: a named, versionable benchmark. `version` is a plain
-- integer snapshot recorded onto eval_runs at run time (see eval_runs.sql);
-- it does not itself branch storage -- "don't silently invalidate historical
-- comparisons" is enforced by freezing eval_cases once status='active'
-- rather than by the version number alone (see the RLS policies).
create table if not exists eval_datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  knowledge_base_id text references knowledge_bases(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists eval_datasets_set_updated_at on eval_datasets;
create trigger eval_datasets_set_updated_at before update on eval_datasets
  for each row execute function set_updated_at();

-- eval_cases: one test. Not every field is required -- a retrieval-only case
-- can omit expected_answer, a structured-output case can omit expected
-- evidence, etc.
create table if not exists eval_cases (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references eval_datasets(id) on delete cascade,
  question text not null,
  expected_answer text,
  expected_concepts text[],
  expected_article_ids uuid[],
  expected_chunk_ids uuid[],
  scoring_criteria text,
  tags text[],
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eval_cases_dataset_id_idx on eval_cases(dataset_id);

drop trigger if exists eval_cases_set_updated_at on eval_cases;
create trigger eval_cases_set_updated_at before update on eval_cases
  for each row execute function set_updated_at();


-- ==== supabase/migrations/20260809110002_eval_runs_and_results.sql ====
-- eval_runs: execution of a dataset against one specific, fully-snapshotted
-- configuration. `config` is captured at launch time so a historical run
-- stays interpretable even after `settings` (the global active AI provider)
-- or the dataset itself later change. Shape:
--   {
--     generation: { provider, model },
--     embedding:  { provider, model, dimensions },
--     retrieval:  { evidence_source: 'chunks'|'wiki'|'both', top_k, threshold },
--     evaluator:  { type: 'none'|'llm_judge', provider?, model? }
--   }
create table if not exists eval_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references eval_datasets(id) on delete cascade,
  dataset_version integer not null,
  name text,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  config jsonb not null,
  is_baseline boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists eval_runs_dataset_id_idx on eval_runs(dataset_id);
create index if not exists eval_runs_status_idx on eval_runs(status);

-- eval_results: one case result within a run. Every metric is nullable --
-- scoring is expected to evolve, and a case that failed outright (provider
-- error, etc.) still gets a row with status='failed' + structured `error`,
-- rather than silently having no result at all.
--
-- human_* columns are deliberately separate from the automated score
-- columns above them: a human review never overwrites the automated
-- evaluation, it's recorded alongside it (see the brief's "preserve both").
create table if not exists eval_results (
  id uuid primary key default gen_random_uuid(),
  eval_run_id uuid not null references eval_runs(id) on delete cascade,
  eval_case_id uuid not null references eval_cases(id) on delete cascade,

  status text not null default 'completed' check (status in ('completed', 'failed')),
  error jsonb, -- {stage, code, message, occurred_at} -- see src/lib/eval/failures.ts

  generated_answer text,
  retrieved_evidence jsonb, -- [{type:'chunk'|'wiki', id, rank, similarity, title}]

  retrieval_hit boolean,
  retrieval_recall numeric,
  retrieval_mrr numeric,

  generation_score numeric,
  grounding_score numeric,
  outcome_score numeric,
  overall_score numeric,

  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric,

  evaluator_details jsonb, -- {provider, model, reasoning, missing_concepts, unsupported_claims}
  failure_classification text check (failure_classification is null or failure_classification in (
    'knowledge_failure', 'retrieval_failure', 'reasoning_failure', 'workflow_failure',
    'tool_failure', 'behavior_failure', 'rule_failure', 'unknown'
  )),

  human_reviewed_by uuid references profiles(id) on delete set null,
  human_reviewed_at timestamptz,
  human_accepted boolean,
  human_generation_score numeric,
  human_grounding_score numeric,
  human_outcome_score numeric,
  human_failure_classification text check (human_failure_classification is null or human_failure_classification in (
    'knowledge_failure', 'retrieval_failure', 'reasoning_failure', 'workflow_failure',
    'tool_failure', 'behavior_failure', 'rule_failure', 'unknown'
  )),
  human_notes text,

  created_at timestamptz not null default now(),

  unique (eval_run_id, eval_case_id)
);

create index if not exists eval_results_run_id_idx on eval_results(eval_run_id);
create index if not exists eval_results_case_id_idx on eval_results(eval_case_id);

-- Link AI operations (embed/generate/judge) back to the eval run/case they
-- happened for, without building the future full Runs/Tracing subsystem.
alter table ai_operation_logs add column if not exists eval_run_id uuid references eval_runs(id) on delete set null;
alter table ai_operation_logs add column if not exists eval_case_id uuid references eval_cases(id) on delete set null;
create index if not exists ai_operation_logs_eval_run_id_idx on ai_operation_logs(eval_run_id);


-- ==== supabase/migrations/20260809110003_match_wiki_vectors.sql ====
-- Vector similarity search over wiki_vectors, mirroring match_documents
-- (kb_vectors). Joined through to wiki_articles and restricted to each
-- article's current_version_id so a pending draft's embedding can never be
-- retrieved during evaluation -- only what's actually approved and live.
create or replace function match_wiki_vectors(
  query_embedding vector(1536),
  match_threshold float default 0,
  match_count int default 10
)
returns table (
  id uuid,
  wiki_version_id uuid,
  wiki_article_id uuid,
  content text,
  similarity float,
  article_slug text,
  article_title text
)
language sql stable as $$
  select
    wv.id,
    wv.wiki_version_id,
    wa.id as wiki_article_id,
    wv.content,
    1 - (wv.embedding <=> query_embedding) as similarity,
    wa.slug as article_slug,
    wa.title as article_title
  from wiki_vectors wv
  join wiki_articles wa on wa.current_version_id = wv.wiki_version_id
  where 1 - (wv.embedding <=> query_embedding) > match_threshold
  order by wv.embedding <=> query_embedding
  limit match_count;
$$;


-- ==== supabase/migrations/20260809110004_eval_rls.sql ====
-- Evaluation RLS. Curator/admin only throughout -- unlike the Wiki, eval
-- datasets/results aren't end-user-facing content, they're an internal QA
-- tool, so there's no "approved -> visible to everyone" tier here.
--
-- The one RLS rule doing real work beyond simple role-gating: eval_cases
-- cannot be inserted/updated/deleted once the parent dataset's status is no
-- longer 'draft'. That's what makes "an active benchmark can't be silently
-- modified" a guarantee instead of a convention -- see the eval_cases
-- policies below.

-- eval_datasets ------------------------------------------------------------
alter table eval_datasets enable row level security;

create policy "eval_datasets_select_staff" on eval_datasets
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_datasets_insert_staff" on eval_datasets
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "eval_datasets_update_staff" on eval_datasets
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- eval_cases ------------------------------------------------------------------
alter table eval_cases enable row level security;

create policy "eval_cases_select_staff" on eval_cases
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_cases_insert_staff_draft_only" on eval_cases
  for insert with check (
    is_curator_or_admin(auth.uid())
    and exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  );

create policy "eval_cases_update_staff_draft_only" on eval_cases
  for update using (
    is_curator_or_admin(auth.uid())
    and exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  ) with check (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  );

create policy "eval_cases_delete_staff_draft_only" on eval_cases
  for delete using (
    is_curator_or_admin(auth.uid())
    and exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')
  );

-- eval_runs -----------------------------------------------------------------
alter table eval_runs enable row level security;

create policy "eval_runs_select_staff" on eval_runs
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_runs_insert_staff" on eval_runs
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "eval_runs_update_staff" on eval_runs
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- eval_results ------------------------------------------------------------------
alter table eval_results enable row level security;

create policy "eval_results_select_staff" on eval_results
  for select using (is_curator_or_admin(auth.uid()));

create policy "eval_results_insert_staff" on eval_results
  for insert with check (is_curator_or_admin(auth.uid()));

-- Update is allowed (unlike wiki_versions) because eval_results rows are
-- where human review lands (human_* columns) -- that's an intentional
-- in-place update of an existing row, not a rewrite of history the way
-- editing approved Wiki content is.
create policy "eval_results_update_staff" on eval_results
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));


-- ==== supabase/migrations/20260809110005_match_documents_chunk_id.sql ====
-- match_documents originally returned kb_vectors.id only. Evaluation needs to
-- compare retrieved evidence against eval_cases.expected_chunk_ids, which
-- references document_chunks (the unit curators actually reviewed/approved),
-- not the vector row's own id -- so chunk_id is added to the return set.
-- Safe to replace: this function had zero callers before Milestone 3. Adding
-- a return column requires DROP + CREATE, not CREATE OR REPLACE -- Postgres
-- rejects an in-place return-type change (42P13).
drop function if exists match_documents(vector, double precision, integer, text, text[]);

create function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.75,
  match_count int default 10,
  filter_doc_type text default null,
  filter_use_cases text[] default null
)
returns table (
  id uuid,
  chunk_id uuid,
  content text,
  similarity float,
  metadata jsonb
)
language sql stable as $$
  select
    kb_vectors.id,
    kb_vectors.chunk_id,
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


-- ==== supabase/migrations/20260810100001_role_consultant_anonymous.sql ====
-- Renames the 'user' role to 'consultant' (matching the UI/Roles brief's own
-- language -- "user may function as CONSULTANT" becomes literal) and adds a
-- new 'anonymous' role for unauthenticated visitors (real Supabase anonymous
-- auth sessions, wired up separately). Only two places in the schema ever
-- referenced the literal 'user' string -- the check constraint below and the
-- self-insert RLS policy in 20260808190010_rls_policies.sql -- both updated
-- together here.

-- Drop the constraint entirely before the backfill: the old constraint
-- rejects 'consultant', and adding the new constraint before the backfill
-- would immediately reject the still-present 'user' rows (Postgres validates
-- existing rows against a new CHECK constraint at ADD time). So: drop, then
-- backfill data, then add the new constraint once every row already
-- satisfies it.
alter table profiles drop constraint profiles_role_check;

update profiles set role = 'consultant' where role = 'user';

alter table profiles add constraint profiles_role_check
  check (role in ('anonymous', 'consultant', 'curator', 'admin'));
alter table profiles alter column role set default 'consultant';

-- Anonymous auth.users rows have no email; nullable so ensureProfile() can
-- insert an anonymous profile without a placeholder value.
alter table profiles alter column email drop not null;

-- Replace the single self-insert policy with two, split on whether the
-- session is a real Supabase anonymous session (auth.users.is_anonymous) --
-- this is what actually prevents an anonymous session from self-inserting as
-- 'consultant' (privilege escalation blocked at the RLS layer, not just in
-- application code).
drop policy "profiles_insert_self" on profiles;

create policy "profiles_insert_self_consultant" on profiles
  for insert with check (
    auth.uid() = id and role = 'consultant' and is_active = true
    and not exists (select 1 from auth.users u where u.id = auth.uid() and u.is_anonymous)
  );

create policy "profiles_insert_self_anonymous" on profiles
  for insert with check (
    auth.uid() = id and role = 'anonymous' and is_active = true
    and exists (select 1 from auth.users u where u.id = auth.uid() and u.is_anonymous)
  );


-- ==== supabase/migrations/20260810100002_projects.sql ====
-- `projects` -- new top-level container per the Project Model brief. Deliberately
-- separate from `knowledge_bases` (a project is broader than a knowledge base;
-- knowledge_bases/eval_datasets link into a project via a nullable FK, added
-- in the next migration, rather than renaming knowledge_bases into projects).
-- `create table if not exists` since this table may already have been created
-- manually against the live project while this migration file was in progress.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_type text not null check (project_type in ('learning', 'experiment', 'consulting', 'transformation', 'knowledge')),
  objective text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  notes text,
  -- Type-specific fields (hypothesis, success_criteria, business_problem, ...)
  -- live here rather than as a wide table of nullable columns -- no template
  -- engine per the brief's explicit scope limit; the UI renders a few fields
  -- based on project_type and reads/writes them into this bag.
  details jsonb not null default '{}',
  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();


-- ==== supabase/migrations/20260810100003_projects_fks_and_rls.sql ====
-- Nullable project_id links from existing entities -- direct FK rather than
-- a join table, per the brief's "choose the simplest clean architecture"
-- guidance (project_knowledge_bases/project_eval_datasets join tables would
-- only earn their keep once a KB or dataset needs to belong to more than one
-- project, which isn't a requirement yet).
alter table knowledge_bases add column if not exists project_id uuid references projects(id) on delete set null;
alter table eval_datasets add column if not exists project_id uuid references projects(id) on delete set null;

-- projects RLS ----------------------------------------------------------------
-- No project-membership model yet (owner/curator/consultant/viewer *within* a
-- project) -- deferred per the brief's explicit allowance until justified by
-- real multi-project use. For now: any non-anonymous staff/consultant can see
-- every project (mirrors how documents/knowledge_bases aren't per-user siloed
-- elsewhere in this app either); only the owner or curator/admin can update;
-- anonymous sessions get no access at all.
alter table projects enable row level security;

create policy "projects_select_staff_or_consultant" on projects
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "projects_insert_self" on projects
  for insert with check (
    owner_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "projects_update_owner_or_staff" on projects
  for update using (owner_id = auth.uid() or is_curator_or_admin(auth.uid()))
  with check (owner_id = auth.uid() or is_curator_or_admin(auth.uid()));


-- ==== supabase/migrations/20260810100004_eval_consultant_access.sql ====
-- Additive consultant access to Evals, per the UI/Roles brief's permission
-- matrix: consultants may view active benchmarks, run evaluations against
-- them, and view results -- but never author/edit cases, activate/archive
-- datasets, or mark baselines (those stay curator/admin, unchanged in
-- 20260809110004_eval_rls.sql). Every policy here is scoped to datasets with
-- status = 'active' -- a consultant can never see or run against a draft
-- benchmark still being authored. Anonymous sessions get nothing (not
-- referenced by any of these policies).

create policy "eval_datasets_select_active_consultant" on eval_datasets
  for select using (
    status = 'active'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_cases_select_active_consultant" on eval_cases
  for select using (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'active')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_runs_select_active_consultant" on eval_runs
  for select using (
    exists (select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_runs_insert_active_consultant" on eval_runs
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active')
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_results_select_active_consultant" on eval_results
  for select using (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "eval_results_insert_active_consultant" on eval_results
  for insert with check (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );


-- ==== supabase/migrations/20260810100005_eval_runs_update_consultant.sql ====
-- Missed in 20260810100004: executeEvalRun's own status transitions
-- (pending -> running -> completed/failed) run as UPDATE statements using the
-- caller's session -- when the caller is a consultant, those updates were
-- silently blocked by RLS (no matching UPDATE policy on eval_runs), leaving
-- every consultant-run evaluation permanently stuck at status='pending' even
-- though its results were inserted successfully (confirmed live: a
-- consultant test run showed real scores in the UI but status never left
-- 'pending'). Scoped to the consultant's own run (created_by = auth.uid()),
-- matching the ownership check already used by
-- eval_runs_insert_active_consultant.
create policy "eval_runs_update_own_consultant" on eval_runs
  for update using (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  )
  with check (
    created_by = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );


-- ==== supabase/migrations/20260810100006_consultant_vector_read_access.sql ====
-- Second half of the same bug class as 20260810100005: match_documents and
-- match_wiki_vectors are plain `language sql stable` functions (not
-- SECURITY DEFINER), so they run under RLS with the *caller's* permissions.
-- kb_vectors and wiki_vectors were both curator/admin-only, so a consultant
-- running an eval got zero evidence back from either RPC no matter the
-- retrieval config -- confirmed live: a consultant-run "wiki only"
-- evaluation showed 0% Hit@K on a benchmark that scores ~100% for the same
-- config run as curator/admin, because retrieval silently returned nothing.
--
-- Safe to open up broadly: kb_vectors only ever contains chunks that were
-- already curator-approved (see 20260808190006_kb_vectors.sql's write path),
-- and wiki_vectors only ever contains content embedded at Wiki *approval*
-- time (embedApprovedVersion in src/lib/wiki/review.ts) -- both tables are
-- already "approved knowledge only" by construction, matching the UI/Roles
-- brief's "Consultant: query approved RAG sources, inspect retrieved
-- evidence" capability.
create policy "kb_vectors_select_consultant" on kb_vectors
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

create policy "wiki_vectors_select_consultant" on wiki_vectors
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );


-- ==== supabase/migrations/20260810110001_ai_providers_and_models.sql ====
-- Provider/model registry, replacing the old single settings.ai_provider
-- key. Providers and models are now admin-managed rows rather than a
-- hard-coded TS union -- this is what lets a cheap/free provider (Groq) or a
-- future local/enterprise OpenAI-compatible gateway be added without
-- touching application code.
create table ai_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  provider_type text not null check (provider_type in ('openai', 'gemini', 'groq', 'openai_compatible')),
  display_name text not null,
  base_url text,
  -- The env var NAME, never the secret value itself -- see the RLS/action
  -- layer, which only ever reports Configured/Missing by checking
  -- process.env[api_key_env_var] server-side.
  api_key_env_var text not null,
  enabled boolean not null default true,
  supports_model_discovery boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ai_providers_set_updated_at on ai_providers;
create trigger ai_providers_set_updated_at before update on ai_providers
  for each row execute function set_updated_at();

create table ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references ai_providers(id) on delete cascade,
  model_id text not null,
  display_name text not null,
  model_type text not null check (model_type in ('generation', 'embedding', 'speech', 'multimodal')),
  enabled boolean not null default true,
  is_default boolean not null default false,
  context_window integer,
  max_output_tokens integer,
  input_cost_per_million numeric,
  output_cost_per_million numeric,
  embedding_dimensions integer,
  supports_structured_output boolean not null default false,
  supports_tools boolean not null default false,
  supports_reasoning boolean not null default false,
  supports_vision boolean not null default false,
  supports_embeddings boolean not null default false,
  status text not null default 'active' check (status in ('active', 'deprecated', 'disabled', 'unavailable')),
  deprecation_date date,
  replacement_model_id uuid references ai_models(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, model_id)
);

drop trigger if exists ai_models_set_updated_at on ai_models;
create trigger ai_models_set_updated_at before update on ai_models
  for each row execute function set_updated_at();

-- At most one default per model_type across the whole registry (a partial
-- unique index, not a boolean pair) -- "the default generation model" and
-- "the default embedding model" fall out naturally from model_type without
-- a separate is_default_generation/is_default_embedding column pair.
create unique index ai_models_one_default_per_type on ai_models(model_type) where is_default;

-- RLS -------------------------------------------------------------------------
-- Any authenticated, active, non-anonymous session can read enabled
-- providers/models (curators and consultants both need to *choose* a model
-- in the Eval UI); only admin can register or change providers/models --
-- "Model/provider configuration is admin-only" per the brief.
alter table ai_providers enable row level security;

create policy "ai_providers_select_staff_or_consultant" on ai_providers
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "ai_providers_admin_manage" on ai_providers
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

alter table ai_models enable row level security;

create policy "ai_models_select_staff_or_consultant" on ai_models
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "ai_models_admin_manage" on ai_models
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));


-- ==== supabase/migrations/20260810110002_seed_ai_providers.sql ====
-- Seed the registry with what the app already had (openai, gemini) plus the
-- new Groq provider. Embedding stays on Gemini (matches vector(1536) in
-- kb_vectors/wiki_vectors -- "do not change the vector schema merely to add
-- generation providers"). Generation default moves to Groq's smallest/
-- fastest suggested model since OpenAI credits are exhausted and Gemini
-- quota is limited -- exactly the brief's own "Suggested Immediate
-- Configuration".
insert into ai_providers (name, provider_type, display_name, base_url, api_key_env_var, enabled, supports_model_discovery) values
  ('openai', 'openai', 'OpenAI', null, 'OPENAI_API_KEY', true, true),
  ('gemini', 'gemini', 'Gemini', null, 'GOOGLE_API_KEY', true, false),
  ('groq', 'groq', 'Groq', 'https://api.groq.com/openai/v1', 'GROQ_API_KEY', true, true);

-- openai models -- not default (credits exhausted, per the brief's own
-- motivation for this whole feature), but registered and enabled so they
-- work again the moment credits return.
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_tools)
select id, 'gpt-4o-mini', 'GPT-4o mini', 'generation', false, true, true from ai_providers where name = 'openai';
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, embedding_dimensions)
select id, 'text-embedding-3-small', 'text-embedding-3-small', 'embedding', false, 1536 from ai_providers where name = 'openai';

-- gemini models -- embedding default.
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_reasoning)
select id, 'gemini-3.5-flash', 'Gemini 3.5 Flash', 'generation', false, true, true from ai_providers where name = 'gemini';
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, embedding_dimensions)
select id, 'gemini-embedding-001', 'gemini-embedding-001', 'embedding', true, 1536 from ai_providers where name = 'gemini';

-- groq models -- generation default. Development-candidate models named in
-- the brief; none flagged as already-deprecated at the time of writing.
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_tools)
select id, 'openai/gpt-oss-20b', 'GPT-OSS 20B', 'generation', true, true, true from ai_providers where name = 'groq';
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_tools)
select id, 'openai/gpt-oss-120b', 'GPT-OSS 120B', 'generation', false, true, true from ai_providers where name = 'groq';
insert into ai_models (provider_id, model_id, display_name, model_type, is_default, supports_structured_output, supports_tools)
select id, 'qwen/qwen3.6-27b', 'Qwen 3.6 27B', 'generation', false, true, true from ai_providers where name = 'groq';



-- ==== supabase/migrations/20260810120001_project_members.sql ====
-- Project membership & isolation (M3.6). Two authorization levels now exist
-- side by side: platform role (profiles.role -- admin/curator/consultant)
-- controls what someone can administer across KB Sandbox; project role
-- (project_members.role -- owner/curator/consultant/viewer) controls what
-- they can do inside one specific project. Giving someone 'consultant'
-- access to one project must never grant access to another.
create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'curator', 'consultant', 'viewer')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

drop trigger if exists project_members_set_updated_at on project_members;
create trigger project_members_set_updated_at before update on project_members
  for each row execute function set_updated_at();

-- The project's owner_id always has a matching 'owner' membership row --
-- enforced by trigger, not by every call site remembering to insert one.
create or replace function create_owner_membership()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null then
    insert into project_members (project_id, user_id, role, status)
    values (new.id, new.owner_id, 'owner', 'active')
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_create_owner_membership on projects;
create trigger projects_create_owner_membership
  after insert on projects
  for each row execute function create_owner_membership();

-- One-time backfill for any project created before this migration.
insert into project_members (project_id, user_id, role, status)
select id, owner_id, 'owner', 'active' from projects where owner_id is not null
on conflict (project_id, user_id) do nothing;

-- Reusable authorization helpers -----------------------------------------------
-- Every one of these has a platform-admin bypass built in ("Platform Admin ->
-- all projects"), so it never has to be repeated in a policy body. Only
-- 'active' membership rows count -- a deactivated membership grants nothing.
create or replace function is_project_member(pid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin(uid) or exists (
    select 1 from project_members pm where pm.project_id = pid and pm.user_id = uid and pm.status = 'active'
  );
$$;

create or replace function can_manage_project(pid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin(uid) or exists (
    select 1 from project_members pm
    where pm.project_id = pid and pm.user_id = uid and pm.status = 'active' and pm.role = 'owner'
  );
$$;

create or replace function can_curate_project(pid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin(uid) or exists (
    select 1 from project_members pm
    where pm.project_id = pid and pm.user_id = uid and pm.status = 'active' and pm.role in ('owner', 'curator')
  );
$$;

create or replace function can_run_project_evals(pid uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin(uid) or exists (
    select 1 from project_members pm
    where pm.project_id = pid and pm.user_id = uid and pm.status = 'active' and pm.role in ('owner', 'curator', 'consultant')
  );
$$;

-- Consistency guard: an eval_datasets row that has both a project and a
-- knowledge base must not point at a KB belonging to a *different* project.
-- Enforced here, not just in the attach actions, per the explicit gap this
-- milestone was asked to close.
create or replace function validate_eval_dataset_project_kb_consistency()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  kb_project_id uuid;
begin
  if new.knowledge_base_id is not null and new.project_id is not null then
    select project_id into kb_project_id from knowledge_bases where id = new.knowledge_base_id;
    if kb_project_id is not null and kb_project_id != new.project_id then
      raise exception 'eval_datasets.knowledge_base_id (project %) does not belong to eval_datasets.project_id (%)', kb_project_id, new.project_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists eval_datasets_validate_project_kb_consistency on eval_datasets;
create trigger eval_datasets_validate_project_kb_consistency
  before insert or update on eval_datasets
  for each row execute function validate_eval_dataset_project_kb_consistency();

-- project_members RLS -----------------------------------------------------------
alter table project_members enable row level security;

create policy "project_members_select_member" on project_members
  for select using (is_project_member(project_id, auth.uid()));

create policy "project_members_manage_owner" on project_members
  for all using (can_manage_project(project_id, auth.uid()))
  with check (can_manage_project(project_id, auth.uid()));

-- projects RLS: replace the "every non-anonymous user sees every project"
-- policy from 20260810100003 with real membership scoping.
drop policy "projects_select_staff_or_consultant" on projects;
create policy "projects_select_members" on projects
  for select using (is_project_member(id, auth.uid()));

drop policy "projects_update_owner_or_staff" on projects;
create policy "projects_update_managers" on projects
  for update using (can_manage_project(id, auth.uid()))
  with check (can_manage_project(id, auth.uid()));

-- knowledge_bases RLS: close the actual gap -- today ANY authenticated user
-- sees every KB, including ones scoped to a project they're not a member of.
-- Global KBs (project_id is null, e.g. fhir/vbc/grants/billing) stay visible
-- to everyone, unchanged. kb_admin_manage (platform admin, full access) is
-- untouched -- this only replaces the overly-broad select policy and adds
-- manage rights for a project's own curator/owner.
drop policy "kb_select_authenticated" on knowledge_bases;
create policy "kb_select_global_or_member" on knowledge_bases
  for select using (project_id is null or is_project_member(project_id, auth.uid()));

create policy "kb_manage_project_curator" on knowledge_bases
  for all using (project_id is not null and can_curate_project(project_id, auth.uid()))
  with check (project_id is not null and can_curate_project(project_id, auth.uid()));

-- eval_datasets / eval_cases / eval_runs / eval_results ------------------------
-- The existing platform-wide curator/admin policies from Milestone 3
-- (is_curator_or_admin-based) are intentionally left untouched -- a platform
-- curator/admin can still manage any dataset, which is what keeps the
-- platform-level "AI Engineering Wiki Benchmark" (project_id is null)
-- working exactly as before. What changes is the *consultant* policies added
-- in 20260810100004: they let ANY platform consultant see/run ANY active
-- dataset regardless of project, which is precisely what "users who are not
-- members should not see the project" (this milestone's brief) asks to
-- close. Each is dropped and recreated with a project-membership condition
-- added alongside the existing status='active' + platform-role check.
--
-- SELECT policies use is_project_member (any active role, including
-- 'viewer' -- viewers are explicitly read-only, not excluded from viewing).
-- INSERT policies (running an eval) use can_run_project_evals, which
-- excludes 'viewer' -- a viewer must never be able to trigger a run.
drop policy "eval_datasets_select_active_consultant" on eval_datasets;
create policy "eval_datasets_select_active_consultant" on eval_datasets
  for select using (
    status = 'active'
    and (project_id is null or is_project_member(project_id, auth.uid()))
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_cases_select_active_consultant" on eval_cases;
create policy "eval_cases_select_active_consultant" on eval_cases
  for select using (
    exists (
      select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'active'
      and (d.project_id is null or is_project_member(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_runs_select_active_consultant" on eval_runs;
create policy "eval_runs_select_active_consultant" on eval_runs
  for select using (
    exists (
      select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active'
      and (d.project_id is null or is_project_member(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_runs_insert_active_consultant" on eval_runs;
create policy "eval_runs_insert_active_consultant" on eval_runs
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from eval_datasets d where d.id = eval_runs.dataset_id and d.status = 'active'
      and (d.project_id is null or can_run_project_evals(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_results_select_active_consultant" on eval_results;
create policy "eval_results_select_active_consultant" on eval_results
  for select using (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
      and (d.project_id is null or is_project_member(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

drop policy "eval_results_insert_active_consultant" on eval_results;
create policy "eval_results_insert_active_consultant" on eval_results
  for insert with check (
    exists (
      select 1 from eval_runs r join eval_datasets d on d.id = r.dataset_id
      where r.id = eval_results.eval_run_id and d.status = 'active'
      and (d.project_id is null or can_run_project_evals(d.project_id, auth.uid()))
    )
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'consultant' and p.is_active)
  );

-- New, additive: project curator/owner can fully manage their own project's
-- dataset/cases even when their *platform* role is merely 'consultant' --
-- e.g. the "Senior AI Consultant" project Owner in the brief's Example 1.
create policy "eval_datasets_manage_project_curator" on eval_datasets
  for all using (project_id is not null and can_curate_project(project_id, auth.uid()))
  with check (project_id is not null and can_curate_project(project_id, auth.uid()));

create policy "eval_cases_manage_project_curator" on eval_cases
  for all using (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.project_id is not null and can_curate_project(d.project_id, auth.uid()))
  )
  with check (
    exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.project_id is not null and can_curate_project(d.project_id, auth.uid()))
  );

-- ==== supabase/migrations/20260810120002_fix_projects_select_returning.sql ====
-- Fixes a real bug hit live: createProjectAction does
-- `.insert(...).select().single()`, and Postgres re-checks a table's SELECT
-- RLS policy against INSERT ... RETURNING output. Row-level AFTER INSERT
-- triggers (here, projects_create_owner_membership, which creates the
-- owner's project_members row) fire at the end of the statement -- AFTER the
-- RETURNING row has already been checked against the SELECT policy. So
-- is_project_member(id, auth.uid()) saw no membership row yet and rejected
-- the RETURNING of the project the caller had just created themselves.
-- owner_id = auth.uid() is checked directly against the row being inserted,
-- not through project_members, so it has no such timing dependency.
drop policy "projects_select_members" on projects;
create policy "projects_select_members" on projects
  for select using (owner_id = auth.uid() or is_project_member(id, auth.uid()));

-- ==== supabase/migrations/20260810130001_public_visibility.sql ====
-- Public/anonymous visitor experience. A visitor here is simply `auth.uid()
-- is null` -- no session, no profile row, using Supabase's plain anon API
-- key. This is a different concept from profiles.role = 'anonymous' (a real
-- Supabase Auth anonymous session, wired up in an earlier migration but
-- never actually reachable from any UI) -- that machinery is left untouched
-- and dormant; nothing here creates or depends on an 'anonymous' profile.
--
-- Governing principle: publish a curated VIEW of a project, never the
-- internal project itself. Every new RLS policy below is purely additive
-- (multiple permissive policies on one table OR together in Postgres) --
-- nothing here narrows or replaces an existing policy. Column-level safety
-- (never leaking owner_id/notes/details/published_by on projects, or
-- source_chunk_ids/created_by/approved_by on wiki_versions) is NOT
-- enforced by RLS, which is row-level only -- it's enforced by the
-- dedicated narrow-select query functions in src/lib/projects/public.ts and
-- src/lib/wiki/public.ts, which must never select('*').

-- projects: publication fields --------------------------------------------------
alter table projects add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'internal', 'public'));
alter table projects add column if not exists public_slug text unique;
alter table projects add column if not exists public_profile jsonb;
alter table projects add column if not exists published_at timestamptz;
alter table projects add column if not exists published_by uuid references profiles(id) on delete set null;

-- projects_update_managers (20260810120001, can_manage_project-gated) already
-- covers UPDATEs to these new columns since they're on the same row -- no new
-- UPDATE policy needed for publish/unpublish/save-draft.
create policy "projects_select_public" on projects
  for select using (visibility = 'public' and published_at is not null);

-- wiki_articles: separate publication flag ---------------------------------------
-- Deliberately distinct from status='approved' -- approved means "trusted
-- canonical knowledge", public means "safe for anonymous disclosure". An
-- article can be approved and still never marked public.
alter table wiki_articles add column if not exists is_public boolean not null default false;

create policy "wiki_articles_select_public" on wiki_articles
  for select using (status = 'approved' and is_public = true);

-- Reusable helper so "is this article's current version safe to show
-- anonymously" has one source of truth instead of being duplicated across
-- policies that would otherwise need to re-derive it independently.
create or replace function is_public_wiki_article(article_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from wiki_articles a where a.id = article_id and a.status = 'approved' and a.is_public = true
  );
$$;

-- Scoped to exactly the article's CURRENT version -- never a draft, a
-- pending review revision, or an old superseded-but-once-approved version
-- (tighter than wiki_versions_select_approved_or_staff, which the original
-- Wiki RLS migration's own comment already flags as allowing any
-- historically-approved version; that policy is untouched, staff behavior
-- doesn't change).
create policy "wiki_versions_select_public" on wiki_versions
  for select using (
    id = (select current_version_id from wiki_articles where id = wiki_versions.wiki_article_id)
    and is_public_wiki_article(wiki_article_id)
  );

-- wiki_categories: category names are non-sensitive and already visible to
-- every authenticated user regardless of role -- widen the same read to
-- anon too. No behavior change for anyone already authenticated.
drop policy "wiki_categories_select_authenticated" on wiki_categories;
create policy "wiki_categories_select_public" on wiki_categories
  for select using (true);

-- Deliberately no new RLS on wiki_sources, wiki_relations, project_members,
-- eval_datasets/eval_cases/eval_runs/eval_results, ai_operation_logs,
-- documents, or document_chunks -- none of them already leak to anon (every
-- existing policy on those tables depends on auth.uid(), which is null for
-- a sessionless request), and this milestone's public pages don't need
-- direct read access to any of them: the public project page skips a Wiki
-- cross-link/Sources section, and the public eval summary is hand-authored
-- JSON on projects.public_profile, never a live query against eval_results.
