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

The initial migration only defines the tables. The next migration,
`20261004000001_enable_rls.sql`, explicitly enables RLS and defines the application
access rules below.

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

## Row Level Security

All six policies apply only to the `authenticated` database role:

- `profiles_read_authenticated`: signed-in users may read all profiles.
- `sites_read_authenticated`: signed-in users may read all sites.
- `submissions_read_owner_or_admin`: users may read their own submissions;
  users with an `admin` profile may read every submission.
- `submissions_insert_own`: a new submission's `user_id` must equal the signed-in
  user's ID, including when an admin creates a submission.
- `submission_photos_read_visible_submission`: users may read photos when they
  can read the parent submission. The parent submission's RLS provides the
  owner/admin restriction.
- `submission_photos_insert_own_submission`: users may attach photo records
  only to their own submissions. Admins cannot attach records to another worker's
  submission.

`auth.uid()` supplies the UUID from the authenticated request, rather than trusting
a worker ID supplied by the browser. The admin check reads the matching row in
`profiles` and requires `role = 'admin'`. Profile reads use a simple `true` policy,
so this lookup does not query submissions again or cause recursive RLS. Photo
policies query submissions, whose read policy queries profiles: this dependency
goes in one direction.

The migration revokes table privileges from `PUBLIC`, `anon`, and `authenticated`,
then grants authenticated users only SELECT on all four tables and INSERT on
submissions/photos. There are no profile/site write policies and no UPDATE/DELETE
policies. This also prevents users from promoting themselves to admin. All profile
columns, including roles, are readable by signed-in users under the requested rule.
Existing privileged administrative access, including `service_role`, is not granted
to browser users or changed by this migration. This covers photo metadata only;
Storage bucket access is a separate step.

### Apply RLS with the already-linked CLI

From the repository root:

```powershell
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```

The dry run should list only `20261004000001_enable_rls.sql` if the initial schema
has already been applied. After pushing, review the policies for all four tables
in the Supabase Dashboard. There is no need to initialize or link the project again.

Reference: [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
