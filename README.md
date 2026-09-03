# FAIZ 777

Premium gaming creator website with a cinematic public experience and Supabase-ready admin foundation.

## Run locally

```bash
npm install
npm run dev
```

Create `.env` from `.env.example` before enabling Supabase Auth, Storage, database content, and YouTube synchronization.

## Deployment setup

1. Run `supabase/schema.sql` followed by `supabase/production-upgrade.sql` in your Supabase project.
2. Create a public `website-assets` Storage bucket.
3. Add an authorized admin user to `admin_users`.
4. Set the Vite environment variables in your hosting provider.
