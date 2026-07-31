/**
 * One-time: align thumbnail/banner/mobile with primary image_url for Cloudinary courses.
 */
require('dotenv').config();
const db = require('../db');

async function main() {
  const r = await db.query(`
    UPDATE courses
    SET
      thumbnail_url = image_url,
      banner_image_url = image_url,
      mobile_image_url = image_url,
      updated_at = NOW()
    WHERE image_url IS NOT NULL
      AND image_url LIKE 'https://res.cloudinary.com/%'
      AND (
        COALESCE(thumbnail_url, '') IS DISTINCT FROM image_url
        OR COALESCE(banner_image_url, '') IS DISTINCT FROM image_url
        OR COALESCE(mobile_image_url, '') IS DISTINCT FROM image_url
      )
    RETURNING name, slug, image_url, thumbnail_url
  `);
  console.log(`synced ${r.rowCount} course(s)`);
  console.log(JSON.stringify(r.rows, null, 2));
  await db.pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
