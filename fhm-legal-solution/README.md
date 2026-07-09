# FHM-Legal-Solution — Dynamic Website + Admin Portal

This turns your static site into a dynamic one **without changing any existing
design**. Your HTML/CSS stays exactly as it is — a small JavaScript layer
fetches content from a free backend + database instead of it being hardcoded.

```
fhm-legal-solution/
├── backend/                 → Node.js + Express API (deploy to Render)
│   ├── server.js
│   ├── src/                 → config, middleware, controllers, routes, utils
│   └── database/            → schema.sql + seed script
├── frontend-integration/    → files to drop into your existing GitHub Pages repo
│   ├── advocate.html        → replaces every individual advocate .html file
│   └── js/                  → config.js, api-client.js, homepage-loader.js, advocate-loader.js
└── admin-panel/              → the admin dashboard (also deployed to GitHub Pages, but not linked from the public site)
```

Nothing about your visual design, animations, or SEO markup changes. You are
only adding: (1) a database, (2) an API, (3) a few `<script>` tags, and (4) a
separate, unlisted admin dashboard.

---

## Architecture at a glance

```
┌────────────────────┐      HTTPS       ┌──────────────────────┐      HTTPS      ┌───────────────────┐
│  GitHub Pages       │ ───────────────▶│  Render (Node/Express)│───────────────▶│  Supabase          │
│  (free static host) │◀─────────────── │  your API + JWT auth  │◀─────────────── │  Postgres + Storage│
│  index.html          │   JSON          │                       │   SQL / files   │                    │
│  advocate.html       │                │                       │                 │                    │
│  admin-panel/        │                │                       │                 │                    │
└────────────────────┘                  └──────────────────────┘                 └───────────────────┘
```

- **Public visitors** hit your existing GitHub Pages site. `homepage-loader.js`
  and `advocate-loader.js` call the Render API for read-only data (advocates,
  homepage content, practice areas, testimonials).
- **You (the admin)** go to a separate URL — `admin-panel/login.html` — which
  is never linked from the public site, so ordinary visitors never see it or
  any admin controls.
- **The database** lives in Supabase (Postgres). **Images** live in Supabase
  Storage; only their public URLs are stored in Postgres.
- The Express API is the only thing that ever talks to Supabase directly,
  using the powerful `service_role` key. The browser (public site or admin
  panel) never sees that key — it only ever holds a short-lived JWT.

Everything below fits comfortably in the free tiers of Render and Supabase
for a small site like this.

---

## Part 1 — Set up Supabase (database + storage)

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any
   name/region, set a database password (save it somewhere safe), free tier.
2. Once created, open **SQL Editor → New query**, paste in the entire
   contents of `backend/database/schema.sql`, and click **Run**. This creates
   every table (`advocates`, `homepage_content`, `practice_areas`,
   `testimonials`, `consultations`, `admin_users`) plus indexes and triggers.
3. Go to **Storage → New bucket**. Name it `advocate-images` (or whatever you
   put in `SUPABASE_STORAGE_BUCKET` later), and make it **Public** (so photo
   URLs work directly in `<img src>` tags without extra signing).
4. Go to **Project Settings → API**. You'll need two values for the next
   part:
   - **Project URL** → `SUPABASE_URL`
   - **service_role secret** (not the `anon` key!) → `SUPABASE_SERVICE_ROLE_KEY`

   ⚠️ The `service_role` key bypasses all database security rules. It must
   only ever live in the backend's environment variables on Render — never in
   any frontend file, never committed to GitHub.

---

## Part 2 — Deploy the backend to Render

1. Push the `backend/` folder to its own GitHub repository (e.g.
   `fhm-legal-backend`). It does **not** need to be public — Render can
   deploy from a private repo too.
2. Go to [render.com](https://render.com) → **New → Web Service** → connect
   that repo.
3. Configure:
   - **Root Directory**: leave blank if the repo *is* the `backend/` folder;
     otherwise set it to `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Under **Environment**, add every variable from `backend/.env.example`:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` (Render sets its own `$PORT`, but Express reads it either way) |
   | `CLIENT_ORIGINS` | `https://yourusername.github.io` (your GitHub Pages URL — comma-separate if you also have a custom domain) |
   | `SUPABASE_URL` | from Part 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Part 1 |
   | `SUPABASE_STORAGE_BUCKET` | `advocate-images` |
   | `JWT_SECRET` | a long random string — generate one with `openssl rand -hex 32` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `INITIAL_ADMIN_EMAIL` | the email you'll use to log in |
   | `INITIAL_ADMIN_PASSWORD` | a temporary password — you'll change it after first login |

5. Click **Create Web Service**. Render will build and deploy; you'll get a
   URL like `https://fhm-legal-backend.onrender.com`.
6. **Seed the database** (creates your admin account + migrates your existing
   8 advocates, practice areas, and homepage text into Postgres). From your
   local machine, with the same `.env` values:
   ```bash
   cd backend
   npm install
   cp .env.example .env   # then fill in the real values
   npm run seed
   ```
   You only need to run this once. It's safe to re-run — it skips anything
   that already exists.
7. Visit `https://your-app.onrender.com/health` — you should see
   `{"success":true,"message":"FHM-Legal-Solution API is running."}`.

**Note on Render's free tier:** free web services "spin down" after 15
minutes of no traffic and take ~30–50 seconds to wake up on the next
request. For a small site this is usually fine; if it matters to you, a paid
Render instance ($7/mo) removes the cold start, or you can ping `/health`
periodically with a free uptime monitor (e.g. UptimeRobot) to keep it warm.

---

## Part 3 — Wire up the public frontend (GitHub Pages)

In your **existing** GitHub Pages repo:

1. Copy in these new files, keeping the folder structure:
   ```
   your-repo/
   ├── index.html                  (existing — small edit below)
   ├── advocate.html               (NEW — from frontend-integration/)
   ├── js/
   │   ├── config.js               (NEW)
   │   ├── api-client.js           (NEW)
   │   ├── homepage-loader.js      (NEW)
   │   └── advocate-loader.js      (NEW)
   ├── Faheem-uddin.html            (can now be deleted — see Part 4)
   ├── Mohd Salman Khan.html         (can now be deleted)
   ├── ... (other per-advocate files, can now be deleted)
   ```
2. Open `js/config.js` and set the one line to your Render URL:
   ```js
   window.FHM_API_BASE_URL = 'https://fhm-legal-backend.onrender.com/api';
   ```
3. Open your existing `index.html` and add three `<script>` tags right
   before `</body>` (after your existing scripts):
   ```html
   <script src="js/config.js"></script>
   <script src="js/api-client.js"></script>
   <script src="js/homepage-loader.js"></script>
   </body>
   ```
   That's the *only* required change to `index.html`. On page load,
   `homepage-loader.js` finds your existing `.lawyers-grid` element, clears
   the hardcoded cards, and re-renders them from the API using the exact same
   CSS classes — so the design is pixel-identical, just no longer hand-typed.
   It does the same (if present) for `.practice-grid` and `.testi-grid`.

4. **Optional — make more of the homepage editable.** Anything you'd like to
   manage from the admin panel (hero heading, footer phone number, etc.) just
   needs one attribute added once. For example:
   ```html
   <!-- Before -->
   <h1>Find the Right Lawyer, Right Away</h1>

   <!-- After -->
   <h1 data-cms="hero.heading">Find the Right Lawyer, Right Away</h1>
   ```
   `homepage-loader.js` automatically fills in any element with a `data-cms`
   attribute from `/api/homepage` — no extra code needed. The dot-path (e.g.
   `hero.heading`, `footer.phone`) matches the section/key names in the admin
   dashboard's "Homepage Content" tab. Nothing breaks if you skip this step —
   it's purely additive; unmarked elements just stay as static text until you
   decide to hook them up.

5. Commit and push. GitHub Pages redeploys automatically.

---

## Part 4 — Retire the individual advocate HTML files

`advocate.html` is a single reusable template that loads any advocate by
slug: `advocate.html?slug=faheem-uddin`. The homepage cards already link
here automatically (via `homepage-loader.js`), so:

1. Delete the old per-advocate files (`Faheem-uddin.html`,
   `Mohd Salman Khan.html`, `priya-sharma.html`, `Shahnawaz M...html`, etc.) —
   or just leave them; nothing will link to them anymore, they'll simply
   become unused.
2. From now on, adding a new advocate is just: **Admin Dashboard → Advocates
   → + Add Advocate**. No new HTML file, no redeploy needed — it appears on
   the homepage and gets its own profile page instantly.

**About pretty URLs:** GitHub Pages can't do server-side URL rewriting, so
profile URLs look like `advocate.html?slug=faheem-uddin` rather than
`/faheem-uddin`. This is a normal, fully-working pattern (used by many static
sites) and doesn't hurt SEO meaningfully as long as each advocate has a
distinct `<title>` and meta description — which `advocate-loader.js` already
sets dynamically per advocate. If you later want path-style URLs, that
requires either a custom domain with rewrite rules via a proxy (e.g.
Cloudflare Workers) or moving off GitHub Pages to a host with server-side
routing — not necessary for a project this size.

---

## Part 5 — Deploy and use the admin dashboard

The admin panel is a second, small set of static files. Two easy options:

**Option A (simplest): host it in the same GitHub Pages repo, in a
sub-folder that isn't linked from anywhere:**
```
your-repo/
└── admin-panel/
    ├── login.html
    ├── dashboard.html
    ├── css/admin-styles.css
    └── js/
```
It'll be reachable at `https://yourusername.github.io/admin-panel/login.html`
— not linked from your public site, and not indexed (the pages include
`<meta name="robots" content="noindex, nofollow">`), but technically
guessable. Since the JWT login + password hashing protect the actual data,
this is a reasonable amount of security for a small firm site. For extra
privacy, rename the folder to something non-obvious (e.g.
`/staff-portal-x7k2/`).

**Option B (more private): deploy `admin-panel/` as its own tiny separate
GitHub Pages repo** with a name that isn't linked anywhere publicly.

Either way:
1. Edit `admin-panel/js/admin-api.js` (top line) to point at your Render URL,
   same as `config.js` above.
2. Push. Visit `login.html`, log in with the `INITIAL_ADMIN_EMAIL` /
   `INITIAL_ADMIN_PASSWORD` you set in Render's environment variables.
3. **Immediately go to Settings → Change Password** and set a strong,
   unique password. The seed script's password was only ever meant to get
   you through the first login.

From the dashboard you can:
- **Advocates** — add/edit/delete, upload/replace photos, edit every field
  used on the homepage card and the full profile page (bio, why-choose list,
  practice areas, fee packages, achievements, reviews, contact info, SEO).
- **Homepage Content** — hero text, stats strip, footer, site name/logo/social
  links.
- **Practice Areas** — the grid of legal categories shown on the homepage.
- **Testimonials** — the homepage testimonials section.
- **Consultations** — incoming "Book Consultation" form submissions (once you
  wire up a form to `POST /api/consultations` — see note below), with status
  tracking (new / contacted / closed).
- **Settings** — change your own password.

No admin buttons, edit icons, or dashboard links appear anywhere on the
public site — the admin panel is a completely separate set of pages that the
public site's HTML/JS never references.

---

## Security summary

- **Passwords**: hashed with bcrypt (12 rounds), never stored or logged in
  plaintext.
- **Sessions**: stateless JWTs, signed with `JWT_SECRET`, expire after
  `JWT_EXPIRES_IN` (default 7 days). The dashboard re-validates the token
  against the database on every page load (`GET /api/auth/me`), so a deleted
  admin account is instantly locked out even with a still-unexpired token.
- **CORS**: the API only accepts requests from the origins listed in
  `CLIENT_ORIGINS` — random websites can't call your API from a browser.
- **Rate limiting**: login attempts are capped at 10 per 15 minutes per IP;
  the whole API is capped at 300 requests per 15 minutes per IP.
- **Database security**: the API uses Supabase's `service_role` key, which
  bypasses Row Level Security — but that key never leaves Render's server
  environment. Row Level Security is still enabled on every table as
  defense-in-depth in case the key is ever accidentally exposed.
- **File uploads**: restricted to image MIME types, 5MB max, streamed
  directly into Supabase Storage (nothing is ever written to Render's disk).
- **Input validation**: the advocate/homepage/testimonial controllers only
  ever write an explicit allow-list of fields — a crafted request body can't
  overwrite `id`, `created_at`, or other internal columns.

A few things worth doing yourself before going live:
- Change the seeded admin password immediately (Part 5, step 3).
- Rotate `JWT_SECRET` if it's ever exposed (e.g. accidentally committed).
- Consider adding a second admin account only if you actually need multiple
  people logging in — the schema supports it (`admin_users` is a normal
  table); just insert another row with a bcrypt hash, or add a "create admin"
  endpoint later if needed.

---

## Wiring up the "Book Consultation" form (optional next step)

Your current design's contact section shows Call/WhatsApp/Email cards rather
than a form. If you'd like an actual on-page booking form later, the backend
already has a public endpoint ready for it:

```
POST /api/consultations
Body: { "advocate_id": "<uuid>", "name": "...", "phone": "...", "email": "...", "message": "..." }
```

Add a `<form>` to `advocate.html` (or the homepage) with those fields, and on
submit call `FHM.submitConsultation(payload)` — it's already defined in
`js/api-client.js`. Submissions then show up under **Admin Dashboard →
Consultations**.

---

## Local development / testing the backend

```bash
cd backend
npm install
cp .env.example .env      # fill in real Supabase + JWT values
npm run dev                # nodemon, restarts on file changes
```
Then point `frontend-integration/js/config.js` and
`admin-panel/js/admin-api.js` at `http://localhost:5000/api` temporarily
while testing locally (remember to add `http://localhost:...` — e.g. via
`live-server` or VS Code's Live Server extension — to `CLIENT_ORIGINS` in
your local `.env`).

---

## Extending the schema later

Because `homepage_content` stores each section as a JSON blob keyed by name,
and `advocates` stores several rich fields as JSON arrays (`why_choose`,
`fee_structure`, `achievements`, `reviews`), you can add new editable content
in most cases **without touching the database schema at all** — just add a
new section key or array item shape, and extend the admin dashboard form (in
`admin-panel/js/admin-app.js`) and the corresponding renderer (in
`frontend-integration/js/homepage-loader.js` or `advocate-loader.js`) to
match. Only genuinely new *entities* (e.g. a "blog posts" feature) would need
a new table in `schema.sql`.
