alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_photos enable row level security;

-- Set browser permissions explicitly instead of relying on project defaults.
revoke all on table public.profiles, public.sites,
  public.submissions, public.submission_photos from public, anon, authenticated;

grant select on table public.profiles, public.sites,
  public.submissions, public.submission_photos to authenticated;
grant insert on table public.submissions, public.submission_photos to authenticated;

create policy profiles_read_authenticated
on public.profiles for select to authenticated
using (true);

create policy sites_read_authenticated
on public.sites for select to authenticated
using (true);

create policy submissions_read_owner_or_admin
on public.submissions for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

create policy submissions_insert_own
on public.submissions for insert to authenticated
with check (user_id = (select auth.uid()));

-- The parent submission's SELECT policy limits reads to its owner or an admin.
create policy submission_photos_read_visible_submission
on public.submission_photos for select to authenticated
using (
  exists (
    select 1 from public.submissions
    where submissions.id = submission_photos.submission_id
  )
);

create policy submission_photos_insert_own_submission
on public.submission_photos for insert to authenticated
with check (
  exists (
    select 1 from public.submissions
    where submissions.id = submission_photos.submission_id
      and submissions.user_id = (select auth.uid())
  )
);
