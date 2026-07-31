# Installation

## Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+ (17 recommended)
- Google OAuth client (customer sign-in)

## 1. Install dependencies

```bash
# Frontend (repo root)
npm install

# Backend
cd backend
npm install
```

## 2. Database

See [DATABASE.md](DATABASE.md).

```bash
createdb kolkata_bike_training
psql -U postgres -d kolkata_bike_training -f database/schema.sql
```

## 3. Backend environment

```bash
cd backend
cp .env.example .env
```

Set at least:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (or `DATABASE_URL`)
- `JWT_SECRET`, `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `FRONTEND_URL=http://localhost:4200`

```bash
npm start
```

API: `http://localhost:3000` — health check `GET /health`.

## 4. Frontend

Edit `src/environments/environment.ts`:

```ts
apiUrl: 'http://localhost:3000/api'
```

```bash
# repo root
npm start
```

App: `http://localhost:4200`

## 5. Admin user

```bash
cd backend
node create_admin.js admin@example.com 'StrongPassword123'
```

Then sign in at `/admin/login`.

## 6. Verify

- Public home loads
- `GET /health` → `{ "status": "ok" }`
- Admin login works
- Customer Google OAuth round-trip (when configured)
