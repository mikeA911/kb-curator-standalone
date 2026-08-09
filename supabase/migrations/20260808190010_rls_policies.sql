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
