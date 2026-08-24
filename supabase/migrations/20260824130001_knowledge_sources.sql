-- Versioned Knowledge Source Documents (docs/dev-request-versioned-knowledge-source-documents.md),
-- Stage 1: model and safe retrieval only. `documents` stays the immutable
-- version table (every existing FK -- document_chunks, kb_vectors,
-- curation_queue, ai_operation_logs -- already points at documents.id, so
-- none of that needs to change). `knowledge_sources` is new: the stable
-- logical-source identity, mirroring wiki_articles/wiki_versions exactly
-- (current_version_id pointer, immutable versions underneath). Public
-- terminology stays "Source" and "Version", per the dev request.
create table if not exists knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  knowledge_base_id text not null references knowledge_bases(id) on delete restrict,
  title text not null,
  source_url text,
  publisher text,
  current_version_id uuid, -- FK added below, once documents.knowledge_source_id exists
  lifecycle_status text not null default 'active' check (lifecycle_status in ('active', 'retired')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Uniqueness on source_url now belongs at the logical-source level, not per
  -- uploaded version -- this replaces documents(doc_type, source_url) below.
  unique (knowledge_base_id, source_url)
);

create index if not exists knowledge_sources_kb_id_idx on knowledge_sources(knowledge_base_id);

drop trigger if exists knowledge_sources_set_updated_at on knowledge_sources;
create trigger knowledge_sources_set_updated_at before update on knowledge_sources
  for each row execute function set_updated_at();

-- documents becomes the immutable version table: one row per version of one
-- knowledge_source. version_number defaults to 1 for the backfill below;
-- Stage 2's "Upload new version" flow is what will ever insert version 2+.
alter table documents
  add column if not exists knowledge_source_id uuid references knowledge_sources(id) on delete cascade,
  add column if not exists version_number integer not null default 1,
  add column if not exists change_note text,
  add column if not exists superseded_at timestamptz,
  add column if not exists retired_at timestamptz;

alter table knowledge_sources
  add constraint knowledge_sources_current_version_fk
  foreign key (current_version_id) references documents(id) on delete set null;

-- Backfill: one knowledge_sources row per existing documents row, all as
-- version 1, and each immediately made current. Stage 1 never creates a
-- second version of an existing source, so "current = the only version"
-- exactly preserves today's retrieval behaviour (see match_documents below)
-- -- this is a deliberate, documented choice, not an oversight. Do not infer
-- that similarly named/dated existing documents are versions of one another;
-- that reconciliation is a deliberate Stage 3 curator action, per the dev request.
do $$
declare
  doc record;
  new_source_id uuid;
begin
  for doc in select * from documents where knowledge_source_id is null loop
    insert into knowledge_sources (knowledge_base_id, title, source_url, current_version_id, created_by, created_at)
    values (doc.doc_type, doc.original_filename, doc.source_url, null, doc.uploaded_by, doc.created_at)
    returning id into new_source_id;

    update documents set knowledge_source_id = new_source_id, version_number = 1 where id = doc.id;
    update knowledge_sources set current_version_id = doc.id where id = new_source_id;
  end loop;
end $$;

alter table documents alter column knowledge_source_id set not null;
alter table documents add constraint documents_source_version_unique unique (knowledge_source_id, version_number);

-- Superseded by the new source-level uniqueness rule above.
alter table documents drop constraint if exists documents_doc_type_source_url_key;

create index if not exists documents_knowledge_source_id_idx on documents(knowledge_source_id);

-- RLS: same staff-or-owner shape as documents itself
-- (20260808190010_rls_policies.sql), reusing the same helper functions.
alter table knowledge_sources enable row level security;

create policy "knowledge_sources_select_staff_or_owner" on knowledge_sources
  for select using (is_curator_or_admin(auth.uid()) or created_by = auth.uid());

create policy "knowledge_sources_insert_staff" on knowledge_sources
  for insert with check (is_curator_or_admin(auth.uid()));

create policy "knowledge_sources_update_staff" on knowledge_sources
  for update using (is_curator_or_admin(auth.uid())) with check (is_curator_or_admin(auth.uid()));

-- Retrieval: only chunks belonging to a source's current version are
-- eligible. Mirrors match_wiki_vectors's join through wiki_articles.current_version_id
-- exactly (20260809110003_match_wiki_vectors.sql) -- same pattern, new table.
-- Return columns are unchanged, so CREATE OR REPLACE is safe here (unlike the
-- id/chunk_id change in 20260809110005_match_documents_chunk_id.sql, which
-- needed DROP + CREATE).
create or replace function match_documents(
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
  join documents d on d.id = kb_vectors.document_id
  join knowledge_sources ks on ks.current_version_id = d.id
  where 1 - (kb_vectors.embedding <=> query_embedding) > match_threshold
    and (filter_doc_type is null or kb_vectors.doc_type = filter_doc_type)
    and (filter_use_cases is null or kb_vectors.use_cases && filter_use_cases)
  order by kb_vectors.embedding <=> query_embedding
  limit match_count;
$$;
