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