/**
 * Generate brand PNG/ICO assets + download royalty-free Unsplash media as WebP/JPG.
 * Run from repo root: node scripts/generate_brand_media.js
 * Requires: npm install sharp --prefix backend (one-time)
 */
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const root = path.join(__dirname, '..');
const backendRoot = path.join(root, 'backend');
const sharp = require(path.join(backendRoot, 'node_modules/sharp'));

const brandDir = path.join(root, 'src/assets/brand');
const publicBrand = path.join(root, 'public/brand');
const publicRoot = path.join(root, 'public');
const mediaDir = path.join(root, 'public/media');
const mediaGallery = path.join(mediaDir, 'gallery');
const mediaCourses = path.join(mediaDir, 'courses');
const mediaBlogs = path.join(mediaDir, 'blogs');
const mediaTestimonials = path.join(mediaDir, 'testimonials');

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, { headers: { 'User-Agent': 'KolkataScootyMediaBot/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function writeRasterSet(svgPath, outBase) {
  const svg = fs.readFileSync(svgPath);
  const sizes = [
    { name: `${outBase}-16.png`, size: 16 },
    { name: `${outBase}-32.png`, size: 32 },
    { name: `${outBase}-180.png`, size: 180 },
    { name: `${outBase}-192.png`, size: 192 },
    { name: `${outBase}-512.png`, size: 512 },
  ];
  for (const s of sizes) {
    const buf = await sharp(svg).resize(s.size, s.size).png().toBuffer();
    fs.writeFileSync(path.join(brandDir, s.name.replace(`${outBase}-`, outBase === 'mark' ? 'tmp-' : '')), buf);
  }
}

async function generateFavicons() {
  const markSvg = fs.readFileSync(path.join(brandDir, 'mark.svg'));
  const logoSvg = fs.readFileSync(path.join(brandDir, 'logo.svg'));

  const fav16 = await sharp(markSvg).resize(16, 16).png().toBuffer();
  const fav32 = await sharp(markSvg).resize(32, 32).png().toBuffer();
  const apple = await sharp(markSvg).resize(180, 180).png().toBuffer();
  const icon192 = await sharp(markSvg).resize(192, 192).png().toBuffer();
  const icon512 = await sharp(markSvg).resize(512, 512).png().toBuffer();
  const socialIcon = await sharp(fs.readFileSync(path.join(brandDir, 'social-icon.svg')))
    .resize(512, 512)
    .png()
    .toBuffer();
  const logoPng = await sharp(logoSvg).resize(720, 144).png().toBuffer();
  const logoMark = await sharp(markSvg).resize(256, 256).png().toBuffer();

  // Social preview / OG 1200x630 with logo centered on brand gradient
  const ogSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="55%" stop-color="#1E3A8A"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g transform="translate(80,180)">
    <path d="M70 8 L126 30 V82 C126 116 98 136 70 146 C42 136 14 116 14 82 V30 Z" fill="#60A5FA"/>
    <circle cx="48" cy="92" r="20" fill="none" stroke="#FFFFFF" stroke-width="6"/>
    <circle cx="92" cy="92" r="20" fill="none" stroke="#FFFFFF" stroke-width="6"/>
    <circle cx="48" cy="92" r="6" fill="#FFFFFF"/>
    <circle cx="92" cy="92" r="6" fill="#FFFFFF"/>
    <path d="M48 92 L70 42 L92 92" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M56 32 h28" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
  </g>
  <text x="250" y="280" fill="#FFFFFF" font-family="Segoe UI,Arial,sans-serif" font-size="64" font-weight="700">Kolkata Scooty</text>
  <text x="250" y="340" fill="#BFDBFE" font-family="Segoe UI,Arial,sans-serif" font-size="28" font-weight="600" letter-spacing="6">BIKE TRAINING</text>
  <text x="250" y="400" fill="#94A3B8" font-family="Segoe UI,Arial,sans-serif" font-size="24">Learn. Ride. Grow. — Kolkata</text>
</svg>`);
  const og = await sharp(ogSvg).png().toBuffer();

  const targets = [
    [path.join(brandDir, 'favicon-16.png'), fav16],
    [path.join(brandDir, 'favicon-32.png'), fav32],
    [path.join(brandDir, 'apple-touch-icon.png'), apple],
    [path.join(brandDir, 'logo-mark.png'), logoMark],
    [path.join(brandDir, 'logo.png'), logoPng],
    [path.join(brandDir, 'social-icon.png'), socialIcon],
    [path.join(brandDir, 'og-image.png'), og],
    [path.join(brandDir, 'social-preview.png'), og],
    [path.join(publicRoot, 'favicon-16.png'), fav16],
    [path.join(publicRoot, 'favicon-32.png'), fav32],
    [path.join(publicRoot, 'apple-touch-icon.png'), apple],
    [path.join(publicRoot, 'icon-192.png'), icon192],
    [path.join(publicRoot, 'icon-512.png'), icon512],
    [path.join(publicRoot, 'social-icon.png'), socialIcon],
    [path.join(publicRoot, 'og-image.png'), og],
    [path.join(publicRoot, 'social-preview.png'), og],
    [path.join(publicBrand, 'favicon-16.png'), fav16],
    [path.join(publicBrand, 'favicon-32.png'), fav32],
    [path.join(publicBrand, 'apple-touch-icon.png'), apple],
    [path.join(publicBrand, 'og-image.png'), og],
    [path.join(publicBrand, 'social-preview.png'), og],
    [path.join(publicBrand, 'logo.png'), logoPng],
    [path.join(publicBrand, 'logo-mark.png'), logoMark],
    [path.join(publicBrand, 'social-icon.png'), socialIcon],
  ];

  ensureDir(publicBrand);
  for (const [p, buf] of targets) {
    ensureDir(path.dirname(p));
    fs.writeFileSync(p, buf);
  }

  // favicon.ico as 32x32 PNG renamed (browsers accept); also copy SVG favicon
  fs.writeFileSync(path.join(publicRoot, 'favicon.ico'), fav32);
  fs.writeFileSync(path.join(brandDir, 'favicon.ico'), fav32);
  fs.writeFileSync(path.join(publicBrand, 'favicon.ico'), fav32);
  fs.copyFileSync(path.join(brandDir, 'mark.svg'), path.join(publicRoot, 'favicon.svg'));

  // Mirror SVGs to public/brand
  for (const f of ['logo.svg', 'logo-light.svg', 'logo-dark.svg', 'mark.svg', 'social-icon.svg']) {
    fs.copyFileSync(path.join(brandDir, f), path.join(publicBrand, f));
  }

  console.log('Brand raster assets generated');
}

// Verified Unsplash License URLs (royalty-free). Prefer images.unsplash.com CDN.
const U = (id, w = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const GALLERY = [
  { slug: 'scooty-training', title: 'Scooty Training', category: 'Scooty Training', url: U('photo-1711831995801-58428c875943') },
  { slug: 'bike-training', title: 'Bike Training', category: 'Bike Training', url: U('photo-1657769268990-65a821e69f3b') },
  { slug: 'women-riding', title: 'Women Riding Training', category: 'Women Riding Training', url: U('photo-1675490433104-50207a8a69f2') },
  { slug: 'men-riding', title: 'Men Riding Training', category: 'Men Riding Training', url: U('photo-1598548841213-9cdbcdf8ec47') },
  { slug: 'beginner-classes', title: 'Beginner Classes', category: 'Beginner Classes', url: U('photo-1558981285-6f0c94958bb6') },
  { slug: 'road-practice', title: 'Road Practice', category: 'Road Practice', url: U('photo-1449426468159-d96dbf08f19f') },
  { slug: 'helmet-safety', title: 'Helmet Safety', category: 'Helmet Safety', url: U('photo-1590506995460-d0d9892b54da') },
  { slug: 'trainer-student', title: 'Trainer with Student', category: 'Trainer with Student', url: U('photo-1529156069898-49953e39b3ac') },
  { slug: 'certificate', title: 'Certificate Distribution', category: 'Certificate Distribution', url: U('photo-1523050854058-8df90110c9f1') },
  { slug: 'training-ground', title: 'Training Ground', category: 'Training Ground', url: U('photo-1486406146926-c627a92ad1ab') },
  { slug: 'students-practicing', title: 'Students Practicing', category: 'Students Practicing', url: U('photo-1558981806-ec527fa84c39') },
  { slug: 'learning-sessions', title: 'Learning Sessions', category: 'Learning Sessions', url: U('photo-1522202176988-66273c2fd55f') },
  { slug: 'branch-photos', title: 'Branch Photos', category: 'Branch Photos', url: U('photo-1497366216548-37526070297c') },
  { slug: 'bike-parking', title: 'Bike Parking', category: 'Bike Parking', url: U('photo-1558980664-769d59546b3d') },
  { slug: 'safety-demo', title: 'Safety Demonstration', category: 'Safety Demonstration', url: U('photo-1558981403-c5f9899a28bc') },
  { slug: 'traffic-awareness', title: 'Traffic Awareness', category: 'Traffic Awareness', url: U('photo-1449965408869-eaa3f722e40d') },
];

const COURSES = [
  { slug: 'basic-scooty', url: U('photo-1711831995801-58428c875943', 1600) },
  { slug: 'advanced-scooty', url: U('photo-1675490433104-50207a8a69f2', 1600) },
  { slug: 'bike-training', url: U('photo-1657769268990-65a821e69f3b', 1600) },
  { slug: 'doorstep', url: U('photo-1449426468159-d96dbf08f19f', 1600) },
  { slug: 'rto-assistance', url: U('photo-1454165804606-c3d57bc86b40', 1600) },
  { slug: 'ladies-special', url: U('photo-1675490433104-50207a8a69f2', 1600) },
  { slug: 'road-confidence', url: U('photo-1598548841213-9cdbcdf8ec47', 1600) },
  { slug: 'refresher', url: U('photo-1590506995460-d0d9892b54da', 1600) },
];

const BLOGS = [
  { slug: 'how-to-learn-scooty-riding-safely', url: U('photo-1711831995801-58428c875943') },
  { slug: 'how-long-learn-bike-riding', url: U('photo-1657769268990-65a821e69f3b') },
  { slug: '10-beginner-riding-mistakes', url: U('photo-1558981285-6f0c94958bb6') },
  { slug: 'best-scooty-for-beginners', url: U('photo-1558980664-769d59546b3d') },
  { slug: 'road-safety-tips-kolkata', url: U('photo-1449965408869-eaa3f722e40d') },
  { slug: 'helmet-safety-guide', url: U('photo-1590506995460-d0d9892b54da') },
  { slug: 'women-can-learn-scooty-easily', url: U('photo-1675490433104-50207a8a69f2') },
  { slug: 'traffic-rules-every-rider', url: U('photo-1469854523086-cc02fe5d8800') },
  { slug: 'how-to-ride-in-kolkata-traffic', url: U('photo-1449426468159-d96dbf08f19f') },
  { slug: 'scooty-vs-motorcycle-beginners', url: U('photo-1598548841213-9cdbcdf8ec47') },
  { slug: 'benefits-professional-riding-training', url: U('photo-1529156069898-49953e39b3ac') },
  { slug: 'how-to-build-riding-confidence', url: U('photo-1522202176988-66273c2fd55f') },
];

const TESTIMONIALS = [
  { slug: 'priya', url: U('photo-1494790108377-be9c29b29330', 400) },
  { slug: 'amit', url: U('photo-1507003211169-0a1dd7228f2d', 400) },
  { slug: 'sneha', url: U('photo-1438761681033-6461ffad8d80', 400) },
  { slug: 'rajesh', url: U('photo-1500648767791-00dcc994a43e', 400) },
  { slug: 'ananya', url: U('photo-1544005313-94ddf0286df2', 400) },
  { slug: 'soumik', url: U('photo-1472099645785-5658abf4ff4e', 400) },
  { slug: 'riya', url: U('photo-1534528741775-53994a69daeb', 400) },
  { slug: 'debashis', url: U('photo-1506794778202-cad84cf45f1d', 400) },
];

async function saveResponsive(buf, outDir, base) {
  ensureDir(outDir);
  const fullJpg = path.join(outDir, `${base}.jpg`);
  const fullWebp = path.join(outDir, `${base}.webp`);
  const cardJpg = path.join(outDir, `${base}-card.jpg`);
  const cardWebp = path.join(outDir, `${base}-card.webp`);
  const thumbJpg = path.join(outDir, `${base}-thumb.jpg`);
  const thumbWebp = path.join(outDir, `${base}-thumb.webp`);

  await sharp(buf).resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(fullJpg);
  await sharp(buf).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 74 }).toFile(fullWebp);
  await sharp(buf).resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 76, mozjpeg: true }).toFile(cardJpg);
  await sharp(buf).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 72 }).toFile(cardWebp);
  await sharp(buf).resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 74, mozjpeg: true }).toFile(thumbJpg);
  await sharp(buf).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 70 }).toFile(thumbWebp);

  return {
    full: `/media/${path.basename(outDir)}/${base}.webp`,
    card: `/media/${path.basename(outDir)}/${base}-card.webp`,
    thumb: `/media/${path.basename(outDir)}/${base}-thumb.webp`,
    fullJpg: `/media/${path.basename(outDir)}/${base}.jpg`,
  };
}

async function downloadMedia() {
  ensureDir(mediaGallery);
  ensureDir(mediaCourses);
  ensureDir(mediaBlogs);
  ensureDir(mediaTestimonials);

  const manifest = { gallery: [], courses: [], blogs: [], testimonials: [], license: 'Unsplash License — free to use; attribution appreciated but not required.' };

  async function safeFetch(label, url) {
    try {
      return await fetchBuffer(url);
    } catch (err) {
      console.warn(`SKIP ${label}: ${err.message}`);
      return null;
    }
  }

  for (const item of GALLERY) {
    process.stdout.write(`gallery ${item.slug}...\n`);
    const buf = await safeFetch(`gallery/${item.slug}`, item.url);
    if (!buf) continue;
    const paths = await saveResponsive(buf, mediaGallery, item.slug);
    manifest.gallery.push({ ...item, ...paths });
  }

  for (const item of COURSES) {
    process.stdout.write(`course ${item.slug}...\n`);
    const buf = await safeFetch(`course/${item.slug}`, item.url);
    if (!buf) continue;
    const paths = await saveResponsive(buf, mediaCourses, item.slug);
    await sharp(buf).resize(900, 500, { fit: 'cover' }).webp({ quality: 72 }).toFile(path.join(mediaCourses, `${item.slug}-mobile.webp`));
    await sharp(buf).resize(1600, 700, { fit: 'cover' }).webp({ quality: 74 }).toFile(path.join(mediaCourses, `${item.slug}-banner.webp`));
    manifest.courses.push({
      ...item,
      ...paths,
      banner: `/media/courses/${item.slug}-banner.webp`,
      mobile: `/media/courses/${item.slug}-mobile.webp`,
      feature: paths.full,
    });
  }

  for (const item of BLOGS) {
    process.stdout.write(`blog ${item.slug}...\n`);
    const buf = await safeFetch(`blog/${item.slug}`, item.url);
    if (!buf) continue;
    const paths = await saveResponsive(buf, mediaBlogs, item.slug);
    manifest.blogs.push({ ...item, ...paths });
  }

  for (const item of TESTIMONIALS) {
    process.stdout.write(`testimonial ${item.slug}...\n`);
    const buf = await safeFetch(`testimonial/${item.slug}`, item.url);
    if (!buf) continue;
    ensureDir(mediaTestimonials);
    const out = path.join(mediaTestimonials, `${item.slug}.webp`);
    await sharp(buf).resize(256, 256, { fit: 'cover' }).webp({ quality: 75 }).toFile(out);
    manifest.testimonials.push({ ...item, photo: `/media/testimonials/${item.slug}.webp` });
  }

  fs.writeFileSync(path.join(mediaDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Media downloaded + optimized');
  return manifest;
}

(async () => {
  try {
    await generateFavicons();
    await downloadMedia();
    console.log('DONE');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
