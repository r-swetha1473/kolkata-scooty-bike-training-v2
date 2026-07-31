# Changelog

## 2026-07-27

- Consolidated database setup to a single baseline: `database/schema.sql`
- Removed incremental `supabase/migrations` from the greenfield install path
- Removed development/phase/sprint/audit markdown reports
- Essential docs: README, INSTALL, DATABASE, API, DEPLOYMENT, CHANGELOG
- Fixed `tsconfig.json` `rootDir` for TypeScript tooling
- Raised Angular initial bundle budget so static assets (brand/media) emit correctly
- Branding assets and local optimized media under `public/media/`
