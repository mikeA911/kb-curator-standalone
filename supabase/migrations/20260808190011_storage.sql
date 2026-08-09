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
