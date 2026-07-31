# Deployment

## Frontend (Vercel)

1. Build: `npm run build`
2. Output: `dist/demo/browser`
3. SPA rewrites: repo `vercel.json`
4. Set `src/environments/environment.prod.ts` `apiUrl` to the live API

## Backend (Render / Railway / VPS / Docker)

1. Copy `backend/.env.example` → production secrets
2. `NODE_ENV=production`
3. Apply `database/schema.sql` once to an empty PostgreSQL database
4. Start: `node server.js` from `backend/`
5. Docker: `cd backend && docker build -t biketraining-backend .`
6. Health: `GET /health`

### Uploads

Receipts and images use local disk (`uploads/` or `UPLOAD_DIR`). Attach a persistent volume (or object storage) before horizontal scaling.

### Cron jobs

Controlled by `DISABLE_*_CRON` env vars. Run crons on a single instance only.

## PM2

Root `ecosystem.config.js` runs the backend with `cwd: ./backend`.

## CORS

`FRONTEND_URL` must match the SPA origin exactly (scheme + host + port).
