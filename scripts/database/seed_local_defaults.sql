-- Local seed + schema repair for Express + plain PostgreSQL (not Supabase).
-- Safe to re-run (idempotent).

-- Default settings (ASCII-safe)
INSERT INTO settings (key, value, description) VALUES
  ('site_name', '"Kolkata Scotty"', 'The name of the website'),
  ('site_logo', '""', 'URL to the site logo'),
  ('contact_email', '"contact@kolkatascotty.com"', 'Primary contact email'),
  ('contact_phone', '"+91 1234567890"', 'Primary contact phone number'),
  ('contact_address', '"Kolkata, West Bengal, India"', 'Business address'),
  ('social_facebook', '""', 'Facebook page URL'),
  ('social_instagram', '""', 'Instagram profile URL'),
  ('social_youtube', '""', 'YouTube channel URL'),
  ('footer_copyright', '"(c) 2025 Kolkata Scotty. All rights reserved."', 'Footer copyright text'),
  ('about_text', '"We are dedicated to providing quality bike training services in Kolkata."', 'About section text')
ON CONFLICT (key) DO NOTHING;

-- Deactivate legacy duplicate vehicle from 202501040 seed (fleet comes from 202501050)
UPDATE vehicles SET is_active = false WHERE name = 'Scooty';

-- Repair capacity constraints if older migrations were applied out of chronological order
ALTER TABLE slots DROP CONSTRAINT IF EXISTS slots_vehicle_capacity_check;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'slots_capacity_check') THEN
    ALTER TABLE slots DROP CONSTRAINT slots_capacity_check;
  END IF;
END $$;
ALTER TABLE slots
  ADD CONSTRAINT slots_capacity_check
  CHECK (capacity >= 1 AND capacity <= 100);
