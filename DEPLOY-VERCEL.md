# Deploying to Vercel

This project pins the Nitro **Vercel SSR preset** in `vite.config.ts` and ships with a matching `vercel.json`, so Vercel builds `.vercel/output/` and serves every route through the server — no `404: NOT_FOUND`, no rewrites file required.

## Steps

1. Push the code to GitHub.
2. In Vercel, **Import** the repo as a new project.
3. Leave Framework Preset as **Other** (Vercel will use `vercel.json`).
4. Add **Environment Variables** (Production + Preview + Development):
   ```
   VITE_SUPABASE_URL=<your Supabase URL>
   VITE_SUPABASE_PUBLISHABLE_KEY=<your Supabase publishable key>
   VITE_SUPABASE_PROJECT_ID=<your Supabase project id>
   SUPABASE_URL=<same as VITE_SUPABASE_URL>
   SUPABASE_PUBLISHABLE_KEY=<same as VITE_SUPABASE_PUBLISHABLE_KEY>
   SUPABASE_SERVICE_ROLE_KEY=<your Supabase service role key>
   ```
   (`vite.config.ts` already pins the Vercel SSR adapter; `vercel.json` keeps Vercel using the same build command.)
5. Click **Deploy**.

## Supabase auth redirect

Add your Vercel domain (e.g. `https://your-app.vercel.app`) to **Supabase → Authentication → URL Configuration → Redirect URLs**.

## Why this fixes `404: NOT_FOUND`

Without forcing Nitro outside Lovable, Vercel can receive only a static Vite build and show its platform 404. With `nitro: { preset: "vercel" }`, Nitro emits `.vercel/output/` — a real serverless build that Vercel serves for every route.
