# Dialed — Car Photography Location Planner

A private, mobile-first tool for planning car photography shoots: save spots on a
map, calculate sun position and shooting windows, check cloud cover, get camera
setting suggestions, and organize photos by editing status.

Built as a **fully static single-page app** so it can be hosted for free on
**GitHub Pages**. There is no backend server — auth, database, and image storage
all run client-side against [Supabase](https://supabase.com), and weather comes
straight from the free [Open-Meteo](https://open-meteo.com) API.

## Tech stack

- **Next.js** (static export, `output: 'export'`) + **TypeScript**
- **Supabase** — auth, Postgres (with Row Level Security), and image storage
- **Mapbox** via `react-map-gl` — the interactive map
- **SunCalc** — sun position, golden/blue hour
- **Open-Meteo** — cloud cover & forecast (no API key)
- **Tailwind CSS** — mobile-first dark UI

## Pages

| Route | Description |
| --- | --- |
| `/login` | Email/password auth |
| `/map` | Map of saved spots; tap-to-add new spots |
| `/spots?id=…` | Spot detail: sun times, notes, shoot plans, photos |
| `/spots/new`, `/spots/edit?id=…` | Add / edit a spot |
| `/gallery` | Photo gallery with upload and status workflow |
| `/planner` | Shoot plan dashboard (sun windows, weather, settings) |

> Dynamic data (spots, plans, photos) is keyed by **query string** rather than a
> path segment (`/spots?id=…`, not `/spots/:id`). This is deliberate — GitHub
> Pages can't server-render dynamic path segments, and query params avoid the
> "404 on refresh" problem that path-based dynamic routes hit on static hosts.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Mapbox values
npm run dev
```

In dev the base path is empty, so the app runs at `http://localhost:3000`.

## Database setup

In your Supabase project's SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
It creates the `photo_spots`, `shoot_plans`, and `photos` tables, the `photos`
storage bucket, and Row Level Security policies so each user only sees their own
data.

## Deploying to GitHub Pages

1. **Repository → Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Repository → Settings → Secrets and variables → Actions** — add these
   repository secrets (all are safe to expose in client code: the Supabase anon
   key is protected by RLS, and the Mapbox token should be URL-restricted in the
   Mapbox dashboard):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
3. Push to `main`. The workflow in
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds the
   static site and publishes it. The base path (e.g. `/Dialed`) is injected
   automatically from the Pages configuration.

The site will be served at `https://<username>.github.io/<repo>/`.

> **Note on a static deploy:** `NEXT_PUBLIC_*` values are baked into the public
> JavaScript bundle at build time. That's expected here — the Supabase anon key
> and Mapbox token are public by design. Never put service-role keys or other
> secrets in `NEXT_PUBLIC_*` variables.
