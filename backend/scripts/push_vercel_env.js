/**
 * Push selected backend/.env keys to a Vercel project (production).
 * Usage: node scripts/push_vercel_env.js <project-name>
 * Does not print secret values.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const project = process.argv[2];
if (!project) {
  console.error('Usage: node scripts/push_vercel_env.js <project-name>');
  process.exit(1);
}

const envPath = path.join(__dirname, '..', '.env');
const raw = fs.readFileSync(envPath, 'utf8');
const map = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  let v = line.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  map[k] = v;
}

const keys = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_FOLDER_ROOT',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'ADMIN_ALERT_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
];

const forced = {
  NODE_ENV: 'production',
  COOKIE_SECURE: 'true',
  DB_POOL_MAX: '3',
  REQUIRE_CLOUDINARY: '1',
};

function setEnv(key, value) {
  if (value === undefined || value === '') {
    console.log('SKIP', key, '(empty)');
    return;
  }
  // Remove existing production value if present (ignore errors)
  spawnSync(
    'npx',
    ['vercel', 'env', 'rm', key, 'production', '--yes', '--project', project],
    { encoding: 'utf8', shell: true }
  );
  const r = spawnSync(
    'npx',
    ['vercel', 'env', 'add', key, 'production', '--project', project, '--force'],
    {
      input: value + '\n',
      encoding: 'utf8',
      shell: true,
    }
  );
  if (r.status !== 0) {
    console.error('FAIL', key, (r.stderr || r.stdout || '').slice(0, 200));
  } else {
    console.log('SET', key);
  }
}

for (const [k, v] of Object.entries(forced)) setEnv(k, v);
for (const k of keys) {
  if (Object.prototype.hasOwnProperty.call(forced, k)) continue;
  setEnv(k, map[k]);
}

console.log('DONE_ENV_PUSH');
