# DEPLOYMENT_REQUIREMENTS.md

Production deployment requirements for **Kolkata Scooty Bike Training**.

> **Source of truth:** Values below were verified from this repository on **2026-07-30** (`package.json` / lockfiles, `angular.json`, `backend/server.js`, `backend/db.js`, `backend/.env.example`, `backend/Dockerfile`, `database/schema.sql`, `DEPLOYMENT.md`, `DATABASE.md`, `ecosystem.config.js`, `vercel.json`).  
> Items that cannot be proven from the repo are marked **Needs verification**.

---

## 1. Project Overview

| Item | Verified value | Source |
|------|----------------|--------|
| Frontend framework | **Angular** | Root `package.json` |
| Frontend exact version (installed) | **20.0.0** (`@angular/core`, `@angular/cli`, `@angular/build`) | `package-lock.json` |
| Frontend range in package.json | `^20.0.0` | Root `package.json` |
| Backend framework | **Express** (Node.js HTTP API) | `backend/package.json` |
| Express installed version | **4.21.2** | `backend/package-lock.json` |
| Express range in package.json | `^4.18.2` | `backend/package.json` |
| Backend entrypoint | `backend/server.js` (no TypeScript compile step) | `backend/package.json` `"main"` / `"start"` |
| Database | **PostgreSQL** | `backend/db.js`, `DATABASE.md` |
| Database driver | **`pg` 8.16.3** (range `^8.11.3`) | `backend/package-lock.json` |
| ORM | **None** — raw SQL via `pg` `Pool.query` | `backend/db.js` + routes/services |
| TypeScript (frontend) | **5.8.2** installed (`^5.8.2`) | Root lockfile |
| Angular CLI | **20.0.0** | Root lockfile |
| Node.js (local machine when audited) | **v22.14.0** | Runtime check |
| npm (local machine when audited) | **10.9.2** | Runtime check |
| Node.js (Docker image) | **`node:18-alpine`** | `backend/Dockerfile` |
| Engines field in package.json | **Not set** | Root + backend `package.json` |
| Required Node version (official Angular 20 engines) | **Needs verification** against Angular 20 docs; project runs on Node 22 locally and Docker uses Node 18 | — |
| Frontend build output | `dist/demo` (`outputPath`), SPA browser bundle under `dist/demo/browser` per `DEPLOYMENT.md` | `angular.json`, `DEPLOYMENT.md` |
| Production frontend env | `src/environments/environment.prod.ts` → `apiUrl` / `siteUrl` | `angular.json` `fileReplacements` |
| Auth | JWT (`jsonwebtoken`) + Google OAuth (`passport-google-oauth20`) + `express-session` | Routes / middleware |
| Media (CMS images) | **Cloudinary** (`cloudinary` SDK) | `backend/services/cloudinary.service.js` |
| Payment receipts | Local disk under `UPLOAD_DIR` or default uploads path | `backend/services/payment.service.js`, `DEPLOYMENT.md` |
| Process manager config | PM2 via root `ecosystem.config.js` (`instances: 1`, fork) | `ecosystem.config.js` |

### Runtime requirements (verified)

- Long-running **Node.js** process for the API (Express).
- **PostgreSQL** reachable via `DATABASE_URL` or discrete `DB_*` vars.
- Persistent disk (or object storage) if payment receipts stay on local disk.
- Cron jobs run **inside** the Node process (`node-cron`) — keep **one** API instance for crons (`ecosystem.config.js` already uses `instances: 1`).
- Optional SMTP / WhatsApp providers for notifications.

---

## 2. Production Server Requirements

| Requirement | Verified / recommendation | Notes |
|-------------|---------------------------|--------|
| Minimum Ubuntu version | **Needs verification** | Not pinned in repo. Ubuntu 22.04 LTS+ is a common choice for Node 18/20/22. |
| cPanel | **Optional** | Project does not require cPanel; Node.js Selector would only apply if hosting via cPanel Node apps. |
| Node.js Selector | **Required only on cPanel-style hosts** | Not required on VPS / Render / Docker. |
| Required Node version | **18.x (Docker) or 20.x/22.x (verified working locally on 22.14.0)** | Prefer aligning Docker + host. `engines` not declared. |
| Required npm version | **Needs verification** | Local audit used **10.9.2**. Prefer npm that ships with the chosen Node LTS. |
| Required PostgreSQL version | **≥ 13 recommended** (uses `gen_random_uuid()`) | Schema also enables **`uuid-ossp`**. Local docs show a PostgreSQL **17** `psql` path example (`DATABASE.md`) — that is an example path, not a hard pin. |
| Required OpenSSL version | **Needs verification** | Bundled with the Node binary / Alpine image; not declared separately. |
| Required PM2 version | **Needs verification** | Repo includes `ecosystem.config.js` but does not pin a PM2 version. Install current PM2 globally on the VPS when using Option B. |

### Memory / process notes (from repo)

- PM2 config: `max_memory_restart: '512M'`, single fork instance (`ecosystem.config.js`).
- Docker healthcheck hits `GET /health` (`backend/Dockerfile`).

---

## 3. Hosting Compatibility

| Host | Compatible? | Limitations (project-specific) |
|------|-------------|-------------------------------|
| **GoDaddy Shared Hosting** | **Poor / not recommended** | Shared PHP hosting typically cannot run long-lived Express + cron + WebSockets/SSE (`/api/events`). No verified GoDaddy shared config in repo. |
| **GoDaddy cPanel Node Hosting** | **Possible with caveats** | Needs Node.js app + persistent process. Crons inside Node may sleep on idle hosts. Local receipt uploads need writable persistent disk. SSE may be limited. **Needs verification** on the specific GoDaddy Node plan. |
| **VPS (Hostinger / DigitalOcean / generic Ubuntu)** | **Yes — first-class** | Matches `ecosystem.config.js` + Docker. Full control of PostgreSQL, PM2, Nginx, SSL. |
| **Render** | **Yes — used by current prod URLs** | `environment.prod.ts` and many verify scripts default to `https://kolkata-scooty-bike-training.onrender.com`. Free/sleeping instances will delay cold starts; disk is ephemeral (receipts). `trust proxy` is set for Render. |
| **Railway** | **Yes (supported in docs)** | Listed in `DEPLOYMENT.md`. Same caveats: attach volume for receipts; set env vars; one instance for crons. |
| **DigitalOcean** | **Yes (App Platform or Droplet)** | Droplet ≈ VPS path. Managed DB recommended. Not hard-coded in app beyond generic VPS. |
| **Hostinger VPS** | **Yes** | `ecosystem.config.js` comment explicitly mentions Hostinger / VPS. |
| **Vercel (frontend)** | **Yes** | `vercel.json` SPA rewrites + headers for `/`, `index.html`, `sw.js`. Current prod `siteUrl` is a Vercel host. |

### Architecture already implied by the repo

- **Frontend:** static SPA (Angular production build) — Vercel or any static host / Nginx.
- **Backend:** Node Express API — Render / Railway / VPS / Docker.
- **Database:** managed or self-hosted PostgreSQL (not SQLite).

---

## 4. Database

### Current database (verified)

| Item | Value |
|------|--------|
| Engine | PostgreSQL |
| Connection | `DATABASE_URL` **or** `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` |
| Driver | `pg` Pool |
| Pool max | `DB_POOL_MAX` (default **10**) |
| SSL in production | Enabled with `{ rejectUnauthorized: false }` when `NODE_ENV=production` (`backend/db.js`) |
| SSL in development | Off unless `DB_SSL=true` |
| Extensions in schema | **`uuid-ossp`** (`database/schema.sql`) |
| UUID generation | Widespread `gen_random_uuid()` defaults (needs PostgreSQL version that provides it — typically **13+**) |
| ORM | None |
| Baseline schema | `database/schema.sql` (greenfield — `DATABASE.md`) |
| Legacy migrations | `backend/apply_migration.js` still references older `supabase/migrations/*.sql` paths; greenfield installs should prefer `database/schema.sql` |

> Neon is referenced in comments (`backend/db.js`, migration script comments). Neon free-tier limits being exceeded is an operational fact you stated; the app itself only needs a standard PostgreSQL URL with SSL.

### Production database options

> **Cost / quotas below are approximate industry offerings and change often — treat pricing as Needs verification on the vendor site before purchase.** Technical fit is based on this app’s needs: SSL, ~10 pool connections per instance, UUID, indexes, backups, cron-driven writes.

| Provider | Typical starting cost | Storage | Connections | Pros for this project | Cons |
|----------|----------------------|---------|-------------|----------------------|------|
| **Supabase PostgreSQL** | Free tier + paid (Needs verification) | Tier-limited | Pooler available | Easy `DATABASE_URL`, SSL, dashboard, backups on paid | Free tier pauses/limits similar risk to Neon |
| **Aiven PostgreSQL** | Paid (Needs verification) | Plan-based | Plan-based | Production-grade, multi-cloud | Cost; overkill for very small traffic |
| **Railway PostgreSQL** | Usage-based (Needs verification) | Plan-based | Plan-based | Same platform as API option; simple URL | Platform coupling; disk/usage billing |
| **Crunchy Bridge** | Paid (Needs verification) | Plan-based | Plan-based | Strong Postgres ops | Higher cost for small apps |
| **DigitalOcean Managed PostgreSQL** | Paid from low monthly (Needs verification) | Plan-based | Plan-based | Pairs well with DO Droplet; automated backups | Separate from Render if API stays on Render |
| **Self-hosted PostgreSQL (VPS)** | VPS cost only | Disk you allocate | You configure (`max_connections`) | Full control; cheapest at scale | You own backups, upgrades, SSL, monitoring |

### Recommendation (for this project)

**Best default:** **DigitalOcean Managed PostgreSQL** *or* **Supabase Pro** (paid) if you want managed backups without running Postgres yourself.

**Best if API stays on a VPS:** **Self-hosted PostgreSQL on the same VPS** (or a second small VPS) with nightly `pg_dump` — lowest cost, full control, matches `DATABASE.md` workflow.

**Avoid relying on free serverless Postgres tiers** for production booking traffic (connection limits, sleep/pause, storage caps) — this app holds sessions, bookings, slots, and cron jobs that expect a always-on DB.

Set `DB_POOL_MAX` conservatively (default 10 is fine for a single API instance).

---

## 5. Environment Variables

Complete list of variables referenced in backend code and/or `backend/.env.example`.  
Copy into production secrets (never commit `.env`).

```bash
# =============================================================================
# Kolkata Scooty Bike Training — production .env.example
# Verified from backend source + backend/.env.example (2026-07-30)
# =============================================================================

NODE_ENV=production

# --- Database (use DATABASE_URL OR individual vars) ---
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
DB_SSL=true
DB_HOST=
DB_PORT=5432
DB_NAME=kolkata_bike_training
DB_USER=
DB_PASSWORD=
DB_POOL_MAX=10

# --- Auth (required in production) ---
JWT_SECRET=
SESSION_SECRET=

# --- Google OAuth (customer sign-in) ---
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://YOUR_API_HOST/api/auth/google/callback

# --- Frontend (CORS + OAuth redirect target) ---
FRONTEND_URL=https://YOUR_FRONTEND_HOST
FRONTEND_URL_PREVIEW=

# --- Server ---
PORT=3000
HOST=0.0.0.0

# --- Cookies ---
# Code checks COOKIE_SECURE === 'true' (string), not '1'
COOKIE_SECURE=true

# --- Cloudinary (required when NODE_ENV=production or REQUIRE_CLOUDINARY=1) ---
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER_ROOT=kolkata-bike-training
REQUIRE_CLOUDINARY=1
GALLERY_IMAGE_MAX_BYTES=5242880
BLOG_IMAGE_MAX_BYTES=5242880
COURSE_IMAGE_MAX_BYTES=5242880
TESTIMONIAL_IMAGE_MAX_BYTES=5242880
BRANCH_IMAGE_MAX_BYTES=5242880
SETTINGS_IMAGE_MAX_BYTES=5242880
TRAINER_IMAGE_MAX_BYTES=5242880
VEHICLE_IMAGE_MAX_BYTES=5242880
IMAGE_MAX_BYTES=5242880
RECEIPT_MAX_BYTES=5242880
UPLOAD_DIR=

# --- Email (optional — nodemailer) ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
ADMIN_ALERT_EMAIL=
PUBLIC_SITE_URL=https://YOUR_FRONTEND_HOST
SITE_URL=https://YOUR_FRONTEND_HOST

# --- WhatsApp (optional) ---
WHATSAPP_PROVIDER=
WHATSAPP_API_KEY=
WHATSAPP_API_URL=
WHATSAPP_AUTH_TOKEN=
WHATSAPP_SOURCE=
WHATSAPP_PHONE_ID=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
ADMIN_PHONE=

# --- Booking / payments / cron ---
BOOKING_WINDOW_HOURS=168
PENDING_PAYMENT_EXPIRE_HOURS=12
DISABLE_INACTIVITY_CRON=
INACTIVITY_CRON=0 2 * * *
INACTIVITY_BLOCK_DAYS=45
DISABLE_AUTO_SLOT_CRON=
AUTO_SLOT_CRON=0 0 * * *
AUTO_SLOT_CRON_TZ=Asia/Kolkata
DISABLE_OVERDUE_BOOKING_CRON=
OVERDUE_BOOKING_CRON=*/30 * * * *
DISABLE_PAYMENT_EXPIRE_CRON=
PAYMENT_EXPIRE_CRON=0 * * * *
DISABLE_AUTO_SLOT_STARTUP=
AUTO_SLOT_STARTUP_DAYS=7
DISABLE_SLOT_CAPACITY_STARTUP=
DISABLE_REACTIVATION_SCHEMA_STARTUP=
DISABLE_OFFLINE_BOOKING_SCHEMA_STARTUP=
ENABLE_LIVE_AUTO_SLOT_FALLBACK=
AVAILABILITY_CACHE_TTL_MS=60000

# --- Admin bootstrap / verify scripts (optional; not required for server start) ---
ADMIN_EMAIL=
ADMIN_PASSWORD=
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
API_BASE=
PRODUCTION_API_URL=
FE_URL=
APPLY_MIGRATION=

# --- Platform metadata (optional; Render injects some automatically) ---
APP_VERSION=
RENDER_EXTERNAL_URL=
RENDER_GIT_COMMIT=
RENDER_GIT_BRANCH=
RENDER_SERVICE_NAME=
GIT_COMMIT=
GIT_BRANCH=

# --- Debug (leave unset / empty in production) ---
LOG_BOOKING_DEBUG=
LOG_RATE_LIMIT_DEBUG=
LOG_SUB_ADMINS_ROUTE=
```

### Notes

| Variable | Note |
|----------|------|
| `AUTO_SLOT_RUN_ON_START` | Present in `backend/.env.example` but **not referenced in `server.js`** at audit time — treat as unused / Needs verification |
| `COOKIE_SECURE=1` in older example | Runtime checks **`=== 'true'`** (`backend/utils/authCookie.js`) — use `true` |
| Frontend | No runtime `.env` — production URLs are baked via `environment.prod.ts` at build time |

### Frontend production file (build-time)

`src/environments/environment.prod.ts` currently contains:

```ts
apiUrl: 'https://kolkata-scooty-bike-training.onrender.com/api'
siteUrl: 'https://kolkata-scooty-bike-training.vercel.app'
```

Update these before building for a new domain.

---

## 6. Dependencies

Latest versions queried from the npm registry on **2026-07-30**.  
**Should Update?** is an engineering judgment for *this* codebase (prefer patch/minor; avoid unplanned majors before production freeze).

### Backend (runtime)

| Package | Locked / installed | Latest stable (npm) | Should update? | Reason |
|---------|--------------------|---------------------|----------------|--------|
| express | 4.21.2 | 5.2.1 | **No (now)** | Major 5.x — breaking risk; stay on 4.x until planned migration |
| pg | 8.16.3 | 8.22.0 | Optional | Compatible minor/patch line |
| helmet | 7.2.0 | 8.3.0 | Optional later | Major 8.x — test CSP/headers |
| multer | 2.2.0 | 2.2.0 | No | Current |
| cloudinary | 2.10.0 | 2.10.0 | No | Current |
| jsonwebtoken | 9.0.2 | 9.0.3 | Optional | Patch |
| bcryptjs | 2.4.3 | 3.0.3 | **No (now)** | Major 3.x |
| cors | 2.8.5 | 2.8.6 | Optional | Patch |
| dotenv | 16.6.1 | 17.4.2 | Optional later | Major 17.x |
| cookie-parser | 1.4.7 | 1.4.7 | No | Current |
| express-session | 1.18.2 | 1.19.0 | Optional | Minor |
| express-validator | 7.3.1 | 7.3.2 | Optional | Patch |
| express-rate-limit | 7.5.1 | 8.6.1 | Optional later | Major 8.x |
| passport | 0.7.0 | 0.7.0 | No | Current |
| passport-google-oauth20 | 2.0.0 | 2.0.0 | No | Current |
| nodemailer | 6.10.1 | 9.0.3 | Optional later | Major jump — test SMTP |
| node-cron | 3.0.3 | 4.6.0 | Optional later | Major 4.x |

### Backend (dev)

| Package | Locked | Latest | Should update? | Reason |
|---------|--------|--------|----------------|--------|
| nodemon | 3.1.10 | Needs verification | Dev-only | Not shipped to production |
| supertest | 6.3.4 | Needs verification | Dev-only | Tests |

### Frontend

| Package | Locked / installed | Latest stable (npm) | Should update? | Reason |
|---------|--------------------|---------------------|----------------|--------|
| @angular/core (and related ^20) | 20.0.0 | 22.1.0 | **No (now)** | Stay on Angular 20 until a planned framework upgrade |
| @angular/cli / @angular/build | 20.0.0 | 22.1.1 (CLI) | **No (now)** | Must match Angular major |
| typescript | 5.8.2 | 7.0.2 | **No (now)** | Angular 20 expects TS 5.8.x line |
| rxjs | 7.8.2 | Needs verification | Optional | Keep within Angular 20 peer range |
| zone.js | 0.15.0 | 0.16.2 | Optional later | Confirm Angular 20 peer deps first |
| d3 | 7.9.0 | 7.9.0 | No | Current |
| tslib | 2.8.1 | Needs verification | Optional | Transitive helper |

### Deprecated / risk notes

- No package in the lockfiles was flagged as **npm-deprecated** during this audit (Needs verification with `npm ls` / `npm outdated` on a clean CI run).
- **Express 5**, **bcryptjs 3**, **nodemailer 9**, **Angular 22** are available but **not** recommended mid-production without a dedicated upgrade sprint.
- Payment receipts still use **local disk** — not Cloudinary (verified in `DEPLOYMENT.md` / payment service).

---

## 7. Build Commands

### Frontend (repo root)

```bash
npm install
npm run build
# → npx ng build --configuration production
# Output: dist/demo (browser assets under dist/demo/browser per DEPLOYMENT.md)
```

Dev server (not for production):

```bash
npm start
# → npx ng serve  (default http://localhost:4200)
```

### Backend (`backend/`)

```bash
cd backend
npm install
# There is NO `npm run build` — plain Node.js
npm start
# → node server.js
```

Docker:

```bash
cd backend
npm run docker:build
# docker build -t biketraining-backend .
npm run docker:run
# docker run -p 3000:3000 --env-file .env biketraining-backend
```

### Database / migrations

**Greenfield (recommended):**

```bash
createdb kolkata_bike_training
psql -U postgres -d kolkata_bike_training -f database/schema.sql
```

**Admin user:**

```bash
cd backend
node create_admin.js 'you@example.com' 'StrongPasswordHere'
# or ADMIN_EMAIL / ADMIN_PASSWORD env vars
```

**Legacy / incremental SQL via Node:**

```bash
cd backend
npm run migrate
# → node apply_migration.js [optional/path.sql]
```

**Bash helper (legacy path):**

```bash
./apply_postgresql_migration.sh
```

### Verification scripts (optional)

```bash
cd backend
npm run validate
npm run verify:production
npm run test:scheduling
```

---

## 8. Production Checklist

- [ ] `NODE_ENV=production`
- [ ] Strong unique `JWT_SECRET` and `SESSION_SECRET`
- [ ] `DATABASE_URL` (SSL) tested; backups scheduled
- [ ] `database/schema.sql` applied (or verified existing schema)
- [ ] Admin created via `create_admin.js`
- [ ] Cloudinary credentials set; `REQUIRE_CLOUDINARY=1` or production gate passes
- [ ] Google OAuth client + **exact** `GOOGLE_CALLBACK_URL`
- [ ] `FRONTEND_URL` matches SPA origin (scheme + host, no trailing slash mismatch)
- [ ] `environment.prod.ts` `apiUrl` / `siteUrl` updated before frontend build
- [ ] CORS smoke-test from the real frontend origin
- [ ] `COOKIE_SECURE=true` on HTTPS
- [ ] Helmet enabled (already `app.use(helmet())`)
- [ ] Rate limiters active (already wired in `server.js`)
- [ ] Persistent volume for receipt uploads **or** migrate receipts off local disk
- [ ] Single API instance for crons (PM2 `instances: 1`) **or** disable crons on replicas
- [ ] PM2 / process supervisor + log rotation (`ecosystem.config.js` log paths)
- [ ] `GET /health` returns 200
- [ ] `GET /api/version` inspected after deploy
- [ ] TLS/SSL at reverse proxy or platform edge
- [ ] `robots.txt` and `sitemap.xml` present in Angular assets (`angular.json`)
- [ ] Production Angular build (`optimization: true`, `outputHashing: all`)
- [ ] Error handling middleware active; no `LOG_BOOKING_DEBUG` in prod
- [ ] Compression middleware — **not present in codebase** (see Security / Performance)
- [ ] Email / WhatsApp secrets only if those channels are used

---

## 9. Security Audit

### Verified positives

| Control | Status |
|---------|--------|
| Helmet | Enabled (`backend/server.js`) |
| CORS allowlist | `FRONTEND_URL`, preview, localhost, specific Vercel suffix |
| Rate limiting | `express-rate-limit` via `middleware/rateLimiters.js` |
| Input validation | `express-validator` on many routes |
| Passwords | `bcryptjs` |
| JWT auth | `middleware/auth.js` fails closed without `JWT_SECRET` in production |
| SQL | Parameterized queries via `pg` (`$1` style) in services/routes |
| Upload size limits | Multer + `*_MAX_BYTES` / Cloudinary MIME checks |
| Trust proxy | `app.set('trust proxy', 1)` for Render / reverse proxies |
| Docker non-root user | `nodejs` uid 1001 in Dockerfile |

### Issues / improvements

| Finding | Severity | Improvement |
|---------|----------|-------------|
| Production SSL uses `rejectUnauthorized: false` | Medium | Prefer proper CA validation with provider certs where possible |
| No `compression` package / middleware | Low | Add `compression` behind Nginx or in Express |
| Session store is default MemoryStore | Medium | Use Redis/DB session store for multi-instance (currently single instance) |
| Local disk payment receipts | Medium | Move to Cloudinary/S3 for multi-node deploys |
| Debug env flags exist | Low | Ensure unset in prod (`LOG_BOOKING_DEBUG`, etc.) |
| Hardcoded fallback frontend URL in auth redirects | Low | Always set `FRONTEND_URL` so fallbacks are unused |
| WhatsApp default source number placeholder in code | Low | Set `WHATSAPP_SOURCE` / disable provider if unused |
| `COOKIE_SECURE=1` vs `true` mismatch risk | Medium | Documented above — use `true` |
| Console logging on startup / CORS blocks | Low | Prefer structured logger in production |
| XSS | Frontend Angular escaping helps; still sanitize any `innerHTML` / CMS HTML if introduced | Audit templates that bind HTML |
| SQL injection | Parameterized queries are the norm; review any string-concatenated SQL if added later | Keep using bind params |
| Secrets in repo | `.env` should stay gitignored; rotate any secrets ever pasted into chat/logs | Operational |

---

## 10. Performance

| Area | Verified status | Notes |
|------|-----------------|-------|
| Angular production build | `optimization: true`, `aot: true`, `outputHashing: all`, `namedChunks: false`, `sourceMap: false` | `angular.json` production config |
| Lazy loading | **Yes** — routes use `loadComponent` | `src/app/app.routes.ts` |
| Budgets | Initial warn 3mb / error 5mb; component style warn 48kb / error 96kb | `angular.json` |
| Images | Cloudinary HTTPS for CMS; service worker excludes `/api` and `/media` (newer SW) | Prefer Cloudinary transforms for thumbs (Needs verification if transforms used) |
| API caching | In-memory availability cache TTL (`AVAILABILITY_CACHE_TTL_MS`, default 60s) | Not a CDN cache |
| HTTP compression | **Not implemented** in Express | Terminate gzip at Nginx/CDN |
| Database indexes | Many btree indexes in `database/schema.sql` | Keep using schema baseline |
| Query optimization | No ORM N+1 layer; still review hot booking/admin list queries under load | Needs verification with EXPLAIN under production data |
| SSE `/api/events` | Keep-alive every 25s | Reverse proxies must allow long-lived connections |
| Multi-instance | Crons + memory session + local uploads break horizontal scale | Stay on 1 API instance unless redesigned |

---

## 11. Deployment Steps

### Option A — GoDaddy cPanel with Node.js

> Compatibility is limited. Use only if the plan provides a persistent Node.js application, writable disk, and outbound SSL to PostgreSQL/Cloudinary.

1. Provision PostgreSQL (external managed DB recommended — shared MySQL will **not** work).
2. Apply schema:
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   ```
3. In cPanel **Setup Node.js App**:
   - Application root: `backend`
   - Application startup file: `server.js`
   - Node version: **18.x or 20.x** (Needs verification against cPanel selector list)
4. Set environment variables from Section 5 (at minimum `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `FRONTEND_URL`, Cloudinary, Google OAuth).
5. SSH or Terminal:
   ```bash
   cd ~/path/to/backend
   npm install --omit=dev
   node create_admin.js 'admin@example.com' 'StrongPassword'
   ```
6. Restart the Node application in cPanel.
7. Confirm:
   ```bash
   curl -sS https://YOUR_API_HOST/health
   ```
8. Build frontend elsewhere (Vercel or local) and point `environment.prod.ts` `apiUrl` at the cPanel API URL.
9. **Limitations:** process sleep, no Docker, weak SSE support, ephemeral disk — **Needs verification** on the specific plan.

---

### Option B — Ubuntu VPS (recommended for full control)

```bash
# 1) System packages (example — package names Need verification per Ubuntu release)
sudo apt update
sudo apt install -y nginx git build-essential
# Install Node 20 LTS via NodeSource or nvm (Needs verification of current NodeSource instructions)
# Install PostgreSQL 16/17 OR use managed Postgres URL

# 2) App user + code
sudo adduser --disabled-password --gecos "" kolkata
sudo su - kolkata
git clone <YOUR_REPO_URL> kolkata_bike_training
cd kolkata_bike_training

# 3) Database (self-hosted example)
# sudo -u postgres createdb kolkata_bike_training
# sudo -u postgres psql -d kolkata_bike_training -f database/schema.sql
# OR set DATABASE_URL to managed Postgres and:
psql "$DATABASE_URL" -f database/schema.sql

# 4) Backend
cd backend
cp .env.example .env
nano .env   # fill Section 5
npm install --omit=dev
node create_admin.js 'admin@example.com' 'StrongPassword'
cd ..

# 5) PM2
sudo npm install -g pm2   # version Needs verification
mkdir -p backend/logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# follow the printed systemd command

# 6) Nginx reverse proxy (TLS via certbot — Needs verification)
# proxy_pass http://127.0.0.1:3000;
# location support for /api/events SSE (proxy buffering off)

# 7) Frontend build (on CI or same VPS)
npm install
# edit src/environments/environment.prod.ts
npm run build
# serve dist/demo/browser with Nginx root OR deploy to Vercel

# 8) Health check
curl -sS http://127.0.0.1:3000/health
curl -sS https://YOUR_API_HOST/health
```

Docker alternative on VPS:

```bash
cd backend
docker build -t biketraining-backend .
docker run -d --name kolkata-api -p 3000:3000 --env-file .env \
  -v kolkata_uploads:/app/uploads biketraining-backend
```

---

### Option C — Render (matches current production URLs in repo)

**Database**

1. Create a PostgreSQL instance (Render Postgres or external).
2. Apply `database/schema.sql` using `psql` against the Render `DATABASE_URL`.

**Backend Web Service**

1. New Web Service → repo → root directory **`backend`**.
2. Runtime: **Node**.
3. Build command: `npm install --omit=dev`
4. Start command: `node server.js` (or `npm start`)
5. Set env vars from Section 5.
6. Health check path: `/health`
7. Create admin once (Render shell):
   ```bash
   node create_admin.js 'admin@example.com' 'StrongPassword'
   ```
8. Attach a **persistent disk** mounted where `UPLOAD_DIR` points if you keep local receipts.

**Frontend (Vercel — already configured)**

1. Import repo; framework preset Angular / static.
2. Build: `npm run build`
3. Output directory: `dist/demo/browser`
4. Ensure `vercel.json` is used.
5. Update `environment.prod.ts` if API host changes; redeploy.

**Google OAuth**

- Authorized redirect URI = `https://<render-host>/api/auth/google/callback` (`GOOGLE_CALLBACK_URL`).

---

## 12. Final Recommendation

| Choice | Recommendation | Why (verified) |
|--------|----------------|----------------|
| **Best Node version** | **Node 20 LTS** (or stay on **18** to match Dockerfile until you bump the image) | Dockerfile pins 18; local success on 22 proves newer works, but production should pick one LTS and align Docker + host. Declare `engines` after choosing. |
| **Best PostgreSQL version** | **16 or 17** | Schema uses `gen_random_uuid()` + `uuid-ossp`; `DATABASE.md` already demonstrates a PG17 client path. Any **13+** with the extension should work — Needs verification of exact minimum against a fresh `schema.sql` apply. |
| **Best hosting** | **Frontend: Vercel** + **Backend: Ubuntu VPS (Hostinger/DO) with PM2** *or* **Render** if you want managed deploys | Repo already ships `vercel.json`, Render URLs, and `ecosystem.config.js` for VPS. |
| **Best database** | **Managed Postgres (DigitalOcean / Supabase paid / Aiven)** or **self-hosted on VPS** | Avoid free-tier pause/limit platforms for booking + cron workloads. |
| **Best production architecture** | Static SPA → HTTPS → Express API (1 instance) → Managed/self Postgres; Cloudinary for CMS images; volume for receipts **or** move receipts to object storage; Nginx/TLS in front of API | Matches code constraints: MemoryStore sessions, in-process crons, local receipt files, SSE. |

### Suggested target topology

```text
[Browser]
   │
   ├─ HTTPS ─► Vercel (Angular dist/demo/browser)
   │
   └─ HTTPS ─► Nginx / Render edge ─► Node Express (PM2 or Render, 1 instance)
                                      │
                                      ├─ PostgreSQL (managed or VPS)
                                      ├─ Cloudinary (CMS images)
                                      └─ Disk / object storage (payment receipts)
```

---

## Appendix — Quick verification commands

```bash
# API alive
curl -sS https://YOUR_API_HOST/health

# Deploy metadata
curl -sS https://YOUR_API_HOST/api/version

# Frontend build
npm run build && ls dist/demo/browser

# Backend syntax check
cd backend && npm run validate
```

---

*End of DEPLOYMENT_REQUIREMENTS.md*
