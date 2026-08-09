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
