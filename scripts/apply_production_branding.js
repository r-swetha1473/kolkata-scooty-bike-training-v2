/**
 * Apply local /media paths + production branding content to the database.
 * Run: node scripts/apply_production_branding.js
 */
const path = require('path');
const fs = require('fs');
const backendRoot = path.join(__dirname, '../backend');
require(path.join(backendRoot, 'node_modules/dotenv')).config({ path: path.join(backendRoot, '.env') });
const { Pool } = require(path.join(backendRoot, 'node_modules/pg'));

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../public/media/manifest.json'), 'utf8')
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

function blogHtml(title, intro, sections, faqs) {
  const body = sections
    .map((s) => `<h2>${s.h}</h2>\n<p>${s.p}</p>`)
    .join('\n\n');
  const faq = faqs
    .map((f) => `<h3>${f.q}</h3>\n<p>${f.a}</p>`)
    .join('\n');
  return `<h2>${title}</h2>
<p>${intro}</p>

${body}

<h2>Frequently Asked Questions</h2>
${faq}

<h2>Ready to start?</h2>
<p>Book a session at <a href="/booking">Kolkata Scooty Bike Training</a>, explore our <a href="/courses">courses</a>, or <a href="/contact">contact us</a> for branch timings.</p>`;
}

const NEW_BLOGS = [
  {
    title: 'How to Learn Scooty Riding Safely in Kolkata',
    slug: 'how-to-learn-scooty-riding-safely',
    excerpt: 'A practical beginner guide to learning scooty riding safely — gear, balance, traffic awareness, and choosing the right training institute in Kolkata.',
    meta_title: 'How to Learn Scooty Riding Safely | Kolkata Scooty Bike Training',
    meta_description: 'Learn scooty riding safely in Kolkata with step-by-step tips on helmet use, balance, braking, and professional coaching.',
    meta_keywords: 'learn scooty safely, scooty training Kolkata, beginner scooty tips, women scooty classes',
    category: 'Safety',
    reading_time_minutes: 7,
    sections: [
      { h: 'Start with the right mindset', p: 'Safe scooty learning begins with patience. Avoid rushing onto busy roads until clutch-free control, braking, and turning feel natural on a quiet training ground.' },
      { h: 'Wear ISI-marked safety gear', p: 'A properly fitted helmet, closed shoes, and visible clothing reduce injury risk. At Kolkata Scooty Bike Training, helmets are part of every session.' },
      { h: 'Master slow-speed control first', p: 'Most beginner falls happen at low speed. Practice gentle acceleration, rear-brake feel, and figure-eight turns before joining traffic.' },
      { h: 'Learn with certified coaches', p: 'Professional trainers correct posture and scanning habits early — habits that protect you in Kolkata traffic for years.' }
    ],
    faqs: [
      { q: 'Do I need my own scooty?', a: 'No. Training scooties are provided at our branches.' },
      { q: 'Is scooty training women-friendly?', a: 'Yes. Many of our learners are women beginners seeking confidence and independence.' }
    ]
  },
  {
    title: 'How Long Does It Take to Learn Bike Riding?',
    slug: 'how-long-learn-bike-riding',
    excerpt: 'Typical timelines for learning motorcycle riding in Kolkata — from first balance session to confident road practice.',
    meta_title: 'How Long to Learn Bike Riding in Kolkata | Training Timeline',
    meta_description: 'Most beginners learn basic bike control in 10–20 sessions. See what affects learning speed and how structured training helps.',
    meta_keywords: 'learn bike riding time, motorcycle training Kolkata, bike class duration',
    category: 'Training',
    reading_time_minutes: 6,
    sections: [
      { h: 'Typical beginner timeline', p: 'With regular practice, many learners reach basic bike control in 10–15 sessions. Road confidence usually needs additional guided traffic practice.' },
      { h: 'What speeds up progress', p: 'Consistent attendance, prior cycle balancing, and focused feedback from a trainer shorten the learning curve.' },
      { h: 'What slows progress', p: 'Long gaps between classes, fear of clutch control, and practicing only on open roads without structure.' }
    ],
    faqs: [
      { q: 'Is cycle balancing required?', a: 'Basic cycle balance helps for geared bikes. Scooty courses do not require it.' },
      { q: 'Can I take a refresher later?', a: 'Yes — our refresher packages are designed for returning riders.' }
    ]
  },
  {
    title: '10 Beginner Riding Mistakes to Avoid',
    slug: '10-beginner-riding-mistakes',
    excerpt: 'Common mistakes new scooty and bike riders make — and how professional training helps you avoid them.',
    meta_title: '10 Beginner Riding Mistakes | Scooty & Bike Training Tips',
    meta_description: 'Avoid the top beginner riding mistakes: looking down, sudden braking, weak scanning, and skipping helmet checks.',
    meta_keywords: 'beginner riding mistakes, scooty tips, bike training mistakes',
    category: 'Tips',
    reading_time_minutes: 8,
    sections: [
      { h: 'Looking down at the vehicle', p: 'Your bike goes where your eyes go. Keep your chin up and scan ahead.' },
      { h: 'Grabbing only the front brake', p: 'Sudden front braking can unsettle beginners. Learn progressive combined braking with your trainer.' },
      { h: 'Skipping mirror and indicator habits', p: 'Signal early, check mirrors, then move. Muscle memory saves you in dense Kolkata traffic.' }
    ],
    faqs: [
      { q: 'Will trainers correct these live?', a: 'Yes. One-to-one coaching focuses on spotting and fixing these habits early.' }
    ]
  },
  {
    title: 'Best Scooty for Beginners in Kolkata',
    slug: 'best-scooty-for-beginners',
    excerpt: 'What makes a scooty beginner-friendly — weight, seat height, braking feel — plus how training helps you choose confidently.',
    meta_title: 'Best Scooty for Beginners in Kolkata | Buying & Training Guide',
    meta_description: 'Choose a lightweight, easy-to-balance scooty for learning. Pair your purchase with professional scooty training in Kolkata.',
    meta_keywords: 'best scooty for beginners, beginner scooty Kolkata, learn scooty',
    category: 'Guides',
    reading_time_minutes: 6,
    sections: [
      { h: 'Look for manageable weight', p: 'Lighter scooties are easier for first-time riders to push, park, and recover from a tilt.' },
      { h: 'Comfortable seat height', p: 'Both feet should touch the ground confidently at stops.' },
      { h: 'Train before you buy', p: 'Learning on training fleet vehicles helps you discover what feel you prefer before investing.' }
    ],
    faqs: [
      { q: 'Do you train on petrol scooties?', a: 'Yes. Our beginner scooty course includes petrol scooty practice.' }
    ]
  },
  {
    title: 'Road Safety Tips Every Kolkata Rider Should Follow',
    slug: 'road-safety-tips-kolkata',
    excerpt: 'Practical road safety habits for scooty and motorcycle riders navigating Kolkata traffic every day.',
    meta_title: 'Road Safety Tips for Kolkata Riders | Helmet, Speed & Awareness',
    meta_description: 'Essential road safety tips for Kolkata: helmet discipline, lane awareness, night riding caution, and defensive riding.',
    meta_keywords: 'road safety Kolkata, two wheeler safety, defensive riding tips',
    category: 'Safety',
    reading_time_minutes: 7,
    sections: [
      { h: 'Assume others may not see you', p: 'Ride defensively. Keep buffer space and avoid blind spots of buses and cars.' },
      { h: 'Respect monsoon conditions', p: 'Slow down on wet roads, brake earlier, and avoid painted markings that become slippery.' }
    ],
    faqs: [
      { q: 'Do courses include road practice?', a: 'Yes. Advanced and road-confidence packages include guided road sessions.' }
    ]
  },
  {
    title: 'Helmet Safety Guide for Two-Wheeler Riders',
    slug: 'helmet-safety-guide',
    excerpt: 'How to choose, fit, and maintain a helmet — the single most important piece of riding safety gear.',
    meta_title: 'Helmet Safety Guide | ISI Helmet Tips for Scooty & Bike Riders',
    meta_description: 'Learn how to pick an ISI-marked helmet, check fit, replace damaged gear, and build lifelong helmet habits.',
    meta_keywords: 'helmet safety, ISI helmet, scooty helmet guide',
    category: 'Safety',
    reading_time_minutes: 5,
    sections: [
      { h: 'Choose ISI or certified protection', p: 'A certified helmet dramatically reduces head injury risk. Avoid fashion-only shells without proper lining.' },
      { h: 'Check the fit every time', p: 'The helmet should sit level, with cheek pads snug and the chin strap secured.' }
    ],
    faqs: [
      { q: 'Do I need a helmet during training?', a: 'Yes — helmet use is mandatory in our sessions.' }
    ]
  },
  {
    title: 'Women Can Learn Scooty Riding Easily',
    slug: 'women-can-learn-scooty-easily',
    excerpt: 'Why scooty training is an empowering, achievable skill for women in Kolkata — with patient coaching and safe grounds.',
    meta_title: 'Women Scooty Training in Kolkata | Learn with Confidence',
    meta_description: 'Women-friendly scooty classes in Kolkata help beginners build balance, road confidence, and independence.',
    meta_keywords: 'women scooty training, ladies scooty classes Kolkata, learn scooty for women',
    category: 'Women Riders',
    reading_time_minutes: 6,
    sections: [
      { h: 'No prior cycling needed for scooty', p: 'Scooty training focuses on balance with engine assist — ideal for first-time riders.' },
      { h: 'Supportive coaching culture', p: 'Our trainers pace lessons to your comfort, celebrating small wins that build lasting confidence.' }
    ],
    faqs: [
      { q: 'Are ladies batches available?', a: 'Ask your branch for preferred timings — we regularly coach women beginners.' }
    ]
  },
  {
    title: 'Traffic Rules Every Rider Should Know',
    slug: 'traffic-rules-every-rider',
    excerpt: 'Core Indian traffic rules for two-wheeler riders — signals, lane discipline, documents, and common penalties.',
    meta_title: 'Traffic Rules for Two-Wheeler Riders in India | Quick Guide',
    meta_description: 'Know essential traffic rules for scooty and bike riders: indicators, helmets, documents, and safe overtaking.',
    meta_keywords: 'traffic rules India, two wheeler rules, riding licence tips',
    category: 'Rules',
    reading_time_minutes: 7,
    sections: [
      { h: 'Carry valid documents', p: 'Keep your learner/permanent licence and vehicle papers handy. Training is separate from licensing — we can guide RTO preparation.' },
      { h: 'Signal before you move', p: 'Indicators and hand signals communicate intent. Combine them with mirror checks.' }
    ],
    faqs: [
      { q: 'Do you help with RTO preparation?', a: 'Yes. See our RTO assistance course for structured support.' }
    ]
  },
  {
    title: 'How to Ride Safely in Kolkata Traffic',
    slug: 'how-to-ride-in-kolkata-traffic',
    excerpt: 'City-specific tips for navigating Kolkata junctions, buses, pedestrians, and peak-hour congestion on a two-wheeler.',
    meta_title: 'How to Ride in Kolkata Traffic Safely | Local Riding Tips',
    meta_description: 'Learn Kolkata-specific riding strategies: junction scanning, bus awareness, peak-hour pacing, and defensive positioning.',
    meta_keywords: 'Kolkata traffic riding, scooty in Kolkata, bike road practice',
    category: 'City Riding',
    reading_time_minutes: 7,
    sections: [
      { h: 'Watch for sudden door openings and pedestrians', p: 'Leave extra space near parked cars and crowded footpaths.' },
      { h: 'Practice with a coach first', p: 'Guided road sessions translate ground skills into real Kolkata conditions.' }
    ],
    faqs: [
      { q: 'Which course covers busy roads?', a: 'Advanced Scooty and Road Confidence packages focus on traffic practice.' }
    ]
  },
  {
    title: 'Scooty vs Motorcycle for Beginners',
    slug: 'scooty-vs-motorcycle-beginners',
    excerpt: 'Compare scooty and motorcycle learning paths so beginners can choose the right first vehicle and training course.',
    meta_title: 'Scooty vs Motorcycle for Beginners | Which Should You Learn?',
    meta_description: 'Scooties are clutch-free and beginner-friendly; bikes need balance and gear skills. Compare training paths in Kolkata.',
    meta_keywords: 'scooty vs bike, beginner motorcycle, scooty training vs bike training',
    category: 'Guides',
    reading_time_minutes: 6,
    sections: [
      { h: 'Scooty advantages', p: 'Automatic transmission, easier low-speed control, and a gentler start for complete beginners.' },
      { h: 'Motorcycle advantages', p: 'Greater power and range once clutch/gear skills are mastered — ideal after basic balance confidence.' }
    ],
    faqs: [
      { q: 'Can I switch later?', a: 'Yes. Many learners start with scooty, then add bike training.' }
    ]
  },
  {
    title: 'Benefits of Professional Riding Training',
    slug: 'benefits-professional-riding-training',
    excerpt: 'Why structured coaching beats self-learning — safety habits, faster progress, and confidence on real roads.',
    meta_title: 'Benefits of Professional Riding Training in Kolkata',
    meta_description: 'Professional scooty and bike training builds safer habits, faster skills, and real-road confidence with certified coaches.',
    meta_keywords: 'professional riding school, bike training benefits, scooty coaching Kolkata',
    category: 'Training',
    reading_time_minutes: 5,
    sections: [
      { h: 'Safer habits from day one', p: 'Trainers catch risky posture and scanning errors before they become permanent.' },
      { h: 'Structured milestones', p: 'A clear lesson plan moves you from ground control to traffic-ready riding.' }
    ],
    faqs: [
      { q: 'Is self-learning enough?', a: 'Self-practice helps, but professional feedback prevents dangerous blind spots.' }
    ]
  },
  {
    title: 'How to Build Riding Confidence',
    slug: 'how-to-build-riding-confidence',
    excerpt: 'Practical ways to overcome fear and build lasting two-wheeler confidence — one session at a time.',
    meta_title: 'How to Build Riding Confidence | Scooty & Bike Learners',
    meta_description: 'Build riding confidence with short practice loops, trainer feedback, gradual traffic exposure, and positive milestones.',
    meta_keywords: 'riding confidence, overcome fear of bike, scooty confidence tips',
    category: 'Mindset',
    reading_time_minutes: 6,
    sections: [
      { h: 'Celebrate small wins', p: 'Smooth starts, stable stops, and clean U-turns matter more than speed.' },
      { h: 'Increase challenge gradually', p: 'Move from empty grounds to quiet lanes, then peak traffic with a coach beside you.' }
    ],
    faqs: [
      { q: 'I failed once before — can I restart?', a: 'Absolutely. Our refresher and beginner courses welcome returning learners.' }
    ]
  }
];

const EXTRA_COURSES = [
  {
    name: 'Ladies Special Training',
    slug: 'ladies-special',
    description: 'Women-focused scooty training with patient coaching, safe grounds, and confidence-first pacing.',
    price_label: 'Starting from ₹2,500',
    amount_inr: 2500,
    duration_label: 'Flexible batches',
    difficulty: 'Beginner',
    tagline: 'Designed for women learners seeking independence on Kolkata roads.',
    features: ['Women-friendly coaching', 'Helmet & safety briefing', 'Balance & control drills', 'Quiet-lane practice'],
    highlights: ['No prior cycling required', 'Supportive one-to-one guidance']
  },
  {
    name: 'Road Confidence Training',
    slug: 'road-confidence',
    description: 'Guided practice for riders who know the basics and want calm confidence in real Kolkata traffic.',
    price_label: 'Starting from ₹3,000',
    amount_inr: 3000,
    duration_label: 'Road-focused modules',
    difficulty: 'Intermediate',
    tagline: 'From training ground to busy junctions — with a coach.',
    features: ['Junction scanning', 'Lane positioning', 'Defensive riding', 'Peak-hour strategies'],
    highlights: ['Ideal after basic scooty or bike course']
  },
  {
    name: 'Refresher Course',
    slug: 'refresher',
    description: 'Short refresher for returning riders who need to rebuild balance, braking feel, and traffic confidence.',
    price_label: 'Starting from ₹1,800',
    amount_inr: 1800,
    duration_label: 'Short programme',
    difficulty: 'All levels',
    tagline: 'Get your confidence back — quickly and safely.',
    features: ['Skill assessment', 'Targeted drills', 'Optional road practice'],
    highlights: ['Perfect after a long break from riding']
  }
];

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Gallery reseed
    await client.query('DELETE FROM gallery_items');
    const gallery = [
      ...manifest.gallery,
      {
        title: 'Certificate Distribution',
        category: 'Certificate Distribution',
        full: '/media/gallery/certificate.webp',
        sort_order: 99
      }
    ];
    let order = 1;
    for (const g of gallery) {
      await client.query(
        `INSERT INTO gallery_items (title, category, image_url, sort_order, is_active, branch_id)
         SELECT $1, $2, $3, $4, true, id FROM branches WHERE slug = 'kolkata-main' LIMIT 1`,
        [g.title || g.category, g.category, g.full || g.card, g.sort_order || order++]
      );
    }

    // Courses — image variants
    for (const c of manifest.courses) {
      await client.query(
        `UPDATE courses SET
           image_url = $2,
           banner_image_url = $3,
           thumbnail_url = $4,
           mobile_image_url = $5,
           updated_at = NOW()
         WHERE slug = $1`,
        [c.slug, c.card || c.full, c.banner || c.full, c.thumb || c.card, c.mobile || c.card]
      );
    }

    for (const c of EXTRA_COURSES) {
      const media = manifest.courses.find((m) => m.slug === c.slug) || {};
      await client.query(
        `INSERT INTO courses (
           name, slug, description, price_label, amount_inr, duration_label,
           features, highlights, tagline, difficulty,
           image_url, banner_image_url, thumbnail_url, mobile_image_url,
           is_active, is_featured, sort_order, cta_text, cta_link
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,
           $11,$12,$13,$14,true,false,50,'Book now',$15
         )
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price_label = EXCLUDED.price_label,
           amount_inr = EXCLUDED.amount_inr,
           duration_label = EXCLUDED.duration_label,
           features = EXCLUDED.features,
           highlights = EXCLUDED.highlights,
           tagline = EXCLUDED.tagline,
           difficulty = EXCLUDED.difficulty,
           image_url = COALESCE(EXCLUDED.image_url, courses.image_url),
           banner_image_url = COALESCE(EXCLUDED.banner_image_url, courses.banner_image_url),
           thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, courses.thumbnail_url),
           mobile_image_url = COALESCE(EXCLUDED.mobile_image_url, courses.mobile_image_url),
           updated_at = NOW()`,
        [
          c.name,
          c.slug,
          c.description,
          c.price_label,
          c.amount_inr,
          c.duration_label,
          JSON.stringify(c.features),
          JSON.stringify(c.highlights),
          c.tagline,
          c.difficulty,
          media.card || media.full || null,
          media.banner || media.full || null,
          media.thumb || media.card || null,
          media.mobile || media.card || null,
          `/booking?course=${c.slug}`
        ]
      );
    }

    // Blogs
    for (const b of NEW_BLOGS) {
      const media = manifest.blogs.find((m) => m.slug === b.slug);
      const content = blogHtml(b.title, b.excerpt, b.sections, b.faqs);
      await client.query(
        `INSERT INTO blog_posts (
           title, slug, excerpt, content, featured_image_url, category, author_name,
           status, published_at, meta_title, meta_description, meta_keywords,
           reading_time_minutes, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,'Kolkata Scooty Team','published',NOW(),$7,$8,$9,$10,NOW(),NOW()
         )
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title,
           excerpt = EXCLUDED.excerpt,
           content = EXCLUDED.content,
           featured_image_url = COALESCE(EXCLUDED.featured_image_url, blog_posts.featured_image_url),
           category = EXCLUDED.category,
           author_name = EXCLUDED.author_name,
           status = 'published',
           meta_title = EXCLUDED.meta_title,
           meta_description = EXCLUDED.meta_description,
           meta_keywords = EXCLUDED.meta_keywords,
           reading_time_minutes = EXCLUDED.reading_time_minutes,
           updated_at = NOW()`,
        [
          b.title,
          b.slug,
          b.excerpt,
          content,
          media?.full || null,
          b.category,
          b.meta_title,
          b.meta_description,
          b.meta_keywords,
          b.reading_time_minutes
        ]
      );
    }

    // Update existing blog images where we can map loosely
    await client.query(`
      UPDATE blog_posts SET featured_image_url = '/media/blogs/how-to-learn-scooty-riding-safely.webp', updated_at = NOW()
      WHERE slug = 'top-10-tips-before-learning-scooty' AND (featured_image_url IS NULL OR featured_image_url LIKE 'https://images.unsplash.com%')`);

    // Testimonials photos
    const photoMap = {
      'Priya Sharma': '/media/testimonials/priya.webp',
      'Amit Das': '/media/testimonials/amit.webp',
      'Sneha Banerjee': '/media/testimonials/sneha.webp',
      'Rajesh Kumar': '/media/testimonials/rajesh.webp',
      'Ananya Mukherjee': '/media/testimonials/ananya.webp',
      'Soumik Ghosh': '/media/testimonials/soumik.webp',
      'Riya Chatterjee': '/media/testimonials/riya.webp',
      'Debashis Mondal': '/media/testimonials/debashis.webp'
    };
    for (const [name, photo] of Object.entries(photoMap)) {
      await client.query(
        `UPDATE testimonials SET photo_url = $2 WHERE customer_name = $1`,
        [name, photo]
      );
    }

    // Social placeholders (configurable in Admin → Settings)
    const social = [
      ['social_facebook', 'https://www.facebook.com/kolkatascootytraining'],
      ['social_instagram', 'https://www.instagram.com/kolkatascootytraining'],
      ['social_youtube', 'https://www.youtube.com/@kolkatascootytraining'],
      ['social_linkedin', 'https://www.linkedin.com/company/kolkata-scooty-bike-training'],
      ['site_logo', '/assets/brand/logo.svg'],
      ['site_name', 'Kolkata Scooty Bike Training'],
      ['contact_maps_url', 'https://www.google.com/maps/search/?api=1&query=Kolkata+Scooty+Bike+Training+Salt+Lake']
    ];
    for (const [key, value] of social) {
      await client.query(
        `INSERT INTO settings (key, value, description)
         VALUES ($1, to_jsonb($2::text), $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value, `Public ${key}`]
      );
    }

    // Ensure every active branch has a maps_url
    await client.query(`
      UPDATE branches
      SET maps_url = COALESCE(
            NULLIF(maps_url, ''),
            'https://www.google.com/maps/search/?api=1&query=' || replace(coalesce(address, name || ' Kolkata'), ' ', '+')
          ),
          updated_at = NOW()
      WHERE is_active IS DISTINCT FROM false
        AND (maps_url IS NULL OR maps_url = '')
    `);

    await client.query('COMMIT');

    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM gallery_items) AS gallery,
        (SELECT count(*) FROM blog_posts WHERE status = 'published') AS blogs,
        (SELECT count(*) FROM testimonials WHERE is_active) AS testimonials,
        (SELECT count(*) FROM courses WHERE is_active) AS courses
    `);
    console.log('Applied branding media/content:', counts.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
