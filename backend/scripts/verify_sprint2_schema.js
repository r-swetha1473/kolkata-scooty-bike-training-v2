/**
 * Schema verification for Sprint 2 CMS + coupons tables / permission modules.
 * Usage: node backend/scripts/verify_sprint2_schema.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

async function tableExists(table) {
  const r = await db.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return r.rows.length > 0;
}

async function columnExists(table, column) {
  const r = await db.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function main() {
  const tables = ['gallery_items', 'testimonials', 'blog_posts', 'coupons'];
  const columns = [
    ['gallery_items', 'image_url'],
    ['testimonials', 'customer_name'],
    ['blog_posts', 'slug'],
    ['coupons', 'code'],
    ['coupons', 'discount_type'],
    ['coupons', 'used_count']
  ];
  const missing = [];

  for (const t of tables) {
    if (!(await tableExists(t))) missing.push(`table ${t}`);
  }
  for (const [table, column] of columns) {
    if (!(await columnExists(table, column))) missing.push(`${table}.${column}`);
  }

  const moduleCheck = await db.query(`
    SELECT pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'sub_admin_permissions' AND con.contype = 'c'
  `);
  const defs = moduleCheck.rows.map((r) => r.def || '').join(' ');
  for (const mod of ['gallery', 'testimonials', 'blogs', 'coupons']) {
    if (!defs.includes(mod)) {
      missing.push(`sub_admin_permissions.module CHECK missing ${mod}`);
    }
  }

  if (missing.length) {
    console.error('[verify_sprint2_schema] FAIL — missing:');
    missing.forEach((m) => console.error('  -', m));
    console.error('Apply supabase/migrations/20260727140000_sprint2_cms_coupons.sql');
    process.exit(1);
  }

  console.log('[verify_sprint2_schema] OK — gallery/testimonials/blogs/coupons present');
  process.exit(0);
}

main().catch((err) => {
  console.error('[verify_sprint2_schema] ERROR', err.message);
  process.exit(1);
});
