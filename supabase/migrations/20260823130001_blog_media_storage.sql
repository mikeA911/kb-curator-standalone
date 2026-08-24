-- Public storage bucket for Blog cover/inline images (see
-- docs/dev-request-blog-contributor-workflow-and-editorial-placeholders.md,
-- "Minimal Blog visuals"). Modeled on branding_storage
-- (20260814100001_branding_storage.sql), but curator-or-admin can write
-- (not admin-only, matching Blog's authoring permission level), and the
-- allowlist enforced at the application layer (src/lib/blog/media.ts)
-- deliberately excludes SVG -- the dev request requires preventing SVG or
-- other active content in Blog media unless a separate sanitisation
-- design is approved.
insert into storage.buckets (id, name, public)
values ('blog-media', 'blog-media', true)
on conflict (id) do update set public = true;

create policy "blog_media_bucket_staff_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'blog-media' and is_curator_or_admin(auth.uid()));

create policy "blog_media_bucket_staff_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'blog-media' and is_curator_or_admin(auth.uid()));

create policy "blog_media_bucket_staff_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'blog-media' and is_curator_or_admin(auth.uid()));

create policy "blog_media_bucket_public_select" on storage.objects
  for select using (bucket_id = 'blog-media');
