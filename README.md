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
2. Create an Auth user, then add its id to `admin_users` with `active = true`.
3. Set the Vite environment variables in your hosting provider.

Supabase holds the recruitment and membership data, TypeScript-compatible React keeps UI data reliable, React Router manages the workflow, and Lucide/Framer Motion provide the esports presentation. Row Level Security protects private application data: the public can submit an application and look up only its limited status; only authorized authenticated admins can view contacts, update decisions, manage members, or control recruitment.
