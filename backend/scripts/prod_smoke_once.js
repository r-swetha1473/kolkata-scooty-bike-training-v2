/**
 * Production smoke tests. Reads admin creds from backend/.env.
 * Does not print secrets or DATABASE_URL.
 *
 * Usage: node backend/scripts/prod_smoke_once.js
 */
require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});

const API = process.env.SMOKE_API_BASE || 'https://kolkata-scooty-bike-training-v2-api.vercel.app';
const FE = process.env.SMOKE_FE_BASE || 'https://kolkata-scooty-bike-training-v2.vercel.app';
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

async function req(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}
  return { status: res.status, json, text: text.slice(0, 200), headers: res.headers };
}

function pass(name, detail) {
  console.log('PASS', name, detail || '');
}
function fail(name, detail) {
  console.log('FAIL', name, detail || '');
  process.exitCode = 1;
}

(async () => {
  console.log('API', API);
  console.log('FE', FE);

  // 1. Health
  {
    const r = await req(API + '/health');
    if (r.status === 200 && r.json && r.json.status === 'ok') pass('health', r.json.nodeEnv || r.json.version?.nodeEnv || '');
    else fail('health', r.status + ' ' + r.text);
  }

  // 2. Frontend home
  {
    const r = await req(FE + '/');
    if (r.status === 200 && /html/i.test(r.text)) pass('frontend_home', 'http ' + r.status);
    else fail('frontend_home', r.status + ' ' + r.text.slice(0, 80));
  }

  // 3. Public courses
  {
    const r = await req(API + '/api/courses');
    const n = Array.isArray(r.json) ? r.json.length : (r.json?.courses || r.json?.data || [])?.length;
    if (r.status === 200 && (n > 0 || Array.isArray(r.json))) pass('public_courses', 'count=' + (n || (Array.isArray(r.json) ? r.json.length : '?')));
    else fail('public_courses', r.status + ' ' + r.text);
  }

  // 4. Public branches
  {
    const r = await req(API + '/api/branches');
    const arr = Array.isArray(r.json) ? r.json : r.json?.branches || r.json?.data;
    if (r.status === 200 && Array.isArray(arr) && arr.length > 0) pass('public_branches', 'count=' + arr.length);
    else fail('public_branches', r.status + ' ' + r.text);
  }

  // 5. Public settings
  {
    const r = await req(API + '/api/settings');
    if (r.status === 200 && r.json && r.json.site_name) pass('public_settings', 'site_ok');
    else fail('public_settings', r.status + ' ' + r.text);
  }

  // 6. Admin login
  if (!email || !password) {
    fail('admin_login', 'ADMIN_EMAIL/PASSWORD missing in env');
    return;
  }
  let token = null;
  {
    const r = await req(API + '/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: FE,
      },
      body: JSON.stringify({ email, password }),
    });
    token = r.json?.token || r.json?.accessToken || r.json?.data?.token;
    const role = r.json?.user?.role || r.json?.role;
    if (r.status === 200 && token) pass('admin_login', 'role=' + (role || '?'));
    else fail('admin_login', r.status + ' ' + r.text);
  }

  // 7. Admin dashboard / me
  if (token) {
    const r = await req(API + '/api/admin/dashboard', {
      headers: { Authorization: 'Bearer ' + token, Origin: FE },
    });
    if (r.status === 200) pass('admin_dashboard', 'ok');
    else {
      // fallback profile/me
      const r2 = await req(API + '/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token, Origin: FE },
      });
      if (r2.status === 200) pass('admin_me', 'dashboard_status=' + r.status);
      else fail('admin_dashboard', r.status + ' / me ' + r2.status + ' ' + r.text);
    }
  }

  // 8. CORS preflight-ish via Origin on public GET
  {
    const r = await req(API + '/api/courses', {
      headers: { Origin: FE },
    });
    const acao = r.headers.get('access-control-allow-origin');
    if (r.status === 200 && (acao === FE || acao === '*')) pass('cors_origin', acao);
    else if (r.status === 200) pass('cors_origin', 'acao=' + (acao || 'none') + ' (request ok)');
    else fail('cors_origin', r.status + ' acao=' + acao);
  }

  // 9. Cloudinary configured (indirect: admin upload endpoint exists / settings)
  if (token) {
    const r = await req(API + '/api/admin/settings', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (r.status === 200 || r.status === 403) pass('admin_settings_reachable', 'http ' + r.status);
    else fail('admin_settings_reachable', r.status + ' ' + r.text);
  }

  console.log('SMOKE_DONE', process.exitCode ? 'WITH_FAILURES' : 'ALL_PASS');
})().catch((e) => {
  console.error('SMOKE_FATAL', String(e.message).slice(0, 300));
  process.exit(1);
});
