# RAS Site Safety

A mobile-friendly site safety application built for Ron Anderson & Sons.

Framers can submit daily safety forms with photos and review their previous submissions. Administrators can review submissions from all workers, filter them by worker, job site, and form date, and view a summary of today's submissions by site.

## Tech Stack

- React
- TypeScript
- Vite
- Supabase
  - PostgreSQL
  - Authentication
  - Row Level Security
  - Private Storage

## Features

### Framer

- Sign in with an assigned account
- Select a job site and form date
- Complete the required safety checklist
- Add optional notes
- Upload 1–10 JPEG, PNG, or WebP photos
- View previous submissions and their attached photos

### Admin

- View submissions from all framers
- Filter by worker, job site, and date range
- Review complete submission details and photos
- View today's submission totals by job site

## Local Development

Install dependencies:

```bash
npm install

Create an untracked .env.local file in the project root:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

Start the development server:
npm run dev

Database
Database migrations are stored in:
supabase/migrations/

To apply migrations to a linked Supabase project:
npx supabase db push

Authentication credentials are managed by Supabase Auth. Application roles and worker information are stored separately in the profiles table.
Row Level Security ensures that framers can only access their own submissions while administrators can review all submissions.
Photos are stored in a private Supabase Storage bucket and are accessed through authenticated, temporary signed URLs.
Entity Relationship Diagram
 
Project Assumptions
- Accounts are provisioned administratively; there is no public registration.
- A submitted safety form is treated as Submitted; no approval workflow was required.
- Multiple submissions by the same worker for the same site and date are allowed.
- Photo uploads and database writes are separate operations and are not atomic across PostgreSQL and Supabase Storage.
- The application is designed for a small internal workforce; pagination would be added if submission volume grew significantly.
Checks
npm run build
npm run lint
npm run preview

Additional Supabase setup information is available in [README.md](supabase/README.md).