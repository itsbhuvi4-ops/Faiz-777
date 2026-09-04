# FAIZ 777 — Free Fire Guild Recruitment

A React, Supabase, Framer Motion and Tailwind-ready (CSS-first) guild recruitment platform. The application flow is: recruitment → secure application → admin review → member selection.

## Run locally

```bash
npm install
npm run dev
```

Create `.env` from `.env.example` before enabling Supabase Auth and database persistence.

## Deployment setup

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Run `supabase/match-management.sql` in the Supabase SQL Editor to enable room-match scheduling, controlled registrations, and the public leaderboard.
3. Create an Auth user, then add its id to `admin_users` with `active = true` and a username. For the requested account, use `Bhuvi` as the username (the password remains managed only by Supabase Auth):

```sql
update public.admin_users
set username = 'Bhuvi', active = true
where user_id = '<the-auth-user-id-for-this-admin>';
```

4. Set the Vite environment variables in your hosting provider.

The admin sign-in form resolves the username to its authorized Auth account and then sends the supplied password to Supabase Auth. It does not store a password in the website or database.

Supabase holds the recruitment and membership data, TypeScript-compatible React keeps UI data reliable, React Router manages the workflow, and Lucide/Framer Motion provide the esports presentation. Row Level Security protects private application data: the public can submit an application and look up only its limited status; only authorized authenticated admins can view contacts, update decisions, manage members, or control recruitment.
