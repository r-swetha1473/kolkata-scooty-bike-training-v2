const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.angular' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|html|js|json|css|md|sql|xml|txt)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const roots = ['src', 'backend', 'public', 'supabase/migrations'];
const files = roots.flatMap((r) => walk(path.join(__dirname, '..', r)));

let n = 0;
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  if (!/Seekho|seekho/.test(c)) continue;
  const orig = c;
  c = c
    .replace(/Seekho Two Wheeler Training/g, 'Kolkata Scooty Bike Training')
    .replace(/Seekho Salt Lake/g, 'Kolkata Main')
    .replace(/Seekho Team/g, 'Kolkata Scooty Team')
    .replace(/info@seekhotraining\.com/g, 'info@kolkatascootytraining.com')
    .replace(/seekhotraining/g, 'kolkatascootytraining')
    .replace(/Seekho operations/g, 'Kolkata Scooty operations')
    .replace(/Contact Seekho/g, 'Contact us')
    .replace(/with Seekho\./g, 'in Kolkata.')
    .replace(/Compare Seekho /g, 'Compare ')
    .replace(/official Seekho courses/g, 'official Kolkata Scooty courses')
    .replace(/Seekho pricing/g, 'scooty training pricing')
    .replace(/Seekho began/g, 'We began')
    .replace(/Seekho offers/g, 'We offer')
    .replace(/\[Seekho\]/g, '[Kolkata Scooty]')
    .replace(/ \* Seekho —/g, ' * Kolkata Scooty —')
    .replace(/"short_name": "Seekho"/g, '"short_name": "Kolkata Scooty"')
    .replace(/placeholder="Seekho"/g, 'placeholder="Kolkata Scooty"')
    .replace(/\bSeekho\b/g, 'Kolkata Scooty');
  if (c !== orig) {
    fs.writeFileSync(f, c);
    n++;
    console.log('fixed', path.relative(path.join(__dirname, '..'), f));
  }
}
console.log('files updated', n);
