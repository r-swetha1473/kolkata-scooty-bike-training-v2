# Database

Fresh installs use **one** baseline SQL file. Incremental `supabase/migrations` files are no longer required for greenfield setup.

## Schema file

```
database/schema.sql
```

Includes:

- Extensions (`uuid-ossp`)
- All tables, indexes, foreign keys, constraints
- Functions / triggers (if present in the live schema)
- Essential seed: settings, courses, branches, vehicles

## Create database from scratch

```bash
createdb kolkata_bike_training
psql -U postgres -d kolkata_bike_training -f database/schema.sql
```

Windows (PowerShell), with `psql` on PATH or full PostgreSQL bin path:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d kolkata_bike_training -v ON_ERROR_STOP=1 -f database\schema.sql
```

## Verify

```sql
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- expect ~33 tables

SELECT count(*) FROM settings;
SELECT count(*) FROM courses;
SELECT count(*) FROM branches;
```

## Admin bootstrap

Schema does not create a login user. After apply:

```bash
cd backend
node create_admin.js you@example.com 'YourPassword'
```

## Regenerating the baseline (maintainers)

From a known-good local database:

```bash
node scripts/export_baseline_schema.js
node scripts/verify_baseline_schema.js
```

## Notes

- The dump uses `DROP … IF EXISTS` before create so it can re-apply on a partially created DB.
- Seed inserts temporarily use `session_replication_role = replica` to avoid profile FK noise on settings rows; `updated_by` is then cleared.
- Do not point production at a disposable test database name.
