# Kolkata Scooty Bike Training

Production booking platform for scooty and bike training in Kolkata: multi-branch slots, trainers, vehicles, payments, and staff admin tools.

## Documentation

| Doc | Description |
|-----|-------------|
| [INSTALL.md](INSTALL.md) | Local setup |
| [DATABASE.md](DATABASE.md) | Single-schema database setup |
| [API.md](API.md) | Backend API overview |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deploy |
| [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) | Vercel + Supabase two-project deploy |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes |

## Quick start

```bash
# 1) Database
createdb kolkata_bike_training
psql -U postgres -d kolkata_bike_training -f database/schema.sql

# 2) Backend
cd backend
cp .env.example .env   # edit DB + secrets
npm install
npm start              # http://localhost:3000

# 3) Frontend (repo root)
npm install
npm start              # http://localhost:4200
```

Create an admin: `cd backend && node create_admin.js you@example.com 'YourPassword'`

Point `src/environments/environment.ts` `apiUrl` at `http://localhost:3000/api`.

## Tech stack

Angular 20 · Express · PostgreSQL · JWT + Google OAuth

## License

Use according to your organization’s policy.
