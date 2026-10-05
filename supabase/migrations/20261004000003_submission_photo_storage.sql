insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-photos', 'submission-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths: <user UUID>/<submission UUID>/<photo UUID>.<extension>
create policy submission_photo_objects_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'submission-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.submissions
    where submissions.id::text = (storage.foldername(name))[2]
      and submissions.user_id = (select auth.uid())
  )
);

-- The submission's SELECT policy already limits reads to its owner or an admin.
create policy submission_photo_objects_read_visible_submission
on storage.objects for select to authenticated
using (
  bucket_id = 'submission-photos'
  and exists (
    select 1 from public.submissions
    where submissions.id::text = (storage.foldername(name))[2]
      and submissions.user_id::text = (storage.foldername(name))[1]
  )
);
