-- One-off. Not part of the numbered migration sequence.
-- Changes one admin profile phone. Does not touch the trainer placeholder.
--
-- Profile: admin@kolkatascotty.com
-- id: e65cf7a1-d18f-4a1a-be0f-0f06cb132d9b
-- Old phone: '+91 00000 00000'
-- New phone: 'ADMIN_e65cf7a1-d18f-4a1a-be0f-0f06cb132d9b'
--
-- Revert (only if this update is the current value):
-- UPDATE public.profiles
-- SET phone = '+91 00000 00000', updated_at = NOW()
-- WHERE id = 'e65cf7a1-d18f-4a1a-be0f-0f06cb132d9b'
--   AND email = 'admin@kolkatascotty.com'
--   AND phone = 'ADMIN_e65cf7a1-d18f-4a1a-be0f-0f06cb132d9b';

UPDATE public.profiles
SET phone = 'ADMIN_' || id::text,
    updated_at = NOW()
WHERE id = 'e65cf7a1-d18f-4a1a-be0f-0f06cb132d9b'
  AND email = 'admin@kolkatascotty.com'
  AND phone = '+91 00000 00000';
