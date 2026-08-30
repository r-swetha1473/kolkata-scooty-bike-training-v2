# Vercel + Supabase Deployment Guide

Two separate Vercel projects from the same GitHub repo  
`https://github.com/r-swetha1473/kolkata-scooty-bike-training-v2`

Supabase project ID: `vviwodymmdhmoljucbht`

---

## Architecture

| Layer | Host | Root Directory |
|-------|------|----------------|
| Frontend (Angular 20) | Vercel project A | **`.`** (repo root — there is no `frontend/` folder) |
| Backend (Express) | Vercel project B | **`backend`** |
| Database | Supabase PostgreSQL | — |
| CMS images | Cloudinary | — |

---

## Incompatible on Vercel (not rewritten)

These keep working on PM2 / Docker / Render, but are **skipped or unreliable** when `VERCEL=1`:

| Feature | Why |
|---------|-----|
| `node-cron` jobs (slots, payment expire, inactivity, overdue) | No long-lived process |
| Startup slot/capacity/schema jobs | Same |
| SSE `/api/events` | No reliable long-lived connections |
| Local-disk payment receipts | Ephemeral filesystem |

CMS image uploads via **Cloudinary** remain supported.

---

## Frontend — Vercel project settings

| Setting | Value |
|---------|--------|
| Root Directory | *(leave empty / `.`)* |
| Framework Preset | Angular (or Other) |
| Build Command | `npm run build` |
| Output Directory | `dist/demo/browser` |
| Install Command | `npm install` |
| Node.js Version | **20.x** recommended |

SPA refresh routing is already handled by root [`vercel.json`](vercel.json).

Update [`src/environments/environment.prod.ts`](src/environments/environment.prod.ts) so `apiUrl` matches your **Backend** Vercel URL + `/api`, then redeploy the frontend.

---

## Backend — Vercel project settings

| Setting | Value |
|---------|--------|
| Root Directory | `backend` |
| Framework Preset | Other |
| Build Command | *(empty)* or `npm install` |
| Output Directory | *(n/a — serverless)* |
| Install Command | `npm install` |
| Node.js Version | **20.x** recommended |

Entry: [`backend/api/index.js`](backend/api/index.js) → Express app from [`backend/server.js`](backend/server.js).  
Config: [`backend/vercel.json`](backend/vercel.json).

---

## Backend environment variables (Vercel → Project → Settings → Environment Variables)

### Required

```
NODE_ENV=production
DATABASE_URL=<Supabase transaction pooler URI, sslmode=require>
JWT_SECRET=<long random secret>
SESSION_SECRET=<long random secret>
FRONTEND_URL=https://<your-frontend>.vercel.app
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
REQUIRE_CLOUDINARY=1
COOKIE_SECURE=true
DB_POOL_MAX=3
```

### If using Google OAuth

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://<your-api>.vercel.app/api/auth/google/callback
```

Also add that callback URL in Google Cloud Console → OAuth client → Authorized redirect URIs.

### Optional

```
FRONTEND_URL_PREVIEW=
CLOUDINARY_FOLDER_ROOT=kolkata-bike-training
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
ADMIN_ALERT_EMAIL=
```

**Never commit** real values. Use Supabase Dashboard + Vercel env UI only.

---

## Supabase database setup

1. Open project `vviwodymmdhmoljucbht` → **Settings → Database**.
2. Copy the **URI** (prefer **Transaction** pooler on port **6543** for Vercel).
3. Apply schema once (from a trusted machine):

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

4. Create an admin (once):

```bash
cd backend
# temporarily set DATABASE_URL in your local .env pointing at Supabase
node create_admin.js 'you@example.com' 'StrongPassword'
```

---

## Deploy order

1. Create **Backend** Vercel project (`Root Directory = backend`), set env vars, deploy.
2. Confirm `GET https://<api>/health` returns `{ "status": "ok", ... }`.
3. Set frontend `environment.prod.ts` `apiUrl` to `https://<api>/api`.
4. Create **Frontend** Vercel project (root `.`), deploy.
5. Set backend `FRONTEND_URL` to the frontend origin; redeploy backend.
6. Smoke-test login, admin, Cloudinary upload, booking create.

---

## Local verification commands

```bash
# Frontend production build
npm run build

# Backend syntax
cd backend && npm run validate

# DB connectivity (uses local backend/.env DATABASE_URL — do not print secrets)
cd backend && node -e "require('dotenv').config(); const db=require('./db'); db.query('select 1 as ok').then(r=>{console.log('DB_OK', r.rows[0]); return db.pool.end();}).catch(e=>{console.error('DB_FAIL', e.message); process.exit(1);})"
```

---

## Production checklist

- [ ] Schema applied on Supabase
- [ ] Admin user created
- [ ] Backend env vars set on Vercel
- [ ] `GET /health` OK
- [ ] Frontend `apiUrl` points at backend `/api`
- [ ] `FRONTEND_URL` matches frontend origin
- [ ] Cloudinary uploads work from Admin
- [ ] JWT login / Google OAuth (if enabled)
- [ ] Booking create works
- [ ] Admin dashboard loads
- [ ] Plan follow-up for crons (external scheduler) if auto slot generation is required on Vercel-only hosting

---

## Phase 7 – Final readiness report

### Deployment readiness score: **75%**

| Area | Status |
|------|--------|
| Repo prepared for two Vercel projects | Done |
| Express serverless export | Done |
| Angular production build | Verified locally |
| Supabase schema applied + Vercel env secrets | **Manual — remaining** |
| Live production smoke (auth/booking/upload) | **Manual after deploy** |

### Issues fixed (code)

- Express could not run on Vercel (`app.listen` + crons) → exported app; listen/crons only when `!VERCEL`
- Serverless DB connection pressure → default `DB_POOL_MAX=3` on Vercel
- Cross-site FE/API cookies → session `sameSite: 'none'` in production
- CORS for v2 frontend host suffix
- Placeholder production FE/API URLs in `environment.prod.ts`

### Files modified / added

| File | Change |
|------|--------|
| `backend/server.js` | Export app; gate listen/cron/startup; CORS v2; session sameSite |
| `backend/api/index.js` | **Added** — Vercel entry |
| `backend/vercel.json` | **Added** — rewrites + function config |
| `backend/db.js` | Vercel pool default; no `process.exit` on idle errors under Vercel |
| `backend/.env.example` | Supabase pooler notes |
| `src/environments/environment.prod.ts` | Vercel placeholder URLs |
| `VERCEL_DEPLOY.md` | **Added** — this guide |
| Root `vercel.json` | Unchanged (SPA rewrites already correct) |

### Remaining manual steps

1. Apply `database/schema.sql` to Supabase project `vviwodymmdhmoljucbht`
2. Create admin via `node create_admin.js`
3. Create Vercel Backend project (root `backend`) + env vars → deploy → check `/health`
4. Set real `apiUrl` in `environment.prod.ts` → commit/redeploy Frontend (root `.`)
5. Set `FRONTEND_URL` on Backend; Google OAuth callback if used
6. Smoke-test auth, admin, Cloudinary upload, booking

### Build / output summary

| Project | Root | Build | Output |
|---------|------|-------|--------|
| Frontend | `.` | `npm run build` | `dist/demo/browser` |
| Backend | `backend` | *(none / install only)* | Serverless `api/index.js` |
