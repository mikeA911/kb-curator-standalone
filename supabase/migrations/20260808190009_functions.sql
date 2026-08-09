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
