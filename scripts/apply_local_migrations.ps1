# Apply baseline schema for a fresh LOCAL PostgreSQL database (Windows).
# Usage (from repo root):
#   .\scripts\apply_local_migrations.ps1
#
# Prefer: psql -f database/schema.sql (see DATABASE.md)

param(
  [string]$DbHost = "127.0.0.1",
  [string]$DbPort = "5432",
  [string]$DbName = "kolkata_bike_training",
  [string]$DbUser = "postgres"
)

$ErrorActionPreference = "Stop"
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $psql)) {
  $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($psqlCmd) { $psql = $psqlCmd.Source } else { throw "psql not found" }
}

$root = Split-Path -Parent $PSScriptRoot
$schema = Join-Path $root "database\schema.sql"
if (-not (Test-Path $schema)) { throw "Missing $schema" }

Write-Host "Applying database/schema.sql to $DbName ..."
& $psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -v ON_ERROR_STOP=1 -f $schema
if ($LASTEXITCODE -ne 0) { throw "schema.sql failed" }
Write-Host "Done. Create an admin with: cd backend; node create_admin.js <email> <password>"
