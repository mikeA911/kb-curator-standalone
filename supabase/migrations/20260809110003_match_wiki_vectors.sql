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
