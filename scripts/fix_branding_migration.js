const fs = require('fs');
const p = 'supabase/migrations/20260727200000_branding_cms_seed.sql';
let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const gallery = `DELETE FROM gallery_items;

INSERT INTO gallery_items (title, category, image_url, sort_order, is_active, branch_id)
SELECT v.title, v.category, v.image_url, v.sort_order, true, b.id
FROM (VALUES
  ('Women Learning Scooty', 'Women Learning Scooty', 'https://images.unsplash.com/photo-1596223574885-6ad515d6df71?auto=format&fit=crop&w=1200&q=80', 1),
  ('Men Learning Bike', 'Men Learning Bike', 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80', 2),
  ('Helmet Safety', 'Helmet Safety', 'https://images.unsplash.com/photo-1558980664-769d59546b3d?auto=format&fit=crop&w=1200&q=80', 3),
  ('Training Ground', 'Training Ground', 'https://images.unsplash.com/photo-1568772585407-9361f9bf939a?auto=format&fit=crop&w=1200&q=80', 4),
  ('Road Practice', 'Road Practice', 'https://images.unsplash.com/photo-1449426468159-d96dbf643f9e?auto=format&fit=crop&w=1200&q=80', 5),
  ('One-to-One Coaching', 'One-to-One Coaching', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80', 6),
  ('Trainer with Student', 'Trainer with Student', 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=1200&q=80', 7),
  ('Certificate Distribution', 'Certificate Distribution', 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80', 8),
  ('Students Riding', 'Students Riding', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80', 9),
  ('Scooty Practice', 'Scooty Practice', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80', 10),
  ('Bike Practice', 'Bike Practice', 'https://images.unsplash.com/photo-1558981285-6f0c94958bb6?auto=format&fit=crop&w=1200&q=80', 11),
  ('Traffic Training', 'Traffic Training', 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80', 12),
  ('Branch Photos', 'Branch Photos', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', 13),
  ('Vehicle Fleet', 'Vehicle Fleet', 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80', 14)
) AS v(title, category, image_url, sort_order)
CROSS JOIN LATERAL (SELECT id FROM branches WHERE slug = 'kolkata-main' LIMIT 1) b(id);

`;

const start = s.indexOf('DELETE FROM gallery_items;');
const end = s.indexOf('-- =====================================================\n-- 4. TESTIMONIALS');
if (start < 0 || end < 0) {
  console.error('markers missing', start, end);
  process.exit(1);
}
s = s.slice(0, start) + gallery + s.slice(end);
s = s.replace(/ON CONFLICT \(customer_name\) DO NOTHING;/g, '');

const marker = '-- =====================================================\n-- 4. TESTIMONIALS - Insert realistic student reviews\n-- =====================================================\n\n';
const inject =
  marker +
  `DELETE FROM testimonials WHERE customer_name IN (
  'Priya Sharma','Amit Das','Sneha Banerjee','Rajesh Kumar','Ananya Mukherjee','Soumik Ghosh','Riya Chatterjee','Debashis Mondal'
);

`;
if (!s.includes(marker)) {
  console.error('testimonials marker missing');
  process.exit(1);
}
s = s.replace(marker, inject);

fs.writeFileSync(p, s.replace(/\n/g, '\r\n'));
console.log('Migration fixed');
