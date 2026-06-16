# Dialed — Car Photography Location Planner

A private, mobile-first tool for planning car photography shoots: save spots on a
map, calculate sun position and shooting windows, check cloud cover, get camera
setting suggestions, and organize photos by editing status.

Built as a **fully static single-page app** so it can be hosted for free on
**Cloudflare Pages**, which builds from a private GitHub repo at no cost. There
is no backend server — auth, database, and image storage all run client-side
against [Supabase](https://supabase.com), and weather comes straight from the
free [Open-Meteo](https://open-meteo.com) API.

## Tech stack

- **Next.js** (static export, `output: 'export'`) + **TypeScript**
- **Supabase** — auth, Postgres (with Row Level Security), and image storage
- **Mapbox** via `react-map-gl` — the interactive map
- **SunCalc** — sun position, golden/blue hour
- **ShadeMap** (`mapbox-gl-shadow-simulator`) — simulated terrain + building shadows
- **Open-Meteo** — cloud cover & forecast (no API key)
- **Tailwind CSS** — mobile-first dark UI

## Sun & shade simulation

The map and each spot page have a **Sun & shade** mode: tap the button, then drag
the time slider (or pick a date) to see where sunlight and shadow fall across
terrain and buildings at that moment. It uses [ShadeMap](https://shademap.app),
which needs a free, client-side API key:

1. Request a key at <https://shademap.app/about/> (it's emailed to you).
2. Add it as `NEXT_PUBLIC_SHADEMAP_KEY` — in `.env.local` for local dev, and as a
   Cloudflare Pages environment variable for the live site (see below).

Without a key the app works normally; the "Sun & shade" button is just disabled.

> The time slider uses your device's local timezone, not the spot's. For a single
> user shooting near home this is fine; cross-timezone planning would need a
> timezone lookup (not implemented).

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
> path segment (`/spots?id=…`, not `/spots/:id`). This is deliberate — a static
> export can't server-render dynamic path segments, and query params avoid the
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

## Deploying to Cloudflare

Cloudflare builds and hosts static sites for free, including from a
**private** GitHub repo — no paid plan required (unlike GitHub Pages, which
only serves private repos on a paid GitHub plan).

Cloudflare has been unifying Pages into Workers, so depending on when you
create the project it may come up either as a classic **Pages** project
(served at `https://<project-name>.pages.dev`) or as a **Worker with static
assets** (served at `https://<name>.<account-subdomain>.workers.dev`). This
repo includes `wrangler.jsonc` and `.node-version` so either path works.

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free).
2. **Workers & Pages → Create application → Connect to Git**, then authorize
   Cloudflare's GitHub App for this repository (you can scope access to just
   this one repo).
3. Build settings:
   - Framework preset: **Next.js (Static HTML Export)**
   - Build command: `npm run build`
   - Build output directory: `out`
4. **Settings → Environment variables** — add these (all are safe to expose in
   client code: the Supabase anon key is protected by RLS, and the Mapbox token
   should be URL-restricted in the Mapbox dashboard):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
   - `NEXT_PUBLIC_SHADEMAP_KEY` (optional — enables the Sun & shade feature)
5. Save and deploy. Every push to the connected branch triggers a new build
   automatically.

> **If you land on a Worker project (`Settings → Build`) instead of classic
> Pages:** confirm **Branch control → Production branch** is set to your
> deploy branch (e.g. `main`), and that **Deploy command** is `npx wrangler
> deploy`, not `npx wrangler versions upload`. The latter only uploads a new
> Worker version without routing any traffic to it — the build will succeed
> with no errors, but the site will be unreachable, because no deployment is
> ever promoted to serve requests. Cloudflare uses the Deploy command only for
> builds on the configured production branch; everything else uses the
> Version command and stays an unpromoted preview.

> **Note on a static deploy:** `NEXT_PUBLIC_*` values are baked into the public
> JavaScript bundle at build time. That's expected here — the Supabase anon key
> and Mapbox token are public by design. Never put service-role keys or other
> secrets in `NEXT_PUBLIC_*` variables.
