-- Public storage bucket for admin-managed branding assets (logo, PWA
-- icons). Unlike the `documents` bucket, this is deliberately public --
-- the browser tab favicon, PWA manifest icons, and the site header all
-- need to fetch these with no auth. Writes stay admin-only; reads are
-- open to anyone via the bucket's own public URL regardless of these
-- policies, but the policies still govern API-level access (list/upload
-- via the Supabase client, as opposed to a bare public URL fetch).
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

create policy "branding_bucket_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'branding'
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

create policy "branding_bucket_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'branding'
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

create policy "branding_bucket_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'branding'
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

create policy "branding_bucket_public_select" on storage.objects
  for select using (bucket_id = 'branding');
