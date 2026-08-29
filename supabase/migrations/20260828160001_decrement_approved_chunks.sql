-- Mirrors increment_approved_chunks (20260808190009_functions.sql). Needed
-- because a chunk can be re-reviewed and rejected after already being
-- approved (no status guard in the reviewer UI) -- rejectChunk now calls
-- this so documents.approved_chunks doesn't keep counting a chunk that's no
-- longer approved. greatest(...,0) guards against underflow if ever called
-- out of order.
create or replace function decrement_approved_chunks(doc_id uuid)
returns void
language sql security definer set search_path = public as $$
  update documents set approved_chunks = greatest(approved_chunks - 1, 0) where id = doc_id;
$$;
