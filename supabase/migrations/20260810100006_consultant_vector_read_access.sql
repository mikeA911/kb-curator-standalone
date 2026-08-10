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
