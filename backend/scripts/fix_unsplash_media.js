/**
 * One-off: replace broken Unsplash CMS image URLs with local /media assets.
 */
require('dotenv').config();
const db = require('../db');

const BLOG_MAP = [
  ['Scooty vs Bike Training: Which Should You Choose?', '/media/blogs/scooty-vs-motorcycle-beginners-card.webp'],
  ['How Long Does It Take to Learn Scooty Riding?', '/media/blogs/how-long-learn-bike-riding-card.webp'],
  ['Why Every Woman Should Learn Two-Wheeler Riding', '/media/blogs/women-can-learn-scooty-easily-card.webp'],
  ['How to Ride Safely in Kolkata Traffic: A Complete Guide', '/media/blogs/how-to-ride-in-kolkata-traffic-card.webp'],
  ['Traffic Rules Every Two-Wheeler Rider Should Know', '/media/blogs/traffic-rules-every-rider-card.webp'],
  ['Common Beginner Riding Mistakes and How to Avoid Them', '/media/blogs/10-beginner-riding-mistakes-card.webp']
];

(async () => {
  for (const [title, url] of BLOG_MAP) {
    const r = await db.query(
      'UPDATE blog_posts SET featured_image_url = $1 WHERE title = $2 RETURNING id',
      [url, title]
    );
    console.log(title, r.rowCount ? 'updated' : 'skip');
  }

  const br = await db.query(
    `UPDATE branches SET image_url = '/media/gallery/branch-photos-card.webp'
     WHERE image_url ILIKE '%unsplash%'`
  );
  console.log('branches updated', br.rowCount);

  const left = await db.query(
    `SELECT 'blog' AS kind, title AS label, featured_image_url AS url FROM blog_posts WHERE featured_image_url ILIKE '%unsplash%'
     UNION ALL
     SELECT 'branch', name, image_url FROM branches WHERE image_url ILIKE '%unsplash%'`
  );
  console.log('remaining unsplash rows', left.rows.length);
  await db.pool.end();
})().catch(async (e) => {
  console.error(e);
  try { await db.pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
