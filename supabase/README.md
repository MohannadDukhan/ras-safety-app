# Database schema

SQL migrations live in `supabase/migrations`, the conventional Supabase CLI location.
The initial migration is `20261004000000_initial_schema.sql`.

## Tables and relationships

- `profiles`: application information for an Auth user. Its UUID primary key is
  also a foreign key to `auth.users.id`, so each user can have at most one profile.
  `full_name` is required and cannot be empty or contain only spaces. `role` must
  be `framer` or `admin` and defaults to `framer`. Profiles must be provisioned
  explicitly later; there is no automatic profile creation trigger.
- `sites`: construction sites with generated UUIDs and required, nonblank names.
- `submissions`: one worker's safety checklist for one site and form date.
  `user_id` references `profiles.id`; `site_id` references `sites.id`.
  All five checklist answers are required booleans with no default, so a missing
  answer cannot silently become `false`. Notes are optional. `form_date` is a
  calendar date; `created_at` is a timezone-aware timestamp defaulting to the
  database's `now()`. Multiple submissions for the same worker/date/site are allowed.
- `submission_photos`: photo metadata with a required `submission_id` referencing
  `submissions.id`, a nonblank Storage object path, and an automatic timestamp.
  A submission can have multiple photo records. This schema does not enforce a
  minimum photo count or verify that a Storage object exists.

All primary keys are UUIDs. IDs are generated with `gen_random_uuid()` except
profile IDs, which must match existing Auth users. Fields are required except
`submissions.notes`.

Deleting an Auth user cascades to their profile, but a profile with submissions
cannot be deleted. Therefore, deleting an Auth user with submissions is also
blocked. Sites with submissions cannot be deleted. These restrictions preserve
safety records. Deleting a submission deletes its photo metadata; it does not
delete files from Supabase Storage.

The migration does not enable or disable RLS or create policies. Project settings
or event triggers may enable RLS independently. Foreign keys enforce relationships,
not user authorization; access control remains a separate implementation step.

## Apply to the existing Supabase project

Run these commands from the repository root in PowerShell:

```powershell
npx.cmd supabase init
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```

`npx` may ask to download the CLI; this does not add an application dependency.
`init` creates the CLI configuration; run it once. Find the project reference in
your Supabase project's settings and replace `YOUR_PROJECT_REF`. Complete login
and any database password prompt locally; do not put passwords or access tokens
in tracked files. The frontend publishable key is not a database migration credential.

Review the dry run: for this initial project, the pending migration should be
`20261004000000_initial_schema.sql`. The final command applies it and records it
in Supabase's migration history. Subsequent pushes skip applied migrations.
Afterward, confirm the four tables in the Dashboard's Table Editor under `public`.

This assumes the four application tables do not already exist. Do not also run
the same SQL manually in the Dashboard: that bypasses CLI migration history.
Make future schema changes in new migration files.

Official references: [database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
and [CLI commands](https://supabase.com/docs/reference/cli/supabase-db-push).
